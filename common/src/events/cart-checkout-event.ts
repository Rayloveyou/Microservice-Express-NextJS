import { Topics } from "./topics"

export interface CartCheckoutEvent {
    topic: Topics.CartCheckout
    data: {
        userId: string
        items: {
            productId: string
            quantity: number
        }[]
    }
}
