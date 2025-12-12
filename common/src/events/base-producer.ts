import { Producer as KafkaJsProducer } from 'kafkajs'
import { Topics } from './topics'
import { Logger, createLogger } from '../logger'

/**
 * Base Producer cho Kafka
 * Kafka Producer pattern:
 * - Publish message vào topic (tương đương NATS subject)
 * - Topic name = event topic (ví dụ: 'product.created')
 * - Message key: có thể dùng để partition routing (ví dụ: productId)
 * - Message value: JSON stringified event data
 */
interface Event {
  topic: Topics
  data: any
}

export abstract class Producer<T extends Event> {
  /**
   * Event topic - sẽ được dùng làm Kafka topic name
   * Ví dụ: Topics.ProductCreated -> topic 'product.created'
   */
  abstract topic: T['topic']

  /**
   * Kafka Producer instance
   * Dùng để publish messages vào topics
   */
  protected kafkaProducer: KafkaJsProducer

  /**
   * Structured logger instance
   */
  protected logger: Logger

  constructor(producer: KafkaJsProducer, serviceName?: string) {
    this.kafkaProducer = producer
    this.logger = createLogger('ecommerce', serviceName || 'unknown-service')
  }

  /**
   * Publish event vào Kafka topic
   *
   * @param data - Event data payload
   * @param key - Optional message key (dùng cho partition routing)
   *              Nếu không có, Kafka sẽ round-robin partition
   */
  async publish(data: T['data'], key?: string): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Topic name = event topic
      const topic = this.topic

      // Message payload
      const message = {
        // Key: dùng để đảm bảo messages có cùng key sẽ vào cùng partition
        // Hữu ích cho ordering guarantee (ví dụ: tất cả events của 1 product vào cùng partition)
        key: key || null,
        // Value: JSON stringified event data
        value: JSON.stringify(data),
        // Timestamp: auto-set bởi Kafka nếu không specify
        timestamp: Date.now().toString()
      }

      // Send message to topic
      const result = await this.kafkaProducer.send({
        topic,
        messages: [message]
      })

      const duration = Date.now() - startTime
      
      this.logger.kafkaEventPublished(topic, data, {
        key: key || undefined,
        partition: result[0]?.partition,
        offset: result[0]?.baseOffset,
        duration_ms: duration
      })
    } catch (err) {
      const duration = Date.now() - startTime
      
      this.logger.error('Failed to publish Kafka event', err as Error, {
        topic: this.topic,
        key: key || undefined,
        duration_ms: duration
      })
      throw err
    }
  }
}
