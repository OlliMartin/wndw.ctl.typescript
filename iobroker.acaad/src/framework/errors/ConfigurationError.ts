import { AcaadError } from "./AcaadError";

export class ConfigurationError extends AcaadError {
    _tag: string = "ConfigurationError";

    constructor(message: string) {
        super(message);
    }
}
