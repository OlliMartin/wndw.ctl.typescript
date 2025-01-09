import { IConnectedServiceContext, ICsLogger } from "../framework/interfaces/IConnectedServiceContext";
import IoBrokerLogger from "./IoBroker.Logger";
import { injectable } from "tsyringe";

@injectable()
export class IoBrokerContext implements IConnectedServiceContext {
    public static Token = "di-IoBrokerContext";

    public logger: ICsLogger;

    constructor(adapter: ioBroker.Adapter) {
        this.logger = new IoBrokerLogger(adapter);
    }
}
