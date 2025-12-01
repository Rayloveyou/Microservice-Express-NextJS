/**
 * Products Service Kafka Wrapper
 * Re-export kafkaWrapper từ common package để dùng trong service này
 *
 * Mỗi service có thể có wrapper riêng nếu cần custom config,
 * nhưng thường chỉ cần re-export từ common
 */
export { kafkaWrapper } from '@datnxecommerce/common'
