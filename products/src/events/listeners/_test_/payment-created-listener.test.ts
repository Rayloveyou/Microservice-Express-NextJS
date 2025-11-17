import { PaymentCreatedListener } from "../payment-created-listener"
import { natsWrapper } from "../../../nats-wrapper"
import { PaymentCreatedEvent } from "@datnxecommerce/common"
import mongoose from "mongoose"
import { Product } from "../../../models/product"
import { Message } from "node-nats-streaming"

const setup = async () => {
    // Create an instance of the listener
    const listener = new PaymentCreatedListener(natsWrapper.client)

    // Create and save a product
    const product = Product.build({
        title: 'concert',
        price: 20,
        userId: 'asdf',
        quantity: 10
    })

   await product.save()

    // Create a fake data object
    const data: PaymentCreatedEvent['data'] = {
        id: new mongoose.Types.ObjectId().toHexString(),
        orderId: new mongoose.Types.ObjectId().toHexString(),
        stripeId: 'stripe_123',
        items: [
            {
                productId: product.id,
                price: product.price,
                quantity: 2,
                title: product.title
            }
        ]
    }

    // Create a fake message object
    // @ts-ignore
    const msg: Message = {
        ack: jest.fn()
    }

    return { listener, data, msg, product }
}

it('reduces the quantity of the product on payment completion', async () => {
    const { listener, data, msg, product } = await setup()

    // Call the onMessage function with the data object + message object
    await listener.onMessage(data, msg)

    // Product quantity should be reduced
    const updatedProduct = await Product.findById(product.id)

    // Initial quantity was 10, order quantity was 2, so remaining should be 8
    expect(updatedProduct!.quantity).toEqual(8)
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

    // Check that the updated quantity is published (10 - 2 = 8)
    expect(eventData.quantity).toEqual(8)
})

it('handles insufficient stock gracefully', async () => {
    const { listener, data, msg, product } = await setup()

    // Modify data to require more than available
    data.items[0]!.quantity = 15

    // Call the onMessage function
    await listener.onMessage(data, msg)

    // Product quantity should be set to 0 (not negative)
    const updatedProduct = await Product.findById(product.id)
    expect(updatedProduct!.quantity).toEqual(0)

    // Should still ack the message
    expect(msg.ack).toHaveBeenCalled()
})
