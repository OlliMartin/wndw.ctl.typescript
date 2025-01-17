import { AcaadAuthentication } from "../auth/AcaadAuthentication";

export class AcaadHost {
    friendlyName: string;
    host: string;
    port: number;
    signalrPort: number;

    authentication: AcaadAuthentication | undefined;

    protocol: string = "http";

    private _restBase: string | undefined = undefined;
    private _signalrBase: string | undefined = undefined;

    restBase(): string {
        return (this._restBase ??= `${this.protocol}://${this.host}:${this.port}`);
    }

    signalrBase(): string {
        return (this._signalrBase ??= `${this.protocol}://${this.host}:${this.signalrPort}`);
    }

    append(relative: string): string {
        if (relative.startsWith("/")) {
            return `${this.restBase()}${relative}`;
        }

        return `${this.restBase()}/${relative}`;
    }

    appendSignalR(relative: string): string {
        if (relative.startsWith("/")) {
            return `${this.signalrBase()}${relative}`;
        }

        return `${this.signalrBase()}/${relative}`;
    }

    // TODO: Reorder parameters (auth last)
    constructor(
        friendlyName: string,
        host: string,
        port: number,
        authentication: AcaadAuthentication | undefined,
        signalrPort: number | undefined,
    ) {
        this.friendlyName = friendlyName;
        this.host = host;
        this.port = port;
        this.authentication = authentication;

        if (signalrPort) {
            this.signalrPort = signalrPort;
        } else {
            this.signalrPort = port;
        }
    }
}
