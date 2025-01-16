// start.ts
import { createServerSignalr } from "@fakehost/signalr/server";
import { FakeSignalrHub } from "@fakehost/signalr";

const PORT = process.env.SIGNALR_PORT ? parseInt(process.env.SIGNALR_PORT) : 5000;

type EventService = {};

export const fakeEventService = new FakeSignalrHub<EventService>("/events");

export function createSignalR() {
    return createServerSignalr<EventService>({
        port: PORT,
        hubs: { fakeEventService },
        name: "events",
    });
}
