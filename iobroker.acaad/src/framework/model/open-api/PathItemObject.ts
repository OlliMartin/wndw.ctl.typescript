import { OperationObject } from "./OperationObject";
import { AcaadMetadata } from "../AcaadMetadata";
import { pipe, Stream } from "effect";

export class PathItemObject {
    public get?: OperationObject;
    public post?: OperationObject;

    constructor(get?: OperationObject, post?: OperationObject) {
        this.get = get;
        this.post = post;
    }
}

export function getAcaadMetadata(pathItemObject: PathItemObject): Stream.Stream<AcaadMetadata> {
    return pipe(
        Stream.fromIterable([pathItemObject.get, pathItemObject.post]),
        Stream.filter((op) => !!op?.acaad),
        Stream.map((op) => (op as OperationObject).acaad as AcaadMetadata),
    );
}
