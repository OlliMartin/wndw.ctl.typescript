import IConnectedServiceAdapter, {
    OutboundStateChangeCallback,
} from "../framework/interfaces/IConnectedServiceAdapter";
import { AcaadUnitOfMeasure } from "../framework/model/AcaadUnitOfMeasure";
import { Component, ComponentTypes } from "../framework/model/Component";
import { ComponentDescriptor } from "../framework/model/ComponentDescriptor";
import { inject, injectable, singleton } from "tsyringe";
import { IoBrokerContext } from "./IoBroker.Context";
import { AcaadHost } from "../framework/model/connection/AcaadHost";
import { AcaadError } from "../framework/errors/AcaadError";
import { Effect } from "effect";
import { Option } from "effect/Option";
import { ComponentType } from "../framework/model/ComponentType";
import { Actions } from "./IoBroker.Constants";
import { AcaadOutcome } from "../framework/model/AcaadOutcome";
import { ConfigurationError } from "../framework/errors/ConfigurationError";
import DependencyInjectionTokens from "../framework/model/DependencyInjectionTokens";
import { ICsLogger } from "../framework/interfaces/IConnectedServiceContext";

@singleton()
@injectable()
export class IoBrokerCsAdapter implements IConnectedServiceAdapter {
    private _ioBrokerContext: IoBrokerContext;
    private _logger: ICsLogger;

    constructor(
        @inject(IoBrokerContext.Token) ioBrokerContext: IoBrokerContext,
        @inject(DependencyInjectionTokens.Logger) logger: ICsLogger,
    ) {
        this._ioBrokerContext = ioBrokerContext;
        this._logger = logger;
    }

    getAllowedConcurrency(): number {
        return 2;
    }

    getConnectedServersAsync(): Effect.Effect<AcaadHost[], AcaadError> {
        const hosts = this._ioBrokerContext.getConfiguredServers();

        return hosts.length > 0
            ? Effect.succeed(hosts)
            : Effect.fail(new ConfigurationError("No hosts configured. Stopping."));
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

    async updateComponentStateAsync(cd: ComponentDescriptor, obj: unknown): Promise<void> {
        // Identifier can be discovered through cd.type inspection? Does this make sense?
        const stateId = `${cd.toIdentifier()}.Value`;

        await this._ioBrokerContext.setStateAsync(stateId, {
            val: (obj as AcaadOutcome)?.outcomeRaw ?? "",
        });
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

        await Promise.all(
            this.handleComponent(component).map(async ({ _id: idSuffix, ...ioBrokerObject }) => {
                const sId = `${deviceId}.${idSuffix}`;
                this._logger.logDebug(`Extending object with identifier '${sId}'.`);
                const { id: stateId } = await this._ioBrokerContext.extendObjectAsync(sId, ioBrokerObject);
                await this._ioBrokerContext.addObjectAsync(stateId, component);
            }),
        );
    }

    async registerStateChangeCallbackAsync(cb: OutboundStateChangeCallback): Promise<void> {
        await this._ioBrokerContext.registerStateChangeCallbackAsync(cb);
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
                            type: "string", // TODO -> Only user knows
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
