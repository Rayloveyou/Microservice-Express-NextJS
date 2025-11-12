import { ExpirationCompleteListener } from "../expiration-complete-listener"
import { natsWrapper } from "../../../nats-wrapper"
import { ExpirationCompleteEvent, OrderStatus } from "@datnxtickets/common"
import mongoose from "mongoose"
import { Order } from "../../../models/order"
import { Product } from "../../../models/product"
import { Message } from "node-nats-streaming"

const setup = async () => {
    // Create an instance of the listener
    const listener = new ExpirationCompleteListener(natsWrapper.client)

    // Create and save a product
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'concert',
        price: 20,
    })
    await product.save()

    // Create and save an order
    const order = Order.build({
        status: OrderStatus.Created,
        userId: 'asdf',
        expiresAt: new Date(),
        product,
    })
    await order.save()

    // Create a fake data event
    const data: ExpirationCompleteEvent['data'] = {
        orderId: order.id,
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('updates the order status to cancelled', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Find the order with the orderId
    const updatedOrder = await Order.findById(data.orderId)

    // Expect the order status to be cancelled
    expect(updatedOrder!.status).toEqual(OrderStatus.Cancelled)
})

it('emit an OrderCancelled event', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    expect(natsWrapper.client.publish).toHaveBeenCalled()

    const eventData = JSON.parse((natsWrapper.client.publish as jest.Mock).mock.calls[0][1])
    
    expect(eventData.id).toEqual(data.orderId)
})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    expect(msg.ack).toHaveBeenCalled()
})