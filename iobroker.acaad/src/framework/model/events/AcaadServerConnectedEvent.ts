import { AcaadEvent, AcaadPopulatedEvent } from "./AcaadEvent";
import { AcaadHost } from "../connection/AcaadHost";

export class AcaadServerConnectedEvent extends AcaadEvent implements AcaadPopulatedEvent {
    public static Tag = "AcaadServerConnectedEvent";

    public _tag: string = AcaadServerConnectedEvent.Tag;

    constructor(public host: AcaadHost) {
        super("internal", "Signaling", AcaadServerConnectedEvent.Tag);
    }
}
