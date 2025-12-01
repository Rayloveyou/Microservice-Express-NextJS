import { Producer, Topics, CartCheckoutEvent } from '@datnxecommerce/common'

export class CartCheckoutProducer extends Producer<CartCheckoutEvent> {
  readonly topic = Topics.CartCheckout
}
