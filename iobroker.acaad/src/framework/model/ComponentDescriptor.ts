export class ComponentDescriptor {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    public toIdentifier(): string {
        return this.name;
    }
}
