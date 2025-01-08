export class AcaadAuthentication {
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
    grants: string[];

    constructor(tokenEndpoint: string, clientId: string, clientSecret: string, grants: string[]) {
        this.tokenEndpoint = tokenEndpoint;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.grants = grants;
    }
}
