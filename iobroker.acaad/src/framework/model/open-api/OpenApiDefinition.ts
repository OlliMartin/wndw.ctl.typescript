import { PathItemObject } from "./PathItemObject";

export class OpenApiDefinition {
    paths: Record<string, PathItemObject>;

    constructor(paths: Record<string, PathItemObject>) {
        this.paths = paths;
    }
}
