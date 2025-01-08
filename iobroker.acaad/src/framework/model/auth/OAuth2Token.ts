export class OAuth2Token {
    expires: number;
    accessToken: string;
    refreshToken: string;
    grants: string[];

    constructor(expires: number, accessToken: string, refreshToken: string, grants: string[]) {
        this.expires = expires;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.grants = grants;
    }
}
