import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { AcaadPopulatedMetadata, OpenApiDefinition, OpenApiDefinitionSchema } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";

import { AcaadError } from "./errors/AcaadError";
import { Context, Effect, Either, pipe, Queue, Schema, Stream } from "effect";
import { CalloutError } from "./errors/CalloutError";

import { map, mapLeft } from "effect/Either";
import { AcaadEvent, AcaadPopulatedEvent } from "./model/events/AcaadEvent";
import IConnectedServiceAdapter from "./interfaces/IConnectedServiceAdapter";
import { ResponseSchemaError } from "./errors/ResponseSchemaError";
import { AcaadServerUnreachableError } from "./errors/AcaadServerUnreachableError";
import { HubConnectionWrapper } from "./HubConnectionWrapper";

class AxiosSvc extends Context.Tag("axios")<AxiosSvc, { readonly instance: AxiosInstance }>() {}

// noinspection JSPotentiallyInvalidUsageOfClassThis
@injectable()
export default class ConnectionManager {
    private readonly _openApiEndpoint = "openapi/v1.json";

    private readonly axiosInstance: AxiosInstance;
    private readonly hubConnections: HubConnectionWrapper[] = [];

    constructor(
        @inject(DependencyInjectionTokens.Logger) private logger: ICsLogger,
        @inject(DependencyInjectionTokens.TokenCache) private tokenCache: ITokenCache,
        @inject(DependencyInjectionTokens.ConnectedServiceAdapter)
        private connectedServiceAdapter: IConnectedServiceAdapter,
        @inject(DependencyInjectionTokens.EventQueue)
        private eventQueue: Queue.Queue<AcaadPopulatedEvent>,
    ) {
        this.axiosInstance = axios.create({
            headers: {
                "Content-Type": "application/json",
            },
        });
        this.queryComponentConfigurationAsync = this.queryComponentConfigurationAsync.bind(this);
    }

    private getHosts = Effect.gen(this, function* () {
        return yield* this.connectedServiceAdapter.getConnectedServersAsync();
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
            });

            return pipe(
                result,
                mapLeft(
                    (error) =>
                        new ResponseSchemaError(
                            "The server did not respond according to the acaad openapi extension. This is caused either by an incompatible version or another openapi json that was discovered.",
                            error,
                        ),
                ),
                map((val) => OpenApiDefinition.fromSchema(val)),
            );
        }

        return Effect.fail(new CalloutError("No or invalid data received from the server."));
    };

    queryComponentConfigurationAsync(host: AcaadHost): Effect.Effect<Either.Either<OpenApiDefinition, AcaadError>> {
        this.logger.logDebug(`Querying component configuration from ${host.restBase()}.`);

        const requestUrl = host.append(this._openApiEndpoint);
        this.logger.logTrace("Using request URL:", requestUrl);

        const result = AxiosSvc.pipe(
            Effect.andThen(({ instance }) => {
                return Effect.tryPromise({
                    try: (abortSignal) => instance.get(requestUrl, { signal: abortSignal }),
                    catch: (unknown) => {
                        if (unknown instanceof AxiosError) {
                            if (unknown.code === "ECONNREFUSED") {
                                return new AcaadServerUnreachableError(host, unknown);
                            }
                        }

                        return new CalloutError(unknown);
                    },
                });
            }),
            Effect.andThen(ConnectionManager.verifyResponsePayload),
            Effect.tap((res) => this.logger.logTrace(`Received acaad configuration with ${res.paths.length} paths.`)),
            Effect.andThen((res) => res),
        );

        return Effect.provideService(result, AxiosSvc, {
            instance: this.axiosInstance,
        }).pipe(Effect.either);
    }

    private executeComponentRequest(metadata: AcaadPopulatedMetadata): Effect.Effect<AcaadEvent, AcaadError, AxiosSvc> {
        return Effect.gen(this, function* () {
            const { instance } = yield* AxiosSvc;

            const requestUrl = metadata.serverMetadata.host.append(metadata.path);

            const request: AxiosRequestConfig = {
                method: metadata.method,
                url: requestUrl,
            };

            this.logger.logDebug(`Executing request generated from metadata: ${metadata.method}::${requestUrl}`);

            const response = yield* Effect.tryPromise({
                try: (abortSignal) => {
                    return instance.request<AcaadEvent>({ ...request, signal: abortSignal });
                },
                catch: (unknown) => new CalloutError(unknown),
            });

            return response.data;
        });
    }

    updateComponentStateAsync(metadata: AcaadPopulatedMetadata): Effect.Effect<AcaadEvent, AcaadError> {
        const eff = AxiosSvc.pipe(Effect.andThen(this.executeComponentRequest(metadata)));

        return Effect.provideService(eff, AxiosSvc, {
            instance: this.axiosInstance,
        });
    }

    public startMissingHubConnections = Effect.gen(this, function* () {
        const hosts = yield* this.getHosts;

        const startedHosts = Stream.fromIterable(hosts).pipe(
            Stream.filter((host) => this.hubConnections.find((hc) => hc.host === host) === undefined),
            Stream.map((host) => new HubConnectionWrapper(host, this.eventQueue, this.logger)),
            Stream.mapEffect((hc) => hc.startEff),
            Stream.either,
            Stream.runCollect,
        );

        return yield* startedHosts;
    });

    public stopHubConnections = Effect.gen(this, function* () {
        const stopProcesses = Stream.fromIterable(this.hubConnections).pipe(
            Stream.mapEffect((hc) => hc.stopHubConnection),
            Stream.either,
            Stream.runCollect,
        );

        return yield* stopProcesses;
    });
}
