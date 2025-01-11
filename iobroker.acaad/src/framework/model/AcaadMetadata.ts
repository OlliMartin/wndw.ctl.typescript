import { AcaadComponentMetadata } from "./AcaadComponentManager";
import { Schema } from "effect";
import { Option } from "effect";
import { isNullOrUndefined } from "../utils/Checks";

const AcaadComponentMetadataSchema = Schema.Struct({
    type: Schema.String,
    name: Schema.String,
});

export const AcaadMetadataSchema = Schema.Struct({
    actionable: Schema.UndefinedOr(Schema.Boolean),
    queryable: Schema.UndefinedOr(Schema.Boolean),
    idempotent: Schema.UndefinedOr(Schema.Boolean),
    forValue: Schema.UndefinedOr(Schema.Unknown),
    component: AcaadComponentMetadataSchema,
});

export class AcaadMetadata {
    public path: string;
    public method: string;

    public component: AcaadComponentMetadata;
    public actionable?: boolean;
    public queryable?: boolean;
    public idempotent?: boolean;
    public forValue: Option.Option<unknown>;

    constructor(
        path: string,
        method: string,
        component: AcaadComponentMetadata,
        idempotent?: boolean,
        actionable?: boolean,
        queryable?: boolean,
        forValue?: unknown,
    ) {
        this.path = path;
        this.method = method;

        this.component = component;
        this.idempotent = idempotent ?? false;
        this.actionable = actionable ?? false;
        this.queryable = queryable ?? false;
        this.forValue = isNullOrUndefined(forValue) ? Option.none<unknown>() : Option.some(forValue);
    }

    public static fromSchema(
        path: string,
        method: string,
        schema: Schema.Schema.Type<typeof AcaadMetadataSchema>,
    ): AcaadMetadata {
        return new AcaadMetadata(
            path,
            method,
            schema.component,
            schema.idempotent,
            schema.actionable,
            schema.queryable,
            schema.forValue,
        );
    }

    with(): AcaadMetadata {
        return this;
    }
}
