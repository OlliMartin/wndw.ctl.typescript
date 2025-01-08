import { OAuth2Token } from "../model/auth/OAuth2Token";
import { AcaadAuthentication } from "../model/auth/AcaadAuthentication";

export interface ITokenCache {
    getAsync(authentication: AcaadAuthentication): Promise<OAuth2Token | undefined>;
}
