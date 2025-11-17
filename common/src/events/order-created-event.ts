import { Subjects } from "./subjects"
import { OrderStatus } from "./types/order-status"

export interface OrderCreatedEvent {
    subject: Subjects.OrderCreated
    data: {
        id: string
        version: number
        status: OrderStatus
        userId: string
        items: {
            productId: string
            price: number
            quantity: number
            title: string
        }[]
        total: number
    }
}