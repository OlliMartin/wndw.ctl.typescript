export class AcaadEvent {
    eventType: string;
    name: string;
    componentName: string;

    constructor(eventType: string, name: string, componentName: string) {
        this.eventType = eventType;
        this.name = name;
        this.componentName = componentName;
    }
}
