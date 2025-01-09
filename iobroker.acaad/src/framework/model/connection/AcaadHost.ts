import { AcaadAuthentication } from "../auth/AcaadAuthentication";

export class AcaadHost {
    host: string;
    port: number;
    authentication: AcaadAuthentication;

    protocol: string = "http";

    private _restBase: string | undefined = undefined;

    restBase(): string {
        return (this._restBase ??= `${this.protocol}://${this.host}:${this.port}`);
    }

    constructor(host: string, port: number, authentication: AcaadAuthentication) {
        this.host = host;
        this.port = port;
        this.authentication = authentication;
    }
}
