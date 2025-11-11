import nats from "node-nats-streaming"
import { ProductCreatedPublisher } from "./events/product-created-publisher"

console.clear()

// Create a stan client connection
const stan = nats.connect('ticketing', 'abc', {
    url: 'http://localhost:4222'
})

stan.on('connect', async () => {
    console.log('Publisher connected to NATS')

    const publisher = new ProductCreatedPublisher(stan)
    await publisher.publish({
        id: '123',
        title: 'concert',
        price: 20,
        // userId: 'user123'
    })

    // // Publish a message (data must be a string)
    // const data = JSON.stringify({
    //     id: '123',
    //     title: 'concert',
    //     price: '$20'
    // })

    // stan.publish('ProductCreated', data, () => {
    //     console.log('Event published')
    //     // stan.close()
    // })

})
