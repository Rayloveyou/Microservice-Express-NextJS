import { OrderCreatedListener } from "../order-created-listener"
import { natsWrapper } from "../../../nats-wrapper"
import { OrderCreatedEvent, OrderStatus } from "@datnxtickets/common"
import mongoose from "mongoose"
import { Product } from "../../../models/product"

const setup = async () => {
    // Create an instance of the listener
    const listener = new OrderCreatedListener(natsWrapper.client)

    // Create and save a product
    const product = Product.build({
        title: 'concert',
        price: 20,
        userId: 'asdf'
    })

   await product.save()

    // Create a fake data object
    const data: OrderCreatedEvent['data'] = {
        id: new mongoose.Types.ObjectId().toHexString(),
        version: 0,
        status: OrderStatus.Created,
        userId: 'asdf',
        expiresAt: 'asdf',
        product: {
            id: product.id,
            price: product.price
        }
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg }
}

it('sets the orderId of the product', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure a ticket was created!
    const product = await Product.findById(data.product.id)

    expect(product!.orderId).toEqual(data.id)
})

it('acks the message', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Write assertions to make sure ack function is called
    expect(msg.ack).toHaveBeenCalled()
})

it('publishes a product updated event', async () => {
    const { listener, data, msg } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    expect(natsWrapper.client.publish).toHaveBeenCalled()

    const publishMock = natsWrapper.client.publish as jest.Mock
    const eventData = JSON.parse(publishMock.mock.calls[0][1])

    console.log(eventData)
    expect(eventData.orderId).toEqual(data.id)

})