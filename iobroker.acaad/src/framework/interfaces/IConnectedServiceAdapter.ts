import { ComponentDescriptor } from "../model/ComponentDescriptor";
import { AcaadComponentMetadata } from "../model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../model/AcaadUnitOfMeasure";
import { Component } from "../model/Component";
import { AcaadHost } from "../model/connection/AcaadHost";
import { Option } from "fp-ts/Option";
import { TaskEither } from "fp-ts/TaskEither";
import { AcaadError } from "../errors/AcaadError";

interface IConnectedServiceAdapter {
    getComponentDescriptor(component: unknown): Option<ComponentDescriptor>;

    getComponentDescriptorByMetadata(metadata: AcaadComponentMetadata): ComponentDescriptor;

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown;

    transformComponentValue(value: Option<unknown>): unknown;

    createComponentModelAsync(component: Component): Promise<void>;

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void>;

    getConnectedServerAsync(): TaskEither<AcaadError, AcaadHost>;
}

export default IConnectedServiceAdapter;
