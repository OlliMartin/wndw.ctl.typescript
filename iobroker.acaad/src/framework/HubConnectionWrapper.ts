import { HubConnection, HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";
import { AcaadPopulatedEvent } from "./model/events/AcaadEvent";
import { AcaadHost } from "./model/connection/AcaadHost";
import { Effect, Exit, Fiber, Option, Queue, Schedule } from "effect";
import { RuntimeFiber } from "effect/Fiber";
import { ICsLogger } from "./interfaces/IConnectedServiceContext";
import { isObject } from "effect/Predicate";
import { AcaadServerUnreachableError } from "./errors/AcaadServerUnreachableError";
import { CalloutError } from "./errors/CalloutError";
import { ParseError } from "effect/ParseResult";
import { EventFactory } from "./model/factories/EventFactory";
import { AcaadServerConnectedEvent } from "./model/events/AcaadServerConnectedEvent";
import { AcaadServerDisconnectedEvent } from "./model/events/AcaadServerDisconnectedEvent";

const CONST = {
    EVENT_HUB_PATH: "events",
    RECEIVE_EVENTS_METHOD: "receiveEvent",
};

const isServerUnavailable = (err: unknown): boolean => {
    return isObject(err) && "errorType" in err && err.errorType === "FailedToNegotiateWithServerError";
};

// noinspection JSPotentiallyInvalidUsageOfClassThis
export class HubConnectionWrapper {
    private hubConnection: HubConnection;
    private reconnectFiber: RuntimeFiber<number, never>;

    constructor(
        public host: AcaadHost,
        private eventQueue: Queue.Queue<AcaadPopulatedEvent>,
        private logger: ICsLogger,
    ) {
        const signalrUrl = host.appendSignalR(CONST.EVENT_HUB_PATH);

        const hubConnection = new HubConnectionBuilder().withUrl(signalrUrl).build();

        hubConnection.on(CONST.RECEIVE_EVENTS_METHOD, this.buildEventCallback(host));
        hubConnection.onclose(() => Effect.runSync(this.raiseHubStoppedEvent(host)));

        this.hubConnection = hubConnection;

        const reconnectEff = this.tryReconnectEff.pipe(Effect.repeat(Schedule.fixed(5_000)));
        this.reconnectFiber = Effect.runSync(Effect.forkDaemon(reconnectEff));
    }

    private tryReconnectEff = Effect.gen(this, function* () {
        if (
            this.hubConnection.state === HubConnectionState.Connected ||
            this.hubConnection.state === HubConnectionState.Connecting
        ) {
            return;
        }

        this.logger.logTrace(`Attempting to reconnect to '${this.host.friendlyName}'.`);
        yield* Effect.either(this.startEff);
    });

    public startEff = Effect.gen(this, function* () {
        yield* Effect.tryPromise({
            try: async (_) => {
                await this.hubConnection.start();
            },
            catch: (err) => {
                if (isServerUnavailable(err)) {
                    return new AcaadServerUnreachableError(this.host, err);
                }

                return new CalloutError("An unexpected error occurred starting hub connection", err);
            },
        });

        yield* this.raiseHubStartedEvent(this.host);
    });

    private buildEventCallback(host: AcaadHost): (event: unknown) => Promise<void> {
        return async (event: unknown) => {
            const result = await Effect.runPromiseExit(this.onEventEff(host, event));

            Exit.match(result, {
                onFailure: (cause) =>
                    this.logger.logError(cause, undefined, `An error occurred processing inbound event.`),
                onSuccess: (res) => {
                    this.logger.logTrace(`Successfully processed/enqueued event ${res}.`);
                },
            });
        };
    }

    private onEventEff(host: AcaadHost, eventUntyped: unknown): Effect.Effect<void, ParseError> {
        return Effect.gen(this, function* () {
            const event = yield* EventFactory.createEvent(eventUntyped);

            if (Option.isSome(event)) {
                yield* Queue.offer(this.eventQueue, { ...event.value, host });
            }

            return Effect.void;
        });
    }

    private raiseHubStartedEvent(host: AcaadHost): Effect.Effect<boolean> {
        return this.eventQueue.offer(new AcaadServerConnectedEvent(host));
    }

    private raiseHubStoppedEvent(host: AcaadHost): Effect.Effect<boolean> {
        return this.eventQueue.offer(new AcaadServerDisconnectedEvent(host));
    }

    public stopHubConnection = Effect.gen(this, function* () {
        if (!this.hubConnection) {
            return;
        }

        yield* Fiber.interrupt(this.reconnectFiber);

        yield* Effect.tryPromise({
            try: () => this.hubConnection.stop(),
            catch: (err) => new CalloutError("Error stopping hub connection", err),
        });

        this.logger.logInformation(`Shut down hub connection to server ${this.host.friendlyName}.`);
    });
}
