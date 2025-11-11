import { Publisher, Subjects, ProductUpdatedEvent } from "@datnxtickets/common"

export class ProductUpdatedPublisher extends Publisher<ProductUpdatedEvent> {
    readonly subject = Subjects.ProductUpdated

}
