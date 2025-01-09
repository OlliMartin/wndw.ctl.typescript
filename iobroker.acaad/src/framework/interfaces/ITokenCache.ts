import { OAuth2Token } from "../model/auth/OAuth2Token";
import { AcaadAuthentication } from "../model/auth/AcaadAuthentication";
import { Option } from "fp-ts/Option";

export interface ITokenCache {
    getAsync(authentication: AcaadAuthentication): Promise<Option<OAuth2Token>>;
}
