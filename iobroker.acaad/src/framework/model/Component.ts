import { ComponentType } from "./ComponentType";
import { AcaadMetadata } from "./AcaadMetadata";
import { Data } from "effect";
import { Option, some, none } from "effect/Option";

export type ComponentTypes = ButtonComponent | SensorComponent | SwitchComponent;

export class Component extends Data.Class<{ type: ComponentType; name: string }> {
    static fromMetadata(metadata: AcaadMetadata): Option<Component> {
        switch (metadata.component.type) {
            case ComponentType.Button:
                return some(ButtonComponent.fromMetadataInternal(metadata));
            case ComponentType.Sensor:
                return some(SensorComponent.fromMetadataInternal(metadata));
            case ComponentType.Switch:
                return some(SwitchComponent.fromMetadataInternal(metadata));
            default:
                return none();
        }
    }
}

export class ButtonComponent extends Component {
    constructor(name: string) {
        super({ type: ComponentType.Button, name });
    }

    public static fromMetadataInternal(metadata: AcaadMetadata): Component {
        return new ButtonComponent(metadata.component.name);
    }
}

export class SensorComponent extends Component {
    constructor(name: string) {
        super({ type: ComponentType.Sensor, name });
    }

    public static fromMetadataInternal(metadata: AcaadMetadata): SensorComponent {
        return new SensorComponent(metadata.component.name);
    }
}

export class SwitchComponent extends Component {
    constructor(name: string) {
        super({ type: ComponentType.Switch, name });
    }

    public static fromMetadataInternal(metadata: AcaadMetadata): SwitchComponent {
        return new SwitchComponent(metadata.component.name);
    }
}
