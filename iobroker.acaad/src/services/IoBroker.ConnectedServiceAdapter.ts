import IConnectedServiceAdapter, {
    OutboundStateChangeCallback,
} from "../framework/interfaces/IConnectedServiceAdapter";
import { AcaadUnitOfMeasure } from "../framework/model/AcaadUnitOfMeasure";
import { Component, ComponentTypes } from "../framework/model/Component";
import { ComponentDescriptor } from "../framework/model/ComponentDescriptor";
import { inject, injectable, singleton } from "tsyringe";
import { IoBrokerContext } from "./IoBroker.Context";
import { AcaadHost } from "../framework/model/connection/AcaadHost";
import { AcaadAuthentication } from "../framework/model/auth/AcaadAuthentication";
import { AcaadError } from "../framework/errors/AcaadError";
import { Effect } from "effect";
import { Option } from "effect/Option";
import { ComponentType } from "../framework/model/ComponentType";
import { Actions } from "./IoBroker.Constants";

@singleton()
@injectable()
export class IoBrokerCsAdapter implements IConnectedServiceAdapter {
    private _ioBrokerContext: IoBrokerContext;

    constructor(@inject(IoBrokerContext.Token) ioBrokerContext: IoBrokerContext) {
        this._ioBrokerContext = ioBrokerContext;
    }

    getAllowedConcurrency(): number {
        return 2;
    }

    getConnectedServerAsync(): Effect.Effect<AcaadHost, AcaadError> {
        const authentication = new AcaadAuthentication("host", "your-username", "your-password", []);
        const host = new AcaadHost("192.168.178.50", 5000, authentication);
        // const host = new AcaadHost("192.168.178.50", 443, authentication);

        return Effect.succeed(host);
    }

    getComponentDescriptor(component: unknown): Option<ComponentDescriptor> {
        throw new Error("Method not implemented.");
    }

    getComponentDescriptorByComponent(component: Component): ComponentDescriptor {
        const escapedName = this._ioBrokerContext.escapeComponentName(component.name);

        // Put into correct subgroup and stuff
        return new ComponentDescriptor(escapedName);
    }

    transformUnitOfMeasure(uom: AcaadUnitOfMeasure): unknown {
        throw new Error("Method not implemented.");
    }

    transformComponentValue(value: Option<unknown>): unknown {
        throw new Error("Method not implemented.");
    }

    async createComponentModelAsync(component: Component): Promise<void> {
        const componentDescriptor = this.getComponentDescriptorByComponent(component);

        const { id: deviceId } = await this._ioBrokerContext.extendObjectAsync(componentDescriptor.toIdentifier(), {
            type: "device",
            common: {
                name: component.type,
            },
        });

        await this._ioBrokerContext.addObjectAsync(deviceId, component);

        const stateResult = await Promise.all(
            this.handleComponent(component).map(({ _id: stateId, ...ioBrokerObject }) =>
                this._ioBrokerContext.extendObjectAsync(`${deviceId}.${stateId}`, ioBrokerObject),
            ),
        );

        await Promise.all(
            stateResult.map(({ id: stateId }) => this._ioBrokerContext.addObjectAsync(stateId, component)),
        );
    }

    async registerStateChangeCallbackAsync(cb: OutboundStateChangeCallback): Promise<void> {
        await this._ioBrokerContext.registerStateChangeCallbackAsync(cb);
    }

    updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void> {
        throw new Error("Method not implemented.");
    }

    handleComponent(component: ComponentTypes): ioBroker.PartialObject[] {
        switch (component.type) {
            case ComponentType.Button:
                return [
                    {
                        _id: Actions.Trigger,
                        type: "state",
                        common: {
                            type: "boolean",
                            role: "button",
                            read: false,
                            write: true,
                        },
                    },
                ];
            case ComponentType.Sensor:
                return [
                    {
                        _id: "Value",
                        type: "state",
                        common: {
                            type: "number", // TODO -> Only user knows
                            role: "state",
                            read: true,
                            write: false,
                        },
                    },
                    {
                        _id: Actions.Sync,
                        type: "state",
                        common: {
                            type: "boolean",
                            role: "button",
                            read: false,
                            write: true,
                            name: "Trigger Sync",
                        },
                    },
                ];
            case ComponentType.Switch:
                return [
                    {
                        _id: Actions.Switch,
                        type: "state",
                        common: {
                            type: "boolean",
                            read: true,
                            write: true,
                            role: "switch",
                        },
                    },
                    {
                        _id: Actions.Sync,
                        type: "state",
                        common: {
                            type: "boolean",
                            role: "button",
                            read: false,
                            write: true,
                            name: "Trigger Sync",
                        },
                    },
                ];
        }
    }
}
