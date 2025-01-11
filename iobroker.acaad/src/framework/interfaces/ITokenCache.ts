import { OAuth2Token } from "../model/auth/OAuth2Token";
import { AcaadAuthentication } from "../model/auth/AcaadAuthentication";
import { Option } from "effect";

export interface ITokenCache {
    getAsync(authentication: AcaadAuthentication): Promise<Option.Option<OAuth2Token>>;
}
