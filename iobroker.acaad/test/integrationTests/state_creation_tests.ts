import { expect } from "chai";

function stateCreationTests(suite) {
    suite("stateCreation", (getHarness) => {
        let harness;

        before(() => {
            harness = getHarness();
        });

        it("Should work", async () => {
            // Start the adapter and wait until it has started
            await harness.startAdapterAndWait();

            // Perform the actual test:
            harness.sendTo("adapter.0", "test", "message", (resp) => {
                console.dir(resp);
            });
        });
    });
}

export { stateCreationTests };
