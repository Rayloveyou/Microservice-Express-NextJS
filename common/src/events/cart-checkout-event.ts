import { Subjects } from "./subjects"

export interface CartCheckoutEvent {
    subject: Subjects.CartCheckout
    data: {
        userId: string
        items: {
            productId: string
            quantity: number
        }[]
    }
}
