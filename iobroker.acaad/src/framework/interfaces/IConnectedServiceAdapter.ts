import Option from "../fp/Option";
import { ComponentDescriptor } from "../model/ComponentDescriptor";
import { AcaadComponentMetadata } from "../model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../model/AcaadUnitOfMeasure";
import { Component } from "../model/Component";

interface IConnectedServiceAdapter {
    getComponentDescriptor(component: unknown): Option<ComponentDescriptor>;

    getComponentDescriptor(metadata: AcaadComponentMetadata): ComponentDescriptor;

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown;

    transformComponentValue(value: Option<unknown>): unknown;

    createComponentModelAsync(component: Component): Promise<void>;

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void>;
}

export default IConnectedServiceAdapter;
