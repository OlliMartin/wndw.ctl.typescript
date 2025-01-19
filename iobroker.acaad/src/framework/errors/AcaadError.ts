export class AcaadError {
    public _tag: string = "AcaadError";

    constructor(
        public error: any,
        public message?: string,
    ) {}
}
