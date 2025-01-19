import { Schema } from "effect";

export const InfoObjectSchema = Schema.Struct({
    title: Schema.String,
    version: Schema.String,
    acaad: Schema.String,
});

export class InfoObject {
    constructor(
        public title: string,
        public version: string,
        public acaad: string,
    ) {}
}
