import Queue from 'bull'
import { natsWrapper } from '../nats-wrapper'
import { ExpirationCompletePublisher } from '../events/publishers/expiration-complete-publisher'


// Define Payload structure 
interface Payload {
    orderId: string
}

// Create a queue in redis to store expiration jobs
const expirationQueue = new Queue<Payload>('order:expiration', {
    redis: {
        host: process.env.REDIS_HOST
    }
})


// Process the job
expirationQueue.process(async (job) => {
    // Send expiration complete event
    new ExpirationCompletePublisher(natsWrapper.client).publish({
        orderId: job.data.orderId
    })
})

export { expirationQueue }