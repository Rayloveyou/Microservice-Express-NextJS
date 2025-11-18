import { Consumer as KafkaJsConsumer, EachMessagePayload } from 'kafkajs'
import { Subjects } from './subjects'

// Re-export EachMessagePayload để các services có thể import
export type { EachMessagePayload }

/**
 * Base Consumer cho Kafka
 * Kafka Consumer pattern:
 * - Subscribe to topic (tương đương NATS subject)
 * - Consumer group: đảm bảo mỗi message chỉ được process 1 lần bởi 1 consumer trong group
 * - Partition: cho phép parallel processing
 * - Offset: track vị trí đã đọc trong partition
 */
interface Event {
  subject: Subjects
  data: any
}

export abstract class Consumer<T extends Event> {
  /**
   * Event subject - sẽ được dùng làm Kafka topic name
   */
  abstract subject: T['subject']

  /**
   * Consumer group name
   * Tương đương queueGroupName trong NATS
   * Đảm bảo mỗi message chỉ được process 1 lần bởi 1 consumer trong group
   */
  abstract queueGroupName: string

  /**
   * Handler function khi nhận được message
   * Implement trong subclass
   * 
   * @param data - Parsed event data
   * @param payload - Full Kafka message payload (có thể dùng để commit offset)
   */
  abstract onMessage(data: T['data'], payload: EachMessagePayload): Promise<void>

  /**
   * Kafka Consumer instance
   */
  protected kafkaConsumer: KafkaJsConsumer

  /**
   * Nếu true: consumer group mới sẽ đọc toàn bộ lịch sử topic
   * Nếu false: chỉ đọc các message mới sau thời điểm subscribe
   */
  protected fromBeginning: boolean

  constructor(consumer: KafkaJsConsumer, options?: { fromBeginning?: boolean }) {
    this.kafkaConsumer = consumer
    this.fromBeginning = options?.fromBeginning ?? false
  }

  /**
   * Subscribe to topic và bắt đầu consume messages
   * 
   * Flow:
   * 1. Connect consumer
   * 2. Subscribe to topic
   * 3. Run consumer loop để nhận messages
   * 4. Parse message và gọi onMessage handler
   * 5. Commit offset sau khi process xong (trong onMessage)
   */
  async listen(): Promise<void> {
    try {
      // Connect consumer
      await this.kafkaConsumer.connect()
      console.log(`Kafka Consumer connected for topic: ${this.subject}, group: ${this.queueGroupName}`)

      // Subscribe to topic
      await this.kafkaConsumer.subscribe({
        topic: this.subject,
        // fromBeginning:
        // - true  => group mới sẽ đọc toàn bộ lịch sử (offset từ 0)
        // - false => group mới chỉ đọc message mới (tương đương "latest")
        fromBeginning: this.fromBeginning
      })

      // Start consuming messages
      await this.kafkaConsumer.run({
        // Process mỗi message
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload

          console.log(
            `Message received: ${this.subject} / ${this.queueGroupName} [partition: ${partition}, offset: ${message.offset}]`
          )

          try {
            // Parse message data
            const data = this.parseMessage(message)

            // Call handler
            await this.onMessage(data, payload)

            // Note: Offset commit được handle tự động bởi Kafka
            // Nếu onMessage throw error, offset sẽ không commit
            // Message sẽ được retry (nếu có retry logic) hoặc move to DLQ
          } catch (err) {
            console.error(`Error processing message from topic ${this.subject}:`, err)
            // Có thể implement retry logic hoặc DLQ ở đây
            throw err // Re-throw để Kafka biết message chưa được process thành công
          }
        }
      })
    } catch (err) {
      console.error(`Error setting up Kafka consumer for ${this.subject}:`, err)
      throw err
    }
  }

  /**
   * Parse message value từ buffer/string thành object
   * 
   * @param message - Kafka message object
   * @returns Parsed event data
   */
  parseMessage(message: { value: Buffer | string | null }): T['data'] {
    if (!message.value) {
      throw new Error('Message value is null or undefined')
    }

    const data = typeof message.value === 'string'
      ? message.value
      : message.value.toString('utf-8')

    return JSON.parse(data)
  }

  /**
   * Disconnect consumer
   * Gọi khi service shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.kafkaConsumer.disconnect()
      console.log(`Kafka Consumer disconnected for topic: ${this.subject}`)
    } catch (err) {
      console.error(`Error disconnecting Kafka consumer:`, err)
    }
  }
}
