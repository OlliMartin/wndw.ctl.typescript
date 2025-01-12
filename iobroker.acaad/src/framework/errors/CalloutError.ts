import { AcaadError } from "./AcaadError";

export class CalloutError extends AcaadError {
    readonly _tag = "CalloutError";

    RequestError: any;
    CaughtError: unknown;

    constructor(requestError: any, caughtError?: unknown) {
        super(null);
        this.RequestError = requestError;
        this.CaughtError = caughtError;
    }

    public toString(): string {
        return `CalloutError: ${this.RequestError}`;
    }
}
