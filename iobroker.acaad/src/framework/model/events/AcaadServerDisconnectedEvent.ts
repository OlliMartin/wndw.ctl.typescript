import { AcaadEvent, AcaadPopulatedEvent } from "./AcaadEvent";
import { AcaadHost } from "../connection/AcaadHost";

export class AcaadServerDisconnectedEvent extends AcaadEvent implements AcaadPopulatedEvent {
    public static Tag = "AcaadServerDisconnectedEvent";

    public _tag: string = AcaadServerDisconnectedEvent.Tag;

    constructor(public host: AcaadHost) {
        super("internal", "Signaling", AcaadServerDisconnectedEvent.Tag);
    }
}
