import * as utils from "@iobroker/adapter-core";

import { DependencyContainer } from "tsyringe";
import { FrameworkContainer } from "./framework/FrameworkContainer";
import { IoBrokerCsAdapter } from "./services/IoBroker.ConnectedServiceAdapter";
import IConnectedServiceAdapter from "./framework/interfaces/IConnectedServiceAdapter";
import ComponentManager from "./framework/ComponentManager";
import Option from "./framework/fp/Option";
import { IoBrokerContext } from "./services/IoBroker.Context";
import { IConnectedServiceContext } from "./framework/interfaces/IConnectedServiceContext";

class Acaad extends utils.Adapter {
    private _fwkContainer: DependencyContainer;
    private _componentManager: Option<ComponentManager> = Option.None<ComponentManager>();

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "acaad",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));

        this.on("unload", this.onUnload.bind(this));

        this._fwkContainer = this.createDiContainer();
    }

    private createDiContainer(): DependencyContainer {
        const ioBrokerContext = new IoBrokerContext(this);
        const contextToken = IoBrokerContext.Token;

        return FrameworkContainer.CreateCsContainer<IConnectedServiceAdapter>({
            useClass: IoBrokerCsAdapter,
        })
            .WithContext<IConnectedServiceContext>(contextToken, ioBrokerContext)
            .Build();
    }

    private async onReady(): Promise<void> {
        const instance = this._fwkContainer.resolve(ComponentManager) as ComponentManager;
        this._componentManager = Option.Some(instance);

        await instance.startAsync();
        await instance.createMissingComponentsAsync();
    }

    private async onUnload(callback: () => void): Promise<void> {
        try {
            this.log.info("Stopping");
            await this._componentManager.match(
                (cm) => cm.shutdownAsync(),
                () => Promise.resolve(),
            );

            this._fwkContainer.dispose();
        } finally {
            callback();
        }
    }

    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            this.log.info(`state ${id} deleted`);
        }
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Acaad(options);
} else {
    (() => new Acaad())();
}
