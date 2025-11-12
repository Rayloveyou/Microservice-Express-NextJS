import { natsWrapper } from "../../../nats-wrapper"
import { OrderCancelledListener } from "../order-cancelled-listener"
import { Product } from "../../../models/product"
import mongoose from "mongoose"
import { OrderCancelledEvent } from "@datnxtickets/common"

const setup = async () => {
    // Create an instance of the listener
    const listener = new OrderCancelledListener(natsWrapper.client)

    const orderId = new mongoose.Types.ObjectId().toHexString()
    // Create and save a product
    const product = Product.build({
        title: 'concert',
        price: 20,
        userId: 'asdf'

    })

    product.set({
        orderId
    })

   await product.save()

    // Create a fake data object
    const data: OrderCancelledEvent['data'] = {
        id: product.id,
        version: 0,
        product: {
            id: product.id
        }
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('updates the status of the product, publishes an event, and acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure a ticket was created!
    const product = await Product.findById(data.id)

    // expect product orderId to be undefined
    expect(product!.orderId).not.toBeDefined()

    expect(msg.ack).toHaveBeenCalled()

    // publish an event that a ticket was updated
    expect(natsWrapper.client.publish).toHaveBeenCalled()
})