import { Cause } from "effect";

export interface ICsLogger {
    logTrace(...data: any[]): void;

    logDebug(...data: any[]): void;

    logInformation(...data: any[]): void;

    logWarning(...data: any[]): void;

    logError(cause?: Cause.Cause<unknown>, error?: Error, ...data: any[]): void;
}

export interface IConnectedServiceContext {
    logger: ICsLogger;
}
