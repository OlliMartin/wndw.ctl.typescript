import { AcaadMetadata, AcaadMetadataSchema } from "../AcaadMetadata";
import { Schema } from "effect";

export const OperationObjectSchema = Schema.Struct({
    acaad: Schema.UndefinedOr(AcaadMetadataSchema),
});

export class OperationObject {
    public path: string;
    public method: string;
    public acaad?: AcaadMetadata;

    constructor(
        path: string,
        method: string,
        acaadFromReq: Schema.Schema.Type<typeof AcaadMetadataSchema> | undefined,
    ) {
        this.path = path;
        this.method = method;
        this.acaad = acaadFromReq ? AcaadMetadata.fromSchema(path, method, acaadFromReq) : undefined;
    }

    public static fromSchema(
        schema: Schema.Schema.Type<typeof OperationObjectSchema>,
        path: string,
        method: string,
    ): OperationObject {
        return new OperationObject(path, method, schema.acaad);
    }
}
