import { Publisher, Subjects, ProductCreatedEvent } from "@datnxtickets/common"

export class ProductCreatedPublisher extends Publisher<ProductCreatedEvent> {
    readonly subject = Subjects.ProductCreated

}
