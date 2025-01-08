import { AcaadComponentMetadata } from "./AcaadComponentManager";

export class AcaadMetadata {
    component: AcaadComponentMetadata;
    actionable?: boolean;
    queryable?: boolean;
    idempotent: boolean;

    constructor(component: AcaadComponentMetadata, idempotent: boolean, actionable?: boolean, queryable?: boolean) {
        this.component = component;
        this.idempotent = idempotent;
        this.actionable = actionable;
        this.queryable = queryable;
    }
}
