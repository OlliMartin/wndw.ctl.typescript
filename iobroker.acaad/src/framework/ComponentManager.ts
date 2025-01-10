import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import IConnectedServiceAdapter from "./interfaces/IConnectedServiceAdapter";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadEvent } from "./model/events/AcaadEvent";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import ConnectionManager from "./ConnectionManager";
import { AcaadHost } from "./model/connection/AcaadHost";
import { AcaadAuthentication } from "./model/auth/AcaadAuthentication";
import { AcaadError } from "./errors/AcaadError";
import { pipe, Effect, Exit, Cause, Data, Option, GroupBy, Stream, Chunk } from "effect";
import { getAcaadMetadata, PathItemObject } from "./model/open-api/PathItemObject";
import { AcaadMetadata } from "./model/AcaadMetadata";
// import { Option } from "effect/Option";

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
    }

    async createMissingComponentsAsync(): Promise<void> {
        this._logger.logInformation(
            "Syncing components from ACAAD server. This operation will never remove existing states.",
        );

        const flowEff = Effect.gen(this, function* () {
            const openApi = yield* this.queryComponentConfiguration;
            const updateResult = yield* this.updateConnectedServiceModel(openApi);
            return updateResult;
        });

        const result = await Effect.runPromiseExit(flowEff);

        Exit.match(result, {
            onFailure: (cause) => this._logger.logWarning(`Exited with failure state: ${Cause.pretty(cause)}`),
            onSuccess: () => {
                this._logger.logInformation("Successfully created missing components.");
            },
        });
    }

    readonly queryComponentConfiguration = Effect.gen(this, function* () {
        const host = yield* this.serviceAdapter.getConnectedServerAsync();
        const openApi = yield* this.connectionManager.queryComponentConfigurationAsync(host);
        console.log(openApi);
        return openApi;
    });

    private updateConnectedServiceModel(config: OpenApiDefinition) {
        const test = Stream.fromIterable(Object.values(config.paths)).pipe(
            Stream.tap((m) =>
                pipe(
                    Effect.succeed(m),
                    Effect.tap(() => console.log("first", m)),
                ),
            ),
            Stream.flatMap((pathItem) => getAcaadMetadata(pathItem)),
            Stream.tap((m) =>
                pipe(
                    Effect.succeed(m),
                    Effect.tap(() => console.log("second", m)),
                ),
            ),
            Stream.groupByKey((m) => m.component.name),
            GroupBy.evaluate((key, stream) =>
                Stream.fromEffect(
                    // group stream into chunk (RO)
                    Stream.runCollect(stream).pipe(
                        Effect.andThen((values) => {
                            const pi = Chunk.toArray(values)[0];
                            console.log(pi);
                            return this.processSingleComponent(pi);
                        }),
                    ),
                ),
            ),
        );

        return Stream.runCollect(test);
    }

    private processSingleComponent(metadata: AcaadMetadata): Effect.Effect<number, AcaadError> {
        return Effect.gen(this, function* () {
            console.log(metadata.component.type, metadata.component.name);
            return 42;
        });
    }

    async handleOutboundStateChangeAsync(component: unknown, value: Option.Option<unknown>): Promise<void> {
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
        // Logic to start the component manager
    }

    async shutdownAsync(): Promise<void> {
        this._logger.logInformation("Stopping component manager.");

        await this.hubConnection.stop();
        // Logic to shutdown the component manager
    }
}
