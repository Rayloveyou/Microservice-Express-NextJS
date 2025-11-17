import { Subjects } from "./subjects"

export interface OrderCancelledEvent {
    subject: Subjects.OrderCancelled
    data: {
        id: string // orderId
        version: number
        items: {
            productId: string
            quantity: number
        }[]
        total: number
    }
}