import { AcaadEvent, AcaadEventSchema } from "./AcaadEvent";
import { AcaadOutcome, AcaadOutcomeSchema } from "../AcaadOutcome";
import { Schema } from "effect";
import { ComponentSchema } from "../Component";

export const ComponentCommandExecutionSucceededSchema = Schema.Struct({
    ...AcaadEventSchema.fields,
    topic: Schema.Literal("Events"),
    type: Schema.Literal("Scheduling"),
    name: Schema.Literal("ComponentCommandExecutionSucceeded"),
    component: ComponentSchema,

    outcome: AcaadOutcomeSchema,
    commandsToExecute: Schema.Number,
});

export class ComponentCommandExecutionSucceeded extends AcaadEvent {
    outcome: AcaadOutcome;
    commandsToExecute: number;

    constructor(fromSchema: Schema.Schema.Type<typeof ComponentCommandExecutionSucceededSchema>) {
        super("Events", "Scheduling", "ComponentCommandExecutionSucceeded");
        this.outcome = new AcaadOutcome(fromSchema.outcome);
        this.commandsToExecute = fromSchema.commandsToExecute;
    }
}
