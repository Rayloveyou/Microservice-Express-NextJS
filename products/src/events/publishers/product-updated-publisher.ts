import { Publisher, Subjects, ProductUpdatedEvent } from "@datnxecommerce/common"

export class ProductUpdatedPublisher extends Publisher<ProductUpdatedEvent> {
    readonly subject = Subjects.ProductUpdated

}
