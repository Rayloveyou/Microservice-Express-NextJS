import { Consumer as KafkaJsConsumer, EachMessagePayload } from 'kafkajs'
import { Topics } from './topics'
import { Logger, createLogger } from '../logger'

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
  topic: Topics
  data: any
}

export abstract class Consumer<T extends Event> {
  /**
   * Event topic - sẽ được dùng làm Kafka topic name
   */
  abstract topic: T['topic']

  /**
   * Kafka consumer group id
   * Đảm bảo mỗi message chỉ được process 1 lần bởi 1 consumer trong group
   */
  abstract consumerGroupId: string

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

  /**
   * Structured logger instance
   */
  protected logger: Logger

  constructor(consumer: KafkaJsConsumer, options?: { fromBeginning?: boolean; serviceName?: string }) {
    this.kafkaConsumer = consumer
    this.fromBeginning = options?.fromBeginning ?? false
    this.logger = createLogger('ecommerce', options?.serviceName || 'unknown-service')
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
      this.logger.info('Kafka consumer connected', {
        topic: this.topic,
        consumer_group: this.consumerGroupId,
        from_beginning: this.fromBeginning
      })

      // Subscribe to topic
      await this.kafkaConsumer.subscribe({
        topic: this.topic,
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
          const startTime = Date.now()

          try {
            // Parse message data
            const data = this.parseMessage(message)

            this.logger.kafkaEventReceived(topic, data, {
              partition,
              offset: message.offset,
              consumer_group: this.consumerGroupId
            })

            // Call handler
            await this.onMessage(data, payload)

            const duration = Date.now() - startTime
            this.logger.kafkaEventProcessed(topic, data, duration, {
              partition,
              offset: message.offset,
              consumer_group: this.consumerGroupId
            })

            // Note: Offset commit được handle tự động bởi Kafka
            // Nếu onMessage throw error, offset sẽ không commit
            // Message sẽ được retry (nếu có retry logic) hoặc move to DLQ
          } catch (err) {
            const duration = Date.now() - startTime
            const data = this.parseMessage(message)
            
            this.logger.kafkaEventFailed(topic, data, err as Error, {
              partition,
              offset: message.offset,
              consumer_group: this.consumerGroupId,
              duration_ms: duration
            })
            
            // Có thể implement retry logic hoặc DLQ ở đây
            throw err // Re-throw để Kafka biết message chưa được process thành công
          }
        }
      })
    } catch (err) {
      this.logger.error('Error setting up Kafka consumer', err as Error, {
        topic: this.topic,
        consumer_group: this.consumerGroupId
      })
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

    const data = typeof message.value === 'string' ? message.value : message.value.toString('utf-8')

    return JSON.parse(data)
  }

  /**
   * Disconnect consumer
   * Gọi khi service shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.kafkaConsumer.disconnect()
      this.logger.info('Kafka consumer disconnected', {
        topic: this.topic,
        consumer_group: this.consumerGroupId
      })
    } catch (err) {
      this.logger.error('Error disconnecting Kafka consumer', err as Error, {
        topic: this.topic,
        consumer_group: this.consumerGroupId
      })
    }
  }
}
