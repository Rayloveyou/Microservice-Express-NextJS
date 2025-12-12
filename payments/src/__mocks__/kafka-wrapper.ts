export const kafkaWrapper = {
  producer: {
    send: jest
      .fn()
      .mockImplementation(() => Promise.resolve([{ topicName: '', partition: 0, errorCode: 0, offset: '0' }]))
  },
  consumer: jest.fn(),
  createConsumer: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}
