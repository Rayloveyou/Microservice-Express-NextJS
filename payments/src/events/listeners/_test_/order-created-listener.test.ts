import { OrderCreatedEvent, OrderStatus } from "@datnxtickets/common"
import mongoose from "mongoose"
import { Message } from "node-nats-streaming"
import { natsWrapper } from "../../../nats-wrapper"
import { OrderCreatedListener } from "../order-created-listener"
import { Order } from "../../../models/order"

const setup = async () => {
    // Create an instance of the listener
    const listener = new OrderCreatedListener(natsWrapper.client)

    // Create the fake data event
    const data: OrderCreatedEvent['data'] = {
        id: new mongoose.Types.ObjectId().toHexString(),
        version: 0,
        status: OrderStatus.Created,
        userId: 'asdf',
        expiresAt: 'asdf',
        product: {
            id: new mongoose.Types.ObjectId().toHexString(),
            price: 10
        }
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('replicates the order info', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    const order = await Order.findById(data.id)

    expect(order!.price).toEqual(data.product.price)
})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure ack function is called
    expect(msg.ack).toHaveBeenCalled()
})