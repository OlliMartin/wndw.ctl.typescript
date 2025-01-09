import axios, { AxiosInstance, AxiosResponse } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";

import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";

import { AcaadError } from "./errors/AcaadError";
import { Effect, Context } from "effect";
import { Option } from "effect/Option";
import { CalloutError } from "./errors/CalloutError";

// Declaring a tag for a service that generates random numbers
class AxiosSvc extends Context.Tag("axios")<AxiosSvc, { readonly instance: AxiosInstance }>() {}

@injectable()
export default class ConnectionManager {
    private readonly _openApiEndpoint = "openapi/v1.json";

    private axiosInstance: AxiosInstance;

    constructor(
        @inject(DependencyInjectionTokens.Logger) private logger: ICsLogger,
        @inject(DependencyInjectionTokens.TokenCache) private tokenCache: ITokenCache,
    ) {
        this.axiosInstance = axios.create();

        // this.transformSuccessInterceptor = this.transformSuccessInterceptor.bind(this);
        // this.transformErrorInterceptor = this.transformErrorInterceptor.bind(this);

        // this.axiosInstance.interceptors.response.use(this.transformSuccessInterceptor, this.transformErrorInterceptor);

        this.queryComponentConfigurationAsync = this.queryComponentConfigurationAsync.bind(this);
    }

    // private transformSuccessInterceptor(response: AxiosResponse<any, any>): AxiosResponse<Either<CalloutError, any>> {
    //     // TODO: Verify response with AJV?
    //
    //     response.data = E.right<CalloutError, unknown>(response.data);
    //     return response;
    // }
    //
    // private transformErrorInterceptor(error: any): AxiosResponse<Either<CalloutError, unknown>, any> {
    //     return {
    //         data: E.left<CalloutError, unknown>(new CalloutError(error)),
    //         ...error,
    //     };
    // }

    private async retrieveAuthenticationAsync(): Promise<OAuth2Token> {
        // Logic to retrieve authentication token
        return new OAuth2Token(0, "", "", []);
    }

    private static requestApiDefinitionIO = (url: string): Effect.Effect<AxiosResponse<any>, AcaadError, AxiosSvc> =>
        Effect.tryPromise({
            try: (abortSignal) => {
                return axios.get(url, { signal: abortSignal }); // TODO: Does not have instance reference!!
            },
            catch: (unknown) => new CalloutError(unknown),
        });

    private static verifyResponsePayload = (
        response: AxiosResponse<any, any>,
    ): Effect.Effect<OpenApiDefinition, AcaadError> => {
        if (response.data) {
            // TODO: More checks (AJV?) to map api definition
            return Effect.succeed(response.data);
        }

        return Effect.fail(new CalloutError("No data received from the server."));
    };

    queryComponentConfigurationAsync(host: AcaadHost): Effect.Effect<OpenApiDefinition, AcaadError> {
        this.logger.logDebug(`Querying component configuration from ${host.restBase()}.`);

        const requestUrl = `${host.restBase()}/${this._openApiEndpoint}`;
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

        return Effect.provideService(result, AxiosSvc, { instance: this.axiosInstance });
    }

    async updateComponentStateAsync(metadata: AcaadMetadata, value: Option<unknown>): Promise<void> {
        // Logic to update component state
    }
}
