import { should } from "chai";
import { TestContext } from "@iobroker/testing/build/tests/integration";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";
// import { createSignalR } from "./mockServices/acaad-signalR-server.ts";
import { createServer } from "@mocks-server/main";
import openApi from "./mocks/routes/open-api";
import collections from "./mocks/collections.ts";

function stateCreationTests(testContext: TestContext) {
    testContext.suite("stateCreation", (getHarness) => {
        let harness: TestHarness;
        // let signalR;

        before(async () => {
            // signalR = await createSignalR();

            const server = createServer({
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
        });

        after(async () => {
            // await signalR.dispose();
        });

        it("Should map sensor component", async () => {
            // Start the adapter and wait until it has started
            await harness.startAdapterAndWait();
        });
    });
}

export { stateCreationTests };
