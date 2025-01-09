import IConnectedServiceAdapter from "../framework/interfaces/IConnectedServiceAdapter";
import { AcaadComponentMetadata } from "../framework/model/AcaadComponentManager";
import { AcaadUnitOfMeasure } from "../framework/model/AcaadUnitOfMeasure";
import { Component } from "../framework/model/Component";
import { ComponentDescriptor } from "../framework/model/ComponentDescriptor";
import { inject, injectable, singleton } from "tsyringe";
import { IoBrokerContext } from "./IoBroker.Context";
import { AcaadHost } from "../framework/model/connection/AcaadHost";
import { AcaadAuthentication } from "../framework/model/auth/AcaadAuthentication";
import { AcaadError } from "../framework/errors/AcaadError";
import { pipe, Effect } from "effect";
import { Option } from "effect/Option";

@singleton()
@injectable()
export class IoBrokerCsAdapter implements IConnectedServiceAdapter {
    private _ioBrokerContext: IoBrokerContext;

    constructor(@inject(IoBrokerContext.Token) ioBrokerContext: IoBrokerContext) {
        this._ioBrokerContext = ioBrokerContext;
    }

    getConnectedServerAsync(): Effect.Effect<AcaadHost, AcaadError> {
        const authentication = new AcaadAuthentication("host", "your-username", "your-password", []);
        const host = new AcaadHost("192.168.178.50", 5000, authentication);

        return Effect.succeed(host);
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
