import { Topics } from "./topics"

//interface to define the structure of the event of type product.updated
export interface ProductUpdatedEvent {
    topic: Topics.ProductUpdated
    data: {
        id: string
        version: number
        title: string
        price: number
        userId: string
        quantity: number
        imageUrl?: string
        orderId?: string // Optional field
    }
}
