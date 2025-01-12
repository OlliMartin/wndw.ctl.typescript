import { AcaadEvent, AcaadEventSchema } from "./AcaadEvent";
import { AcaadOutcome, AcaadOutcomeSchema } from "../AcaadOutcome";
import { Schema } from "effect";

export const ComponentCommandOutcomeEventSchema = Schema.Struct({
    ...AcaadEventSchema.fields,
    topic: Schema.Literal("Events"),
    type: Schema.Literal("Outcome"),
    name: Schema.Literal("ComponentCommandOutcomeEvent"),

    outcome: AcaadOutcomeSchema,
});

export class ComponentCommandOutcomeEvent extends AcaadEvent {
    outcome: AcaadOutcome;

    constructor(obj: Schema.Schema.Type<typeof ComponentCommandOutcomeEventSchema>) {
        super("Events", "Outcome", "ComponentCommandOutcomeEvent");
        this.outcome = new AcaadOutcome(obj.outcome);
    }
}
