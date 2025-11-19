import { Topics } from "./topics"


//interface to define the structure of the event of type product.created
export interface ProductCreatedEvent {
    topic: Topics.ProductCreated
    data: {
        id: string
        version: number
        title: string
        price: number
        userId: string
        quantity: number
        imageUrl?: string
    }
}
