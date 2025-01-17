import { TestContext } from "@iobroker/testing/build/tests/integration";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
// import { createSignalR } from "./mockServices/acaad-signalR-server.ts";
import { createServer } from "@mocks-server/main";
import openApi from "./mocks/routes/open-api";
import collections from "./mocks/collections.ts";
import { TargetService } from "../../src/lib/types";
import { createSignalR, SIGNAL_R_PORT } from "./mockServices/acaad-signalR-server.ts";
import { expect } from "chai";
import { Effect } from "effect";

function stateCreationTests(testContext: TestContext) {
    testContext.suite("stateCreation", (getHarness) => {
        let harness: TestHarness;
        let signalR;

        before(async () => {
            signalR = await createSignalR();

            const mockServerPort = 1337; // TODO: Find first free

            const server = createServer({
                server: {
                    port: mockServerPort,
                },
                mock: {
                    collections: {
                        selected: "positive",
                    },
                },
            });
            await server.start().then(async () => {
                const { loadRoutes, loadCollections } = server.mock.createLoaders();
                loadRoutes(openApi);
                loadCollections(collections);
            });

            harness = getHarness();

            const service: TargetService = {
                host: "localhost",
                port: mockServerPort,
                signalrPort: SIGNAL_R_PORT,
            };

            const adapterConfiguration = {
                targetServices: [service],
            };

            await harness.changeAdapterConfig(harness.adapterName, {
                native: adapterConfiguration,
            });

            await harness.startAdapterAndWait();

            await Effect.runPromise(Effect.sleep(5000));
        });

        after(async () => {
            await signalR.dispose();
        });

        it("should create device-1 metadata", async () => {
            const deviceName = "acaad.0.devices.device-1";

            const cs1 = await harness.objects.getObjectAsync();

            expect(cs1).to.be.not.null;

            const name = await harness.states.getStateAsync(`${deviceName}.name`);
            const version = await harness.states.getStateAsync(`${deviceName}.version`);

            // From open-api definition
            expect(name).to.equal("acaad-device-1");
            expect(version).to.equal("1.0.0");
        });

        it("should create device-2 metadata", async () => {
            const deviceName = "acaad.0.devices.device-2";

            const cs2 = await harness.objects.getObjectAsync(deviceName);
            expect(cs2).to.be.not.null;

            const name = await harness.states.getStateAsync(`${deviceName}.name`);
            const version = await harness.states.getStateAsync(`${deviceName}.version`);

            // From open-api definition
            expect(name).to.equal("another-device-2"); // Name is user-configurable and does not need to follow any sensible pattern
            expect(version).to.equal("1.0.1"); // Assume hotfix or something on ACAAD side.
        });

        it("Should map sensor component", async () => {
            const sensorVal = await harness.objects.getObjectAsync("acaad.0.oma-service-status.Value");
            const sync = await harness.objects.getObjectAsync("acaad.0.oma-service-status.Sync");

            expect(sensorVal).to.be.not.null;
            expect(sync).to.be.not.null;
        });
    });
}

export { stateCreationTests };
