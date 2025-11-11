import nats from "node-nats-streaming"
import { randomBytes } from "crypto"
import { ProductCreatedListener } from "./events/product-created-listener"
import { ProductUpdatedListener } from "./events/product-updated-listener"

console.clear()

const stan = nats.connect('ticketing', randomBytes(4).toString('hex'), {
    url: 'http://localhost:4222'
})

stan.on('connect', () => {
    console.log('Listener connected to NATS')

    // Close connection if closed
    stan.on('close', () => {
        console.log('NATS connection closed!')
        process.exit()
    })

    new ProductCreatedListener(stan).listen()
    new ProductUpdatedListener(stan).listen()

})

// Graceful shutdown if interrupt or terminate signal
process.on('SIGINT', () => stan.close())
process.on('SIGTERM', () => stan.close())





