import { ComponentType } from "./ComponentType";
import { AcaadMetadata } from "./AcaadMetadata";
import { Chunk, Data, Schema } from "effect";
import { Option, some, none } from "effect/Option";
import { AcaadPopulatedMetadata, AcaadServerMetadata } from "./open-api/OpenApiDefinition";

export type ComponentTypes = ButtonComponent | SensorComponent | SwitchComponent;

export const ComponentSchema = Schema.Struct({
    type: Schema.Enums(ComponentType),
    name: Schema.String,
});

export class Component extends Data.Class<{
    type: ComponentType;
    name: string;
    serverMetadata: AcaadServerMetadata;
    metadata: Chunk.Chunk<AcaadPopulatedMetadata>;
}> {
    // TODO: Let CS decide how the component is created?
    static fromMetadata(metadata: Chunk.Chunk<AcaadPopulatedMetadata>): Option<Component> {
        const tmpArray = Chunk.toArray(metadata);
        const first = tmpArray[0];

        switch (first.component.type) {
            case ComponentType.Button:
                return some(ButtonComponent.fromMetadataInternal(first.component.name, first.serverMetadata, metadata));
            case ComponentType.Sensor:
                return some(SensorComponent.fromMetadataInternal(first.component.name, first.serverMetadata, metadata));
            case ComponentType.Switch:
                return some(SwitchComponent.fromMetadataInternal(first.component.name, first.serverMetadata, metadata));
            default:
                return none();
        }
    }
}

export class ButtonComponent extends Component {
    constructor(name: string, serverMetadata: AcaadServerMetadata, metadata: Chunk.Chunk<AcaadPopulatedMetadata>) {
        super({ type: ComponentType.Button, name, serverMetadata, metadata });
    }

    public static fromMetadataInternal(
        name: string,
        serverMetadata: AcaadServerMetadata,
        metadata: Chunk.Chunk<AcaadPopulatedMetadata>,
    ): Component {
        return new ButtonComponent(name, serverMetadata, metadata);
    }
}

export class SensorComponent extends Component {
    constructor(name: string, serverMetadata: AcaadServerMetadata, metadata: Chunk.Chunk<AcaadPopulatedMetadata>) {
        super({ type: ComponentType.Sensor, name, serverMetadata, metadata });
    }

    public static fromMetadataInternal(
        name: string,
        serverMetadata: AcaadServerMetadata,
        metadata: Chunk.Chunk<AcaadPopulatedMetadata>,
    ): Component {
        return new SensorComponent(name, serverMetadata, metadata);
    }
}

export class SwitchComponent extends Component {
    constructor(name: string, serverMetadata: AcaadServerMetadata, metadata: Chunk.Chunk<AcaadPopulatedMetadata>) {
        super({ type: ComponentType.Switch, name, serverMetadata, metadata });
    }

    public static fromMetadataInternal(
        name: string,
        serverMetadata: AcaadServerMetadata,
        metadata: Chunk.Chunk<AcaadPopulatedMetadata>,
    ): Component {
        return new SwitchComponent(name, serverMetadata, metadata);
    }
}
