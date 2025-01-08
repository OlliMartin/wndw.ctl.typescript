import { ComponentType } from "./ComponentType";

export class Component {
    type: ComponentType;

    constructor(type: ComponentType) {
        this.type = type;
    }
}
