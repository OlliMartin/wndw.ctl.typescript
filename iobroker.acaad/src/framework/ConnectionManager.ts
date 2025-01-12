import axios, { AxiosInstance, AxiosResponse } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";

import { OpenApiDefinition, OpenApiDefinitionSchema, SchemaDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";

import { AcaadError } from "./errors/AcaadError";
import { Effect, Context, Schema, pipe, Exit } from "effect";
import { CalloutError } from "./errors/CalloutError";

import { mapLeft, map } from "effect/Either";
import { AcaadEvent } from "./model/events/AcaadEvent";
import IConnectedServiceAdapter from "./interfaces/IConnectedServiceAdapter";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { EventFactory } from "./model/factories/EventFactory";

// Declaring a tag for a service that generates random numbers
class AxiosSvc extends Context.Tag("axios")<AxiosSvc, { readonly instance: AxiosInstance }>() {}

const CONST = {
    EVENT_HUB_PATH: "events",
    RECEIVE_EVENTS_METHOD: "receiveEvent",
};

/* All the Effect.gen findings are FPs... But thank you, Rider! */
// noinspection JSPotentiallyInvalidUsageOfClassThis
@injectable()
export default class ConnectionManager {
    private readonly _openApiEndpoint = "openapi/v1.json";

    private readonly axiosInstance: AxiosInstance;
    private hubConnection: HubConnection | null = null;

    constructor(
        @inject(DependencyInjectionTokens.Logger) private logger: ICsLogger,
        @inject(DependencyInjectionTokens.TokenCache) private tokenCache: ITokenCache,
        @inject(DependencyInjectionTokens.ConnectedServiceAdapter)
        private connectedServiceAdapter: IConnectedServiceAdapter,
    ) {
        this.axiosInstance = axios.create();
        this.queryComponentConfigurationAsync = this.queryComponentConfigurationAsync.bind(this);

        this.onEventAsync = this.onEventAsync.bind(this);
    }

    public startHubConnection = Effect.gen(this, function* () {
        const host = yield* this.getHost;
        this.hubConnection = new HubConnectionBuilder().withUrl(host.append(CONST.EVENT_HUB_PATH)).build();

        this.hubConnection.on(CONST.RECEIVE_EVENTS_METHOD, this.onEventAsync);

        /* TODO/TBD: Should we pass the connection as an effect-svc ? */

        yield* Effect.tryPromise({
            try: (_) => this.hubConnection?.start() ?? Promise.resolve(),
            catch: (err) => new CalloutError("An unexpected error occurred starting hub connection", err),
        });
    });

    private async onEventAsync(event: unknown): Promise<void> {
        const result = await Effect.runPromiseExit(this.onEffectEff(event));

        Exit.match(result, {
            onFailure: (cause) => this.logger.logError(cause, undefined, `An error occurred processing inbound event.`),
            onSuccess: (res) => {
                this.logger.logInformation(`Successfully processed/enqueued event ${res.name}.`, res);
            },
        });

        console.log(result);
    }

    private onEffectEff(eventUntyped: unknown) {
        return Effect.gen(this, function* () {
            const event = yield* EventFactory.createEvent(eventUntyped);
            return event;
        });
    }

    public stopHubConnection = Effect.gen(this, function* () {
        if (!this.hubConnection) {
            return;
        }

        yield* Effect.tryPromise({
            try: () => this.hubConnection?.stop() ?? Promise.resolve(),
            catch: (err) => new CalloutError("Error stopping hub connection", err),
        });
    });

    private async retrieveAuthenticationAsync(): Promise<OAuth2Token> {
        // Logic to retrieve authentication token
        return new OAuth2Token(0, "", "", []);
    }

    private static verifyResponsePayload = (
        response: AxiosResponse<any, any>,
    ): Effect.Effect<OpenApiDefinition, AcaadError> => {
        if (response.data) {
            const result = Schema.decodeUnknownEither(OpenApiDefinitionSchema)(response.data, {
                onExcessProperty: "ignore", // So that I remember it is possible only.
                // errors: "all",
            });

            // TODO: Should return more specific error. See class "TaggerError" of effect lib as well.
            return pipe(
                result,
                mapLeft((error) => new CalloutError(error)),
                map((val) => OpenApiDefinition.fromSchema(val)),
            );
        }

        return Effect.fail(new CalloutError("No or invalid data received from the server."));
    };

    queryComponentConfigurationAsync(host: AcaadHost): Effect.Effect<OpenApiDefinition, AcaadError> {
        this.logger.logDebug(`Querying component configuration from ${host.restBase()}.`);

        const requestUrl = host.append(this._openApiEndpoint);
        this.logger.logDebug("Using request URL:", requestUrl);

        const result = AxiosSvc.pipe(
            Effect.andThen(({ instance }) => {
                return Effect.tryPromise({
                    try: (abortSignal) => instance.get(requestUrl, { signal: abortSignal }),
                    catch: (unknown) => new CalloutError(unknown),
                });
            }),
            Effect.andThen(ConnectionManager.verifyResponsePayload),
            Effect.tap((res) => this.logger.logDebug("Received configuration", res)),
            Effect.andThen((res) => res),
        );

        return Effect.provideService(result, AxiosSvc, {
            instance: this.axiosInstance,
        });
    }

    readonly getHost = Effect.gen(this, function* () {
        const host = yield* this.connectedServiceAdapter.getConnectedServerAsync();
        return host;
    });

    private executeComponentRequest(metadata: AcaadMetadata): Effect.Effect<AcaadEvent, AcaadError, AxiosSvc> {
        return Effect.gen(this, function* () {
            const host = yield* this.getHost;
            const { instance } = yield* AxiosSvc;

            const requestUrl = host.append(metadata.path);

            const request: axios.AxiosRequestConfig = {
                method: metadata.method,
                url: requestUrl,
            };

            this.logger.logDebug(`Executing metadata: ${metadata.method}::${requestUrl}`);

            const response = yield* Effect.tryPromise({
                try: (abortSignal) => instance.request<AcaadEvent>({ ...request, signal: abortSignal }),
                catch: (unknown) => new CalloutError(unknown),
            });

            // TODO: Parse + validate event response

            return response.data;
        });
    }

    updateComponentStateAsync(metadata: AcaadMetadata): Effect.Effect<AcaadEvent, AcaadError> {
        const eff = AxiosSvc.pipe(Effect.andThen(this.executeComponentRequest(metadata)));

        return Effect.provideService(eff, AxiosSvc, {
            instance: this.axiosInstance,
        });
    }
}
