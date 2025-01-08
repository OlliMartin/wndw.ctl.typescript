import { AcaadUnitOfMeasure } from "./AcaadUnitOfMeasure";

export class AcaadDataMetadata {
    unitOfMeasureHint?: AcaadUnitOfMeasure;

    constructor(unitOfMeasureHint?: AcaadUnitOfMeasure) {
        this.unitOfMeasureHint = unitOfMeasureHint;
    }
}
