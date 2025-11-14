import { OrderCancelledEvent, OrderStatus } from "@datnxtickets/common"
import mongoose from "mongoose"
import { Message } from "node-nats-streaming"
import { natsWrapper } from "../../../nats-wrapper"
import { OrderCancelledListener } from "../order-cancelled-listener"
import { Order } from "../../../models/order"

const setup = async () => {
    // Create an instance of the listener
    const listener = new OrderCancelledListener(natsWrapper.client)

    // Create an order and save it to the database
    const order = Order.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        status: OrderStatus.Created,
        price: 10,
        userId: 'asdf',
        version: 0
    })
    await order.save()

    // Create the fake data event
    const data: OrderCancelledEvent['data'] = {
        id: order.id,
        version: 1,
        product: {
            id: 'asdf',
        }
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    
    return { listener, data, msg }
}

it('updates the status of the order', async () => {
    // Object destructuring
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Find the order with the orderId
    const order = await Order.findById(data.id)

    // Expect the order status to be cancelled
    expect(order!.status).toEqual(OrderStatus.Cancelled)
})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure ack function is called
    expect(msg.ack).toHaveBeenCalled()
})