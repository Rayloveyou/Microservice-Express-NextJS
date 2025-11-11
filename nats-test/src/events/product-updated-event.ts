import { Subjects } from "./subjects"

//interface to define the structure of the event of type product:updated
export interface ProductUpdatedEvent {
    subject: Subjects.ProductUpdated
    data: {
        id: string
        title: string
        price: number
        userId: string
    }
}