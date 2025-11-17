import { Product } from "../../../models/product"
import { natsWrapper } from "../../../nats-wrapper"
import { ProductUpdatedListener } from "../product-updated-listener"
import { ProductUpdatedEvent } from "@datnxecommerce/common"
import mongoose from "mongoose"
import { Message } from "node-nats-streaming"

const setup = async () => {
    // Create an instance of the listener
    const listener = new ProductUpdatedListener(natsWrapper.client)

    // Create and save a product
    const product = Product.build({
        id: new mongoose.Types.ObjectId().toHexString(),
        title: 'concert',
        price: 20,
        quantity: 10
    })
    await product.save()

    // Create a fake data object
    const data: ProductUpdatedEvent['data'] = {
        id: product.id,
        version: product.version + 1,
        title: 'new title',
        price: 100,
        userId: 'asdf',
        quantity: 15
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('finds, updates, and saves a product', async () => {
    const {listener, data, msg } = await setup()

    // Giả lập việc nhận event
    await listener.onMessage(data, msg)
    const product = await Product.findById(data.id)

    expect(product!.title).toEqual(data.title)
    expect(product!.price).toEqual(data.price)
    expect(product!.version).toEqual(data.version)
})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Giả lập việc nhận event
    await listener.onMessage(data, msg)

    // Write assertions to make sure ack function is called
    expect(msg.ack).toHaveBeenCalled()
})

it('does not call ack if the event has a skipped version number', async () => {
    const { listener, data, msg } = await setup()

    data.version = 10

    // Giả lập việc nhận event
    try {
        await listener.onMessage(data, msg)
    } catch (err) {}

    expect(msg.ack).not.toHaveBeenCalled()
})