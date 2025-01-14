import path from "path";
import { tests } from "@iobroker/testing";
import { runTests } from "./integrationTests/";

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
    controllerVersion: "dev", // 'latest', 'dev' or a specific version like '4.0.23'

    loglevel: "debug",

    defineAdditionalTests({ suite }) {
        runTests(suite);
    },
});