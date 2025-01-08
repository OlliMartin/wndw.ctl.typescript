import axios, { AxiosInstance } from "axios";
import { AcaadMetadata } from "./model/AcaadMetadata";
import Option from "./fp/Option";
import { OpenApiDefinition } from "./model/open-api/OpenApiDefinition";
import { AcaadHost } from "./model/connection/AcaadHost";
import { OAuth2Token } from "./model/auth/OAuth2Token";
import { ITokenCache } from "./interfaces/ITokenCache";

class ConnectionManager {
    private axiosInstance: AxiosInstance;
    private tokenCache: ITokenCache;

    constructor(tokenCache: ITokenCache) {
        this.axiosInstance = axios.create();
        this.tokenCache = tokenCache;
    }

    private async retrieveAuthenticationAsync(): Promise<OAuth2Token> {
        // Logic to retrieve authentication token
        return new OAuth2Token(0, "", "", []);
    }

    async queryComponentConfigurationAsync(host: AcaadHost): Promise<Option<OpenApiDefinition>> {
        // Logic to query component configuration
        return Option.None<OpenApiDefinition>();
    }

    async updateComponentStateAsync(metadata: AcaadMetadata, value: Option<unknown>): Promise<void> {
        // Logic to update component state
    }
}
