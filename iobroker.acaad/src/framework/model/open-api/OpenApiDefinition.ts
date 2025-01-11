import { PathItemObject, PathItemObjectSchema } from "./PathItemObject";
import { Schema } from "effect";

export const OpenApiDefinitionSchema = Schema.Struct({
    paths: Schema.Record({
        key: Schema.String,
        value: PathItemObjectSchema,
    }),
});

export interface SchemaDefinition extends Schema.Schema.Type<typeof OpenApiDefinitionSchema> {}

export class OpenApiDefinition {
    paths: PathItemObject[];

    constructor(paths: PathItemObject[]) {
        this.paths = paths;
    }

    public static fromSchema(schema: SchemaDefinition): OpenApiDefinition {
        return new OpenApiDefinition(
            Object.entries(schema.paths).map(([key, value]) => PathItemObject.fromSchema(key, value)),
        );
    }
}
