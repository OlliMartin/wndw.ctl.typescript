import { IConnectedServiceContext, ICsLogger } from "../framework/interfaces/IConnectedServiceContext";
import IoBrokerLogger from "./IoBroker.Logger";
import { injectable } from "tsyringe";
import { Component } from "../framework/model/Component";
import { Mutex } from "async-mutex";
import { ChangeType, OutboundStateChangeCallback } from "../framework/interfaces/IConnectedServiceAdapter";
import { Option } from "effect";
import { Actions } from "./IoBroker.Constants";
import { isNull, isObject, isUndefined } from "effect/Predicate";
import { isNullOrUndefined } from "../framework/utils/Checks";

@injectable()
export class IoBrokerContext implements IConnectedServiceContext {
    public static Token = "di-IoBrokerContext";

    public logger: ICsLogger;

    private _adapter: ioBroker.Adapter;

    private readonly mutex = new Mutex();
    private _componentState: Record<string, Component> = {};

    private _outboundStateChangeCallback: OutboundStateChangeCallback | null = null;

    constructor(adapter: ioBroker.Adapter) {
        this.logger = new IoBrokerLogger(adapter);
        this._adapter = adapter;
    }

    async extendObjectAsync(
        objectIdentifier: string,
        partialObject: ioBroker.PartialObject,
    ): ioBroker.SetObjectPromise {
        return await this._adapter.extendObject(objectIdentifier, partialObject);
    }

    async registerStateChangeCallbackAsync(cb: OutboundStateChangeCallback): Promise<void> {
        const release = await this.mutex.acquire();

        try {
            this._adapter.subscribeStates(`${this._adapter.namespace}.*`);
            this._outboundStateChangeCallback = cb;
        } finally {
            release();
        }
    }

    async onStateChangeAsync(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        const triggeredForComponent: Component | undefined | null = this._componentState[id];

        if (!triggeredForComponent) {
            this.logger.logWarning(`State change for unknown component with id ${id}`);
            return;
        }

        if (state?.ack === true) {
            return;
        }

        if (!this._outboundStateChangeCallback) {
            this.logger.logWarning(`State change for component ${triggeredForComponent.name} but no callback set.`);
            return;
        }

        const changeType = this.getChangeType(id);

        if (!changeType) {
            this.logger.logDebug(
                `Change type for state ${id} could not be determined. Assuming user-defined state and doing nothing.`,
            );
            return;
        }

        const triggerVal: Option.Option<unknown> = isNullOrUndefined(state?.val)
            ? Option.none()
            : Option.some(state?.val);

        await this._outboundStateChangeCallback(triggeredForComponent, changeType, triggerVal);
    }

    // Hooray for nested ternaries!
    // TODO: Use regex.. map from group 1..
    private getChangeType(id: string): ChangeType | null {
        return id.endsWith(`.${Actions.Sync}`)
            ? "query"
            : id.endsWith(`.${Actions.Switch}`) || id.endsWith(`.${Actions.Trigger}`)
              ? "action"
              : null;
    }

    async addObjectAsync(objectIdentifier: string, component: Component): Promise<void> {
        const release = await this.mutex.acquire();
        try {
            if (!this._componentState[objectIdentifier]) {
                this._componentState[objectIdentifier] = component;
                return;
            }

            throw new Error(
                `Component with identifier ${objectIdentifier} already exists. This is invalid and might happen if components contain forbidden characters and are not unique anymore after stripping. Check the configuration on ACAAD side.`,
            );
        } finally {
            release();
        }
    }

    escapeComponentName(name: string): string {
        return name.replaceAll(this._adapter.FORBIDDEN_CHARS, "");
    }
}
