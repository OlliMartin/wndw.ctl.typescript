import { AcaadMetadata } from "../AcaadMetadata";

export class OperationObject {
    public acaad?: AcaadMetadata;

    constructor(acaad?: AcaadMetadata) {
        this.acaad = acaad;
    }
}
