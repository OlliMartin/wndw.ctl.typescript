import { Schema } from "effect";
import { AcaadHost } from "../connection/AcaadHost";

export const AcaadEventSchema = Schema.Struct({
    topic: Schema.String,
    type: Schema.String,
    name: Schema.String,
});

// TODO: Make abstract
export class AcaadEvent {
    topic: string;
    type: string;
    name: string;

    constructor(topic: string, type: string, name: string) {
        this.topic = topic;
        this.type = type;
        this.name = name;
    }
}

export type AcaadPopulatedEvent = AcaadEvent & { host: AcaadHost };
