import { AcaadAuthentication } from "./AcaadAuthentication";

export class AcaadHost {
    host: string;
    port: number;
    authentication: AcaadAuthentication;

    constructor(host: string, port: number, authentication: AcaadAuthentication) {
        this.host = host;
        this.port = port;
        this.authentication = authentication;
    }
}
