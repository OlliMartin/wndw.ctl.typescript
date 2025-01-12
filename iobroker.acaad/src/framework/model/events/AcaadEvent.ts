import { Schema } from "effect";

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

    public toString(): string {
        return `${this.topic}.${this.type}.${this.name}`;
    }
}
