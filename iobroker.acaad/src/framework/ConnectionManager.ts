import axios, { AxiosInstance } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";
import Option from "./fp/Option";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { inject, injectable } from "tsyringe";
import DependencyInjectionTokens from "./model/DependencyInjectionTokens";

@injectable()
export default class ConnectionManager {
    private axiosInstance: AxiosInstance;

    constructor(
        @inject(DependencyInjectionTokens.Logger) private logger: ICsLogger,
        @inject(DependencyInjectionTokens.TokenCache) private tokenCache: ITokenCache,
    ) {
        this.axiosInstance = axios.create();
    }

    private async retrieveAuthenticationAsync(): Promise<OAuth2Token> {
        // Logic to retrieve authentication token
        return new OAuth2Token(0, "", "", []);
    }

    async queryComponentConfigurationAsync(host: AcaadHost): Promise<Option<OpenApiDefinition>> {
        this.logger?.logInformation(`Querying component configuration from ${host.host}.`);

        // Logic to query component configuration
        return Option.None<OpenApiDefinition>();
    }

    async updateComponentStateAsync(metadata: AcaadMetadata, value: Option<unknown>): Promise<void> {
        // Logic to update component state
    }
}
