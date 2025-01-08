import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import IConnectedServiceAdapter from "./interfaces/IConnectedServiceAdapter";
import Option from "./fp/Option";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadEvent } from "./model/events/AcaadEvent";

export default class ComponentManager {
    private serviceAdapter: IConnectedServiceAdapter;
    private abortController: AbortController;
    private hubConnection: HubConnection;

    constructor(serviceAdapter: IConnectedServiceAdapter) {
        this.serviceAdapter = serviceAdapter;
        this.abortController = new AbortController();
        this.hubConnection = new HubConnectionBuilder().withUrl("https://your-signalr-endpoint").build();
    }

    async createMissingComponentsAsync(): Promise<void> {
        const config = await this.queryComponentConfigurationAsync();
        if (config.isSome()) {
            // Logic to create missing components
        }
    }

    private async queryComponentConfigurationAsync(): Promise<Option<OpenApiDefinition>> {
        // Logic to query component configuration
        return Option.None<OpenApiDefinition>();
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
        await this.hubConnection.start();
        // Logic to start the component manager
    }

    async shutdownAsync(): Promise<void> {
        await this.hubConnection.stop();
        // Logic to shutdown the component manager
    }
}
