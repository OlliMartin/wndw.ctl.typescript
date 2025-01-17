import { TestContext } from "@iobroker/testing/build/tests/integration";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
// import { createSignalR } from "./mockServices/acaad-signalR-server.ts";
import { createServer } from "@mocks-server/main";
import openApi from "./mocks/routes/open-api";
import collections from "./mocks/collections.ts";
import { TargetService } from "../../src/lib/types";
import { createSignalR, SIGNAL_R_PORT } from "./mockServices/acaad-signalR-server.ts";

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
        });

        after(async () => {
            await signalR.dispose();
        });

        it("Should map sensor component", async () => {
            await harness.startAdapterAndWait();
        });
    });
}

export { stateCreationTests };
