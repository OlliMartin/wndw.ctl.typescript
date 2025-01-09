import axios, { AxiosInstance, AxiosResponse } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";

import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import * as taskEither from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";
import { CalloutError } from "./errors/CalloutError";

import { TaskEither } from "fp-ts/TaskEither";
import { AcaadError } from "./errors/AcaadError";
import { Either } from "fp-ts/Either";
import { Option } from "fp-ts/Option";

@injectable()
export default class ConnectionManager {
    private readonly _openApiEndpoint = "openapi/v1.json";

    private axiosInstance: AxiosInstance;

    constructor(
        @inject(DependencyInjectionTokens.Logger) private logger: ICsLogger,
        @inject(DependencyInjectionTokens.TokenCache) private tokenCache: ITokenCache,
    ) {
        this.axiosInstance = axios.create();

        this.transformSuccessInterceptor = this.transformSuccessInterceptor.bind(this);
        this.transformErrorInterceptor = this.transformErrorInterceptor.bind(this);

        this.axiosInstance.interceptors.response.use(this.transformSuccessInterceptor, this.transformErrorInterceptor);
    }

    private transformSuccessInterceptor(response: AxiosResponse<any, any>): AxiosResponse<Either<CalloutError, any>> {
        // TODO: Verify response with AJV?

        response.data = E.right<CalloutError, unknown>(response.data);
        return response;
    }

    private transformErrorInterceptor(error: any): AxiosResponse<Either<CalloutError, unknown>, any> {
        return {
            data: E.left<CalloutError, unknown>(new CalloutError(error)),
            ...error,
        };
    }

    private async retrieveAuthenticationAsync(): Promise<OAuth2Token> {
        // Logic to retrieve authentication token
        return new OAuth2Token(0, "", "", []);
    }

    queryComponentConfigurationAsync(host: AcaadHost): TaskEither<AcaadError, OpenApiDefinition> {
        this.logger?.logDebug(`Querying component configuration from ${host.restBase()}.`);

        const requestUrl = `${host.restBase()}/${this._openApiEndpoint}abc"`;
        this.logger.logTrace("Using request URL:", requestUrl);

        const fetchAPI = taskEither.tryCatchK(
            (url: string) => axios.get(url),
            (reason) => new AcaadError(reason),
        );

        return pipe(
            fetchAPI(requestUrl),
            taskEither.chain((res) => taskEither.fromEither(res.data)),
        );
    }

    async updateComponentStateAsync(metadata: AcaadMetadata, value: Option<unknown>): Promise<void> {
        // Logic to update component state
    }
}
