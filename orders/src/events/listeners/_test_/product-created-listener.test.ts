import { Product } from "../../../models/product"
import { natsWrapper } from "../../../nats-wrapper"
import { ProductCreatedListener } from "../product-created-listener"
import { ProductCreatedEvent } from "@datnxecommerce/common"
import mongoose from "mongoose"
import { Message } from "node-nats-streaming"

const setup = async () => {
    // Create an instance of the listener
    const listener = new ProductCreatedListener(natsWrapper.client)

    // Create a fake data event
    const data: ProductCreatedEvent['data'] = {
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'concert',
        price: 20,
        quantity: 10,
        userId: new mongoose.Types.ObjectId().toHexString(),
        version: 0
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('creates and saves a ticket', async () => {
 const { listener, data, msg } = await setup()

 // Call the onMessage function with the data object + message object
 await listener.onMessage(data, msg)

 // Write assertions to make sure a ticket was created!
 const product = await Product.findById(data.id)

 expect(product).toBeDefined()
 expect(product!.title).toEqual(data.title)
 expect(product!.price).toEqual(data.price)

})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure ack function is called
    expect(msg.ack).toHaveBeenCalled()

})