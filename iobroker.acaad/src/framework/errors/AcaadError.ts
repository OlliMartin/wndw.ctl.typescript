export abstract class AcaadError {
    abstract readonly _tag: string;

    constructor(public error: any) {}
}
