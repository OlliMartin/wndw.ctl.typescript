import { singleton } from "tsyringe";
import Logger = ioBroker.Logger;

@singleton()
class TestService {
    LogSomething(log: Logger): void {
        log.info("Hello world!");
    }
}

export { TestService };
