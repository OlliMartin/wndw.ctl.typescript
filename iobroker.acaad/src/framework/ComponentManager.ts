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
import { pipe, Effect } from "effect";
import { Option } from "effect/Option";

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

        const callChain = this.queryComponentConfigurationAsync();

        const result = await Effect.runPromise(callChain);
        console.log(result);
    }

    private queryComponentConfigurationAsync(): Effect.Effect<OpenApiDefinition, AcaadError> {
        const callChain = pipe(
            this.serviceAdapter.getConnectedServerAsync(),
            Effect.andThen(this.connectionManager.queryComponentConfigurationAsync),
        );

        return callChain;
    }

    private async updateConnectedServiceModelAsync(config: OpenApiDefinition): Promise<void> {
        const endpoints = Object.values(config.paths).filter((path) => path.acaad);

        this._logger.logInformation(`Configuration received. Processing ${endpoints.length} endpoints.`);
    }

    async handleOutboundStateChangeAsync(component: unknown, value: Option<unknown>): Promise<void> {
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
