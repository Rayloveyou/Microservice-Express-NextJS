import { Topics } from './topics'

export interface OrderCancelledEvent {
  topic: Topics.OrderCancelled
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
