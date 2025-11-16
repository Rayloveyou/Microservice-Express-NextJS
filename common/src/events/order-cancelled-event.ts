import { Subjects } from "./subjects"

export interface OrderCancelledEvent {
    subject: Subjects.OrderCancelled
    data: {
        id: string // orderId
        version: number
        product: {
            id: string // productId
        }
        quantity: number
    }
}