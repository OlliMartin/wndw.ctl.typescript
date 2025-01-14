import { should } from "chai";
import { TestContext } from "@iobroker/testing/build/tests/integration";
import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";

function stateCreationTests(testContext: TestContext) {
    testContext.suite("stateCreation", (getHarness) => {
        let harness: TestHarness;

        before(() => {
            harness = getHarness();
        });

        it("Should work", async () => {
            // Start the adapter and wait until it has started
            await harness.startAdapterAndWait();

            should().not.throw(() => console.log("hi"));
        });
    });
}

export { stateCreationTests };
