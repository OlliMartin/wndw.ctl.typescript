import Option from "../fp/Option";
import { ITokenCache } from "../interfaces/ITokenCache";
import { AcaadAuthentication } from "../model/auth/AcaadAuthentication";
import { OAuth2Token } from "../model/auth/OAuth2Token";
import { injectable } from "tsyringe";

@injectable<ITokenCache>()
export class InMemoryTokenCache implements ITokenCache {
    getAsync(authentication: AcaadAuthentication): Promise<Option<OAuth2Token>> {
        throw new Error("Method not implemented.");
    }
}
