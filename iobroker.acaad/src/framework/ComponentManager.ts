import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import IConnectedServiceAdapter, { ChangeType } from "./interfaces/IConnectedServiceAdapter";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadEvent } from "./model/events/AcaadEvent";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import ConnectionManager from "./ConnectionManager";
import { AcaadError } from "./errors/AcaadError";
import { Cause, Chunk, Data, Effect, Exit, GroupBy, Option, Stream } from "effect";
import { getAcaadMetadata } from "./model/open-api/PathItemObject";
import { CalloutError } from "./errors/CalloutError";
import { Semaphore } from "effect/Effect";
import { Component } from "./model/Component";
import { AcaadMetadata } from "./model/AcaadMetadata";
import { ComponentType } from "./model/ComponentType";

class MetadataByComponent extends Data.Class<{ component: Component; metadata: AcaadMetadata[] }> {}

@injectable()
export default class ComponentManager {
    private serviceAdapter: IConnectedServiceAdapter;
    private abortController: AbortController;
    private connectionManager: ConnectionManager;

    private hubConnection: HubConnection;

    private _logger: ICsLogger;

    constructor(
        @inject(DependencyInjectionTokens.ConnectedServiceAdapter) serviceAdapter: IConnectedServiceAdapter,
        @inject(DependencyInjectionTokens.ConnectionManager) connectionManager: ConnectionManager,
        @inject(DependencyInjectionTokens.Logger) logger: ICsLogger,
    ) {
        this.connectionManager = connectionManager;
        this.serviceAdapter = serviceAdapter;
        this.abortController = new AbortController();

        this._logger = logger;

        this.hubConnection = new HubConnectionBuilder().withUrl("https://your-signalr-endpoint").build();

        this.processGroup = this.processGroup.bind(this);
    }

    private flowEff = Effect.gen(this, function* () {
        const openApi = yield* this.queryComponentConfiguration;
        const updateResult = yield* this.updateConnectedServiceModel(openApi);
        return updateResult;
    });

    async createMissingComponentsAsync(): Promise<void> {
        this._logger.logInformation("Syncing components from ACAAD server.");

        const result = await Effect.runPromiseExit(this.flowEff);

        Exit.match(result, {
            onFailure: (cause) => this._logger.logWarning(`Exited with failure state: ${Cause.pretty(cause)}`),
            onSuccess: (res) => {
                this._logger.logInformation("Successfully created missing components.", res);
            },
        });
    }

    private _componentModel: OpenApiDefinition | null = null;
    private _metadataByComponent: MetadataByComponent[] = [];

    private generateComponentModel(
        openApiDefinition: OpenApiDefinition,
    ): Effect.Effect<OpenApiDefinition, never, never> {
        return Effect.gen(this, function* () {
            this._componentModel = openApiDefinition;
            const tmp = Stream.fromIterable(openApiDefinition.paths).pipe(
                Stream.flatMap((p) => Stream.fromIterable(p.operations().map((op) => op.acaad))),
                Stream.filter((acaad) => !!acaad),
                Stream.groupByKey((m) => m.component.name),
                GroupBy.evaluate((key: string, stream: Stream.Stream<AcaadMetadata>) =>
                    Stream.fromEffect(
                        Stream.runCollect(stream).pipe(
                            Effect.andThen((chunk) => {
                                const all = Chunk.toArray(chunk);

                                return new MetadataByComponent({
                                    component: Component.fromMetadata(all[0]).pipe(
                                        Option.getOrElse(
                                            () => new Component({ name: key, type: ComponentType.Button }),
                                        ),
                                    ),
                                    metadata: all,
                                });
                            }),
                        ),
                    ),
                ),
            );

            this._metadataByComponent = Chunk.toArray(yield* Stream.runCollect(tmp));

            return this._componentModel;
        });
    }

    readonly queryComponentConfiguration = Effect.gen(this, function* () {
        const host = yield* this.serviceAdapter.getConnectedServerAsync();
        const openApi = yield* this.connectionManager.queryComponentConfigurationAsync(host);

        this._componentModel = yield* this.generateComponentModel(openApi);

        return openApi;
    });

    private updateConnectedServiceModel(config: OpenApiDefinition) {
        return Effect.gen(this, function* () {
            const sem = yield* Effect.makeSemaphore(this.serviceAdapter.getAllowedConcurrency());

            const start = Date.now();
            this._logger.logInformation("Starting component processing.");

            const enumerable = Stream.fromIterable(Object.entries(config.paths)).pipe(
                Stream.flatMap(getAcaadMetadata),
                Stream.map(Component.fromMetadata),
                // TODO: This is obviously wrong - build a nice error hierarchy!
                Stream.someOrFail(() => new CalloutError("Failed to create component.")),
                Stream.groupByKey((m) => m.name),
                GroupBy.evaluate((key, stream) => this.processWithSemaphore(key, stream, sem)),
            );

            const groupedStream = Stream.runCollect(enumerable);

            const result = yield* groupedStream;

            this._logger.logInformation(
                `Finished component processing for a total of ${result.length} components. This took ${Date.now() - start}ms.`,
            );

            return result;
        });
    }

    private processWithSemaphore(key: string, stream: Stream.Stream<Component, AcaadError, never>, sem: Semaphore) {
        return Effect.gen(this, function* () {
            const concurrencyLimited = yield* sem.withPermits(1)(this.processGroup(key, stream));
            return concurrencyLimited;
        });
    }

    private processGroup(
        key: string,
        stream: Stream.Stream<Component, AcaadError, never>,
    ): Effect.Effect<string, AcaadError> {
        return Effect.gen(this, function* () {
            const result = yield* Stream.runCollect(stream).pipe(
                Effect.tap((_) => this._logger.logDebug(`Processing component ${key}.`)),

                Effect.andThen((values) => {
                    const cmp = Chunk.toArray(values)[0];
                    return this.processSingleComponent(cmp);
                }),

                Effect.tap((_) => this._logger.logDebug(`Finished processing component ${key}.`)),
            );

            return result;
        });
    }

    private processSingleComponent(cmp: Component): Effect.Effect<string, AcaadError> {
        return Effect.gen(this, function* () {
            const createResult = yield* Effect.tryPromise({
                try: () => this.serviceAdapter.createComponentModelAsync(cmp),
                catch: (error) => new CalloutError(error),
            });

            return cmp.name;
        });
    }

    async handleOutboundStateChangeAsync(
        component: Component,
        type: ChangeType,
        value: Option.Option<unknown>,
    ): Promise<void> {
        console.log(component, type, value);
        // Logic to handle outbound state change
    }

    private async handleSuccessfulStateChangeAsync(): Promise<void> {
        // Logic to handle successful state change
    }

    async handleInboundStateChangeAsync(event: AcaadEvent): Promise<void> {
        // Logic to handle inbound state change
    }

    async startAsync(): Promise<void> {
        this._logger.logInformation("Starting component manager.");
        // await this.hubConnection.start();

        await this.serviceAdapter.registerStateChangeCallbackAsync(this.handleOutboundStateChangeAsync);

        this._metadataByComponent.forEach((c) => {
            console.log(c.component, c.metadata);
            // c.metadata.forEach(console.log);
        });
    }

    async shutdownAsync(): Promise<void> {
        this._logger.logInformation("Stopping component manager.");

        await this.hubConnection.stop();
        // Logic to shutdown the component manager
    }
}
