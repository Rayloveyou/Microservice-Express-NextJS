import { Message, Stan } from "node-nats-streaming"
import { Subjects } from "./subjects"

interface Event {
    subject: Subjects
    data: any
}

//abstract class to handle overall logic for listener
//anytime want to make use of this class, need to provide custom type to it to define custom structure
export abstract class Listener<T extends Event> {

    abstract subject: T['subject'] // Event name
    abstract queueGroupName: string // Queue group name

    abstract onMessage(data: T['data'], msg: Message): void // Function to handle message
    protected client: Stan // Stan to pre-initialize to NATS client, define as protected to make it accessible in child classes
    protected ackWait = 5 * 1000 // 5 seconds


    constructor(client: Stan) {
        this.client = client
    }

    // Set subscription options
    subcriptionOptions() {
        return this.client
            .subscriptionOptions()
            .setDeliverAllAvailable() // after restart, redeliver all messages in queue 
            .setManualAckMode(true) // make sure message is completely processed before deleting, if not will be redelivered by NATS
            .setAckWait(this.ackWait) // time to wait before redelivery
            .setDurableName(this.queueGroupName) // all processed message will be stored in this queue to avoid redelivery
    }

    // Listen to events
    listen() {
        const subscription = this.client.subscribe(
            this.subject,
            this.queueGroupName,
            this.subcriptionOptions()
        )

        subscription.on('message', (msg: Message) => {
            console.log(
                `Message received: ${this.subject} / ${this.queueGroupName}`
            )

            const parsedData = this.parseMessage(msg)
            this.onMessage(parsedData, msg)
        })
    }

    // Parse message
    parseMessage(msg: Message) {
        const data = msg.getData()
        return typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString('utf-8'))
    }
}