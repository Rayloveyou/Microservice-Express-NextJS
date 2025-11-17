import { Publisher, Subjects, ProductCreatedEvent } from "@datnxecommerce/common"

export class ProductCreatedPublisher extends Publisher<ProductCreatedEvent> {
    readonly subject = Subjects.ProductCreated

}
