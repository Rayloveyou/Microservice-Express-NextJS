import { Publisher, Subjects, CartCheckoutEvent } from '@datnxecommerce/common'

export class CartCheckoutPublisher extends Publisher<CartCheckoutEvent> {
    subject: Subjects.CartCheckout = Subjects.CartCheckout
}
