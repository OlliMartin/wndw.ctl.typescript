import axios, { AxiosInstance } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";

import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";

import { AcaadError } from "./errors/AcaadError";
import { pipe, Effect } from "effect";
import { Option } from "effect/Option";

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

    private static fetchAPI = (url: string) =>
        Effect.tryPromise({
            try: () => {
                console.log(url);
                return axios.get(url); // TODO: Does not have instance reference!!
            },
            catch: (unknown) => new AcaadError(unknown),
        });

    queryComponentConfigurationAsync(host: AcaadHost): Effect.Effect<OpenApiDefinition, AcaadError> {
        this.logger.logDebug(`Querying component configuration from ${host.restBase()}.`);

        const requestUrl = `${host.restBase()}/${this._openApiEndpoint}`;
        this.logger.logDebug("Using request URL:", requestUrl);

        return pipe(
            ConnectionManager.fetchAPI(requestUrl),
            Effect.map((res) => res.data as OpenApiDefinition),
        );
    }

    async updateComponentStateAsync(metadata: AcaadMetadata, value: Option<unknown>): Promise<void> {
        // Logic to update component state
    }
}
