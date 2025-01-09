import { AcaadError } from "./AcaadError";

export class CalloutError extends AcaadError {
    RequestError: any;

    constructor(requestError: any) {
        super(null);
        this.RequestError = requestError;
    }

    public toString(): string {
        return `CalloutError: ${this.RequestError}`;
    }
}
