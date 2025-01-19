import { CalloutError } from "./CalloutError";
import { AcaadHost } from "../model/connection/AcaadHost";

export class AcaadServerUnreachableError extends CalloutError {
    public static Tag = "AcaadServerUnreachableError";

    public override _tag: string = AcaadServerUnreachableError.Tag;

    constructor(
        public host: AcaadHost,
        error: unknown,
    ) {
        super(error);
    }
}
