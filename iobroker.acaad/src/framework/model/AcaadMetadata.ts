import { AcaadComponentMetadata } from "./AcaadComponentManager";

export class AcaadMetadata {
    public component: AcaadComponentMetadata;
    public actionable?: boolean;
    public queryable?: boolean;
    public idempotent?: boolean;

    constructor(component: AcaadComponentMetadata, idempotent?: boolean, actionable?: boolean, queryable?: boolean) {
        this.component = component;
        this.idempotent = idempotent ?? false;
        this.actionable = actionable ?? false;
        this.queryable = queryable ?? false;
    }
}
