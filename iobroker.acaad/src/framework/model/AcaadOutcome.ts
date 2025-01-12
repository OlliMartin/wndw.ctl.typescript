import { Schema } from "effect";

export const AcaadOutcomeSchema = Schema.Struct({
    success: Schema.Boolean,
    outcomeRaw: Schema.UndefinedOr(Schema.String),
});

export class AcaadOutcome {
    public success: boolean;
    public outcomeRaw?: string;

    constructor(fromSchema: Schema.Schema.Type<typeof AcaadOutcomeSchema>) {
        this.success = fromSchema.success;
        this.outcomeRaw = fromSchema.outcomeRaw;
    }
}
