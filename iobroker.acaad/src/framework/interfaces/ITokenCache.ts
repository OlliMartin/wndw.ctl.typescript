import {AcaadAuthentication} from './AcaadAuthentication';
import {OAuth2Token} from './OAuth2Token';

export interface ITokenCache {
    getAsync(authentication: AcaadAuthentication): Promise<OAuth2Token | undefined>;
}