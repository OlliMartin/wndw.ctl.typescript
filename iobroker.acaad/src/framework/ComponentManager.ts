import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import IConnectedServiceAdapter, { ChangeType } from "./interfaces/IConnectedServiceAdapter";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadEvent } from "./model/events/AcaadEvent";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import ConnectionManager from "./ConnectionManager";
import { AcaadError } from "./errors/AcaadError";
import { Cause, Chunk, Data, Effect, Either, Exit, GroupBy, Option, pipe, Queue, Stream } from "effect";
import { getAcaadMetadata } from "./model/open-api/PathItemObject";
import { CalloutError } from "./errors/CalloutError";
import { Semaphore } from "effect/Effect";
import { Component } from "./model/Component";
import { AcaadMetadata } from "./model/AcaadMetadata";
import { ComponentType } from "./model/ComponentType";
import { equals } from "effect/Equal";
import { RuntimeFiber } from "effect/Fiber";
import { ComponentCommandOutcomeEvent } from "./model/events/ComponentCommandOutcomeEvent";

class MetadataByComponent extends Data.Class<{ component: Component; metadata: AcaadMetadata[] }> {}

@injectable()
export default class ComponentManager {
    private serviceAdapter: IConnectedServiceAdapter;
    private abortController: AbortController;
    private connectionManager: ConnectionManager;

    private _logger: ICsLogger;

    constructor(
        @inject(DependencyInjectionTokens.ConnectedServiceAdapter) serviceAdapter: IConnectedServiceAdapter,
        @inject(DependencyInjectionTokens.ConnectionManager) connectionManager: ConnectionManager,
        @inject(DependencyInjectionTokens.Logger) logger: ICsLogger,
        @inject(DependencyInjectionTokens.EventQueue) private eventQueue: Queue.Queue<AcaadEvent>,
    ) {
        this.abortController = new AbortController();

        this.connectionManager = connectionManager;
        this.serviceAdapter = serviceAdapter;

        this._logger = logger;

        this.handleOutboundStateChangeAsync = this.handleOutboundStateChangeAsync.bind(this);
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
                                            // TODO: Obvious issue..!
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
    ): Promise<boolean> {
        this._logger.logDebug(
            `Handling outbound state (type=${type}) change for component ${component.name} and value ${value}.`,
        );
        console.log(component, type, value);

        const metadadataFilter = this.getMetadataFilter(type, value);

        const potentialMetadata = Stream.fromIterable(this._metadataByComponent).pipe(
            Stream.filter((m) => equals(m.component, component)),
            Stream.flatMap((m) => Stream.fromIterable(m.metadata)),
            Stream.filter(metadadataFilter),
        );

        const result = await Effect.runPromiseExit(
            this.getMetadataToExecuteOpt(potentialMetadata).pipe(
                Effect.andThen((m) => this.connectionManager.updateComponentStateAsync(m)),
                // TODO: Think about enqueuing the event back for processing ?
                // Could handle the sync state-change the same way as incoming from signalR if building the endpoint accordingly.
                // If the inbound changes are queued (very preferable to limit back pressure on adapter/server), this is trivial.
            ),
        );

        Exit.match(result, {
            onFailure: (cause) =>
                this._logger.logError(
                    cause,
                    undefined,
                    `Outbound state change handling failed for component ${component.name}.`,
                ),
            onSuccess: (res) => {
                this._logger.logInformation(`Successfully updated outbound state for component ${component.name}.`);
            },
        });

        return Exit.isSuccess(result);
    }

    private getMetadataToExecuteOpt(stream: Stream.Stream<AcaadMetadata>): Effect.Effect<AcaadMetadata, AcaadError> {
        return Effect.gen(this, function* () {
            const metadata = yield* Stream.runCollect(stream);

            if (metadata.length == 0) {
                const msg = "No executabl metadata/endpoint information found for component.";
                this._logger.logWarning(msg);
                return yield* Effect.fail(new CalloutError(msg));
            }
            if (metadata.length > 1) {
                const msg = "Identified too many metadata applicable for execution. Do not know what to do.";
                this._logger.logWarning(msg);
                return yield* Effect.fail(new CalloutError(msg));
            }

            return Chunk.toArray(metadata)[0];
        });
    }

    private getMetadataFilter(type: ChangeType, v: Option.Option<unknown>): (m: AcaadMetadata) => boolean {
        switch (type) {
            case "action":
                return (m) =>
                    !!m.actionable &&
                    // Match provided (CS) value only if the metadata specifically defines a reference value.
                    // If not defined in metadata, ignore value coming from CS.
                    (Option.isNone(m.forValue) || (Option.isSome(m.forValue) && equals(m.forValue, v)));
            case "query":
                return (m) => !!m.queryable;
        }
    }

    private async handleSuccessfulStateChangeAsync(): Promise<void> {
        // Logic to handle successful state change
    }

    handleInboundStateChangeAsync(event: AcaadEvent) {
        const isComponentCommandOutcomeEvent = (e: AcaadEvent) => e.name === "ComponentCommandOutcomeEvent";

        return Effect.gen(this, function* () {
            this._logger.logTrace(`Received event ${event}`);

            if (!isComponentCommandOutcomeEvent(event)) {
                return;
            }

            const cc = event as ComponentCommandOutcomeEvent;
            const cd = this.serviceAdapter.getComponentDescriptorByComponent(cc.component);

            yield* Effect.tryPromise({
                try: () => this.serviceAdapter.updateComponentStateAsync(cd, cc.outcome),
                catch: (error) => new CalloutError("An error occurred updating component state.", error),
            });
        });
    }

    async startAsync(): Promise<void> {
        this._logger.logInformation("Starting component manager.");

        const startEff = pipe(
            this.connectionManager.startHubConnection,
            Effect.andThen(this.startEventListener) /* TODO: How to stop fork ? */,
            Effect.andThen(
                Effect.tryPromise({
                    try: (as) =>
                        this.serviceAdapter.registerStateChangeCallbackAsync(this.handleOutboundStateChangeAsync, as),
                    catch: (error) => new CalloutError("An error occurred registering state change callback.", error),
                }),
            ),
        );

        await Effect.runPromiseExit(startEff);

        // TODO: Handle exit
    }

    // The listener fiber should NEVER be terminated or fail.
    // It is absolutely wrong to have an error definition here inside the fiber.
    // TODO: Let one parent fiber spawn queue workers; let those fail if required and restart again.
    private listenerFiber: RuntimeFiber<never, AcaadError> | null = null;
    private startEventListener = Effect.gen(this, function* () {
        this.listenerFiber = yield* Effect.forkDaemon(this.runEventListener);
    });

    private runEventListener = Effect.gen(this, function* () {
        this._logger.logDebug("Starting event queue listener.");

        // TODO: Check concurrency...
        while (true) {
            const event = yield* Queue.take(this.eventQueue);

            if (event.name === "ComponentCommandOutcomeEvent") {
                yield* this.handleInboundStateChangeAsync(event);
            }

            // TODO IMPORTANT: Check recovery from CS failure!!
        }
    });

    private shutdownEventQueue = Effect.gen(this, function* () {
        yield* Queue.shutdown(this.eventQueue);
    });

    async shutdownAsync(): Promise<void> {
        this._logger.logInformation("Stopping component manager.");

        const stopEff = pipe(this.connectionManager.stopHubConnection);

        await Effect.runPromiseExit(stopEff);

        // TODO: Handle exit
    }
}
