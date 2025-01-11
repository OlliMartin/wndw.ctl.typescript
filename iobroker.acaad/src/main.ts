import * as utils from "@iobroker/adapter-core";

import { DependencyContainer } from "tsyringe";
import { FrameworkContainer } from "./framework/FrameworkContainer";
import { IoBrokerCsAdapter } from "./services/IoBroker.ConnectedServiceAdapter";
import IConnectedServiceAdapter from "./framework/interfaces/IConnectedServiceAdapter";
import ComponentManager from "./framework/ComponentManager";

import { IoBrokerContext } from "./services/IoBroker.Context";
import { IConnectedServiceContext } from "./framework/interfaces/IConnectedServiceContext";
import { Option, pipe } from "effect";

class Acaad extends utils.Adapter {
    private _fwkContainer: DependencyContainer;
    private _componentManager: Option.Option<ComponentManager> = Option.none();

    // Not using Option here for performance reasons.
    private _context: IoBrokerContext | null = null;

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
        this._componentManager = Option.some(instance);

        await instance.createMissingComponentsAsync();
        await instance.startAsync();
    }

    private async onUnload(callback: () => void): Promise<void> {
        try {
            // TODO: Add AbortController+Signal to limit shutdown duration, if necessary force-stop.

            await pipe(
                this._componentManager,
                Option.match({
                    onSome: (cm) => cm.shutdownAsync(), // TODO: Add timeout
                    onNone: () => Promise.resolve(),
                }),
            );
        } finally {
            this._fwkContainer.dispose();
            callback();
        }
    }

    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        await (this._context ??= this._fwkContainer.resolve(
            IoBrokerContext.Token,
        ) as IoBrokerContext).onStateChangeAsync(id, state);
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Acaad(options);
} else {
    (() => new Acaad())();
}
