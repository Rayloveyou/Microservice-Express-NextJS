export const kafkaWrapper = {
  producer: {
    send: jest.fn().mockResolvedValue(undefined)
  },
  consumer: null as any,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  createConsumer: jest.fn()
}
