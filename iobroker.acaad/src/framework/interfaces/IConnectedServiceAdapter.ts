import { ComponentDescriptor } from "../model/ComponentDescriptor";
import { AcaadComponentMetadata } from "../model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../model/AcaadUnitOfMeasure";
import { Component } from "../model/Component";
import { AcaadHost } from "../model/connection/AcaadHost";

import { AcaadError } from "../errors/AcaadError";
import { Effect } from "effect";
import { Option } from "effect/Option";

interface IConnectedServiceAdapter {
    getComponentDescriptor(component: unknown): Option<ComponentDescriptor>;

    getComponentDescriptorByMetadata(metadata: AcaadComponentMetadata): ComponentDescriptor;

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown;

    transformComponentValue(value: Option<unknown>): unknown;

    createComponentModelAsync(component: Component): Promise<void>;

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void>;

    getConnectedServerAsync(): Effect.Effect<AcaadHost, AcaadError>;
}

export default IConnectedServiceAdapter;
