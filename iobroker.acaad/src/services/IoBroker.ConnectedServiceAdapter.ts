import Option from "../framework/fp/Option";
import IConnectedServiceAdapter from "../framework/interfaces/IConnectedServiceAdapter";
import { AcaadComponentMetadata } from "../framework/model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../framework/model/AcaadUnitOfMeasure";
import { Component } from "../framework/model/Component";
import { ComponentDescriptor } from "../framework/model/ComponentDescriptor";
import { inject, injectable, singleton } from "tsyringe";
import { IoBrokerContext } from "./IoBroker.Context";

@singleton()
@injectable()
export class IoBrokerCsAdapter implements IConnectedServiceAdapter {
    private _ioBrokerContext: IoBrokerContext;

    constructor(@inject(IoBrokerContext.Token) ioBrokerContext: IoBrokerContext) {
        this._ioBrokerContext = ioBrokerContext;
    }

    getComponentDescriptor(component: unknown): Option<ComponentDescriptor> {
        throw new Error("Method not implemented.");
    }

    getComponentDescriptorByMetadata(metadata: AcaadComponentMetadata): ComponentDescriptor {
        throw new Error("Method not implemented.");
    }

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown {
        throw new Error("Method not implemented.");
    }

    transformComponentValue(value: Option<unknown>): unknown {
        throw new Error("Method not implemented.");
    }

    createComponentModelAsync(component: Component): Promise<void> {
        throw new Error("Method not implemented.");
    }

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
