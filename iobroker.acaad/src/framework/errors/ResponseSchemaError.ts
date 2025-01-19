import { AcaadError } from "./AcaadError";
import { ParseError } from "effect/ParseResult";

export class ResponseSchemaError extends AcaadError {
    _tag: string = "ResponseSchemaError";

    constructor(
        public message: string,
        error: ParseError,
    ) {
        super(error);
    }
}
