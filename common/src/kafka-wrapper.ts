import { Kafka, KafkaConfig, Producer, Consumer, EachMessagePayload } from 'kafkajs'

/**
 * Kafka Wrapper - Singleton pattern để quản lý Kafka client connection
 * Tương tự như nats-wrapper nhưng dùng cho Kafka
 * 
 * Kafka architecture:
 * - Topics: Tương đương với NATS subjects (ví dụ: 'product:created')
 * - Partitions: Cho phép parallel processing và scaling
 * - Consumer Groups: Tương đương với NATS queue groups
 * - Producers: Publish messages vào topics
 * - Consumers: Subscribe và consume messages từ topics
 */
class KafkaWrapper {
  private _producer?: Producer
  private _consumer?: Consumer
  private _kafka?: Kafka

  /**
   * Getter cho Kafka instance
   * Phải connect trước khi sử dụng
   */
  get kafka() {
    if (!this._kafka) {
      throw new Error('Cannot access Kafka client before connecting')
    }
    return this._kafka
  }

  /**
   * Getter cho Producer instance
   * Dùng để publish events vào topics
   */
  get producer() {
    if (!this._producer) {
      throw new Error('Cannot access Kafka producer before connecting')
    }
    return this._producer
  }

  /**
   * Getter cho Consumer instance
   * Dùng để subscribe và consume events từ topics
   */
  get consumer() {
    if (!this._consumer) {
      throw new Error('Cannot access Kafka consumer before connecting')
    }
    return this._consumer
  }

  /**
   * Connect to Kafka broker(s)
   * 
   * @param brokers - Array of broker URLs (ví dụ: ['kafka-svc:9092'])
   * @param clientId - Unique client identifier cho service này
   */
  async connect(brokers: string[], clientId: string): Promise<void> {
    try {
      // Tạo Kafka client với config
      const config: KafkaConfig = {
        clientId,
        brokers,
        // Retry config cho production
        retry: {
          retries: 8,
          initialRetryTime: 100,
          multiplier: 2,
          maxRetryTime: 30000
        }
      }

      this._kafka = new Kafka(config)

      // Tạo producer để publish messages
      this._producer = this._kafka.producer({
        // Idempotent producer: đảm bảo exactly-once delivery
        idempotent: true,
        // Transaction timeout
        transactionTimeout: 30000,
        // Max in flight requests
        maxInFlightRequests: 1
      })

      // Connect producer
      await this._producer.connect()
      console.log('✅ Kafka Producer connected')

      // Consumer sẽ được tạo riêng trong mỗi listener
      // Vì mỗi service có thể có nhiều consumer groups khác nhau
    } catch (err) {
      console.error('❌ Kafka connection failed:', err)
      throw err
    }
  }

  /**
   * Create a new consumer instance
   * Mỗi listener sẽ tạo consumer riêng với consumer group riêng
   * 
   * @param groupId - Consumer group ID (tương đương queue group name trong NATS)
   * @returns Consumer instance
   */
  createConsumer(groupId: string): Consumer {
    if (!this._kafka) {
      throw new Error('Kafka client not initialized. Call connect() first.')
    }

    return this._kafka.consumer({
      groupId,
      // Session timeout: thời gian chờ trước khi coi consumer là dead
      sessionTimeout: 30000,
      // Heartbeat interval: tần suất gửi heartbeat
      heartbeatInterval: 3000,
      // Max bytes per partition
      maxBytesPerPartition: 1048576, // 1MB
      // Read from beginning nếu consumer group mới
      readUncommitted: false
    })
  }

  /**
   * Disconnect producer và consumer
   * Gọi khi service shutdown
   */
  async disconnect(): Promise<void> {
    try {
      if (this._producer) {
        await this._producer.disconnect()
        console.log('✅ Kafka Producer disconnected')
      }
      // Consumer disconnect sẽ được handle trong từng listener
    } catch (err) {
      console.error('❌ Error disconnecting Kafka:', err)
    }
  }
}

// Export singleton instance
export const kafkaWrapper = new KafkaWrapper()

