import { Effect, Option, Schema } from "effect";
import {
    ComponentCommandOutcomeEventSchema,
    ComponentCommandOutcomeEvent,
} from "../events/ComponentCommandOutcomeEvent";
import { AcaadEvent } from "../events/AcaadEvent";
import {
    ComponentCommandExecutionSucceededSchema,
    ComponentCommandExecutionSucceeded,
} from "../events/ComponentCommandExecutionSucceeded";
import { ParseError } from "effect/ParseResult";

export const AnyAcaadEventSchema = Schema.Union(
    Schema.transform(
        ComponentCommandOutcomeEventSchema,
        Schema.Struct({
            ...ComponentCommandOutcomeEventSchema.fields,
            name: Schema.Literal("ComponentCommandOutcomeEvent"),
        }),
        {
            strict: true,
            decode: (event) => ({ ...event, name: "ComponentCommandOutcomeEvent" as const }),
            encode: (_) => {
                throw new Error("Serialization of events is not implemented.");
            },
        },
    ),

    Schema.transform(
        ComponentCommandExecutionSucceededSchema,
        Schema.Struct({
            ...ComponentCommandExecutionSucceededSchema.fields,
            name: Schema.Literal("ComponentCommandExecutionSucceeded"),
        }),
        {
            strict: true,
            decode: (event) => ({ ...event, name: "ComponentCommandExecutionSucceeded" as const }),
            encode: (_) => {
                throw new Error("Serialization of events is not implemented.");
            },
        },
    ),
);

export class EventFactory {
    public static createEvent(event: unknown): Effect.Effect<Option.Option<AcaadEvent>, ParseError> {
        return Effect.gen(function* () {
            if (
                !EventFactory.isAcaadEvent(event) ||
                (event.name != "ComponentCommandOutcomeEvent" && event.name != "ComponentCommandExecutionSucceeded")
            ) {
                return Option.none();
            }

            const decoded = yield* Schema.decodeUnknown(AnyAcaadEventSchema)(event);

            switch (decoded.name) {
                case "ComponentCommandOutcomeEvent":
                    return Option.some(new ComponentCommandOutcomeEvent(decoded) as AcaadEvent);
                case "ComponentCommandExecutionSucceeded":
                    return Option.some(new ComponentCommandExecutionSucceeded(decoded) as AcaadEvent);
            }
        });
    }

    private static isAcaadEvent(event: unknown): event is AcaadEvent {
        return (
            (event?.hasOwnProperty("name") ?? false) &&
            (event?.hasOwnProperty("type") ?? false) &&
            (event?.hasOwnProperty("topic") ?? false)
        );
    }
}
