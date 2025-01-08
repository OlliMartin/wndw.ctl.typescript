import * as utils from "@iobroker/adapter-core";
import "reflect-metadata";
import { container } from "tsyringe";
import { TestService } from "./services/TestService";

class Acaad extends utils.Adapter {
    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "acaad",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));

        this.on("unload", this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        this.log.info("config option1: " + this.config.option1);
        this.log.info("config option2: " + this.config.option2);

        const instance = container.resolve(TestService) as TestService;
        instance.LogSomething(this.log);

        /*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
        await this.setObjectNotExistsAsync("testVariable", {
            type: "state",
            common: {
                name: "testVariable",
                type: "boolean",
                role: "indicator",
                read: true,
                write: true,
            },
            native: {},
        });

        this.subscribeStates("testVariable");
        await this.setStateAsync("testVariable", true);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
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
