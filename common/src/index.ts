// Re-exporting từ thư mục errors và middlewares để tiện sử dụng trong các dịch vụ khác
export * from './errors/bad-request-error'
export * from './errors/custom-error'
export * from './errors/not-authorized-error'
export * from './errors/request-validation-error'
export * from './errors/not-found-error'
export * from './errors/database-connection-error'

export * from './middlewares/current-user'
export * from './middlewares/error-handler'
export * from './middlewares/require-auth'
export * from './middlewares/validate-request'
export * from './middlewares/require-admin'
export * from './middlewares/require-not-revoked'

// Kafka event-driven architecture
export * from './events/base-consumer'
export * from './events/base-producer'
export * from './kafka-wrapper'
// Re-export Kafka types
export type { EachMessagePayload } from 'kafkajs'

// Structured logging
export * from './logger'

export * from './events/topics'
export * from './events/product-created-event'
export * from './events/product-updated-event'

export * from './events/types/order-status'
export * from './events/types/user-role'
export * from './events/order-created-event'
export * from './events/order-cancelled-event'

export * from './events/payment-created-event'

export * from './events/cart-checkout-event'

// Redis revocation helpers
export * from './services/revocation'
