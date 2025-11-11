import { Subjects } from "./subjects"


//interface to define the structure of the event of type product:created
export interface ProductCreatedEvent {
    subject: Subjects.ProductCreated
    data: {
        id: string
        title: string
        price: number
        // userId: string
    }
}