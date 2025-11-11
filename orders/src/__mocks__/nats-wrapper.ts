export const natsWrapper = {
    client: {
        // Mock the publish function
        publish: jest.fn().mockImplementation(
            (subject: string, data: string, callback: () => void) => {
                callback()
            }
        )
    }
}
