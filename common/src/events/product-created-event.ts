import { Subjects } from "./subjects"


//interface to define the structure of the event of type product:created
export interface ProductCreatedEvent {
    subject: Subjects.ProductCreated
    data: {
        id: string
        version: number
        title: string
        price: number
        userId: string
    }
}