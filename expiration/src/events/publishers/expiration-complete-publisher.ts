import { Subjects, Publisher, ExpirationCompleteEvent } from "@datnxtickets/common"

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
    readonly subject = Subjects.ExpirationComplete
}