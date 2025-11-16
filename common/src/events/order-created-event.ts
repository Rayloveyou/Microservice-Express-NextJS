import { Subjects } from "./subjects"
import { OrderStatus } from "./types/order-status"

export interface OrderCreatedEvent {
    subject: Subjects.OrderCreated
    data: {
        id: string
        version: number
        status: OrderStatus
        userId: string
        expiredAt: string
        product: {
            id: string
            price: number
        }
        quantity: number
    }
}