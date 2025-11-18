import { Producer } from 'kafkajs'
import { Subjects } from './subjects'

/**
 * Base Publisher cho Kafka
 * Tương tự base-publisher.ts nhưng dùng Kafka Producer thay vì NATS Stan
 * 
 * Kafka Publisher pattern:
 * - Publish message vào topic (tương đương NATS subject)
 * - Topic name = event subject (ví dụ: 'product:created')
 * - Message key: có thể dùng để partition routing (ví dụ: productId)
 * - Message value: JSON stringified event data
 */
interface Event {
  subject: Subjects
  data: any
}

export abstract class PublisherKafka<T extends Event> {
  /**
   * Event subject - sẽ được dùng làm Kafka topic name
   * Ví dụ: Subjects.ProductCreated -> topic 'product:created'
   */
  abstract subject: T['subject']

  /**
   * Kafka Producer instance
   * Dùng để publish messages vào topics
   */
  protected producer: Producer

  constructor(producer: Producer) {
    this.producer = producer
  }

  /**
   * Publish event vào Kafka topic
   * 
   * @param data - Event data payload
   * @param key - Optional message key (dùng cho partition routing)
   *              Nếu không có, Kafka sẽ round-robin partition
   */
  async publish(data: T['data'], key?: string): Promise<void> {
    try {
      // Topic name = event subject
      const topic = this.subject

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
      await this.producer.send({
        topic,
        messages: [message]
      })

      console.log(`✅ Event published to topic: ${topic}`, key ? `(key: ${key})` : '')
    } catch (err) {
      console.error(`❌ Failed to publish event to topic ${this.subject}:`, err)
      throw err
    }
  }
}

