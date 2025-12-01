import { Client } from 'minio'

const rawEndpoint = process.env.MINIO_ENDPOINT || 'localhost'
let endPoint = rawEndpoint
let port = parseInt(process.env.MINIO_PORT || '9000')
let useSSL = process.env.MINIO_USE_SSL === 'true'

// Allow http://host:port style in env; normalize to host + port + useSSL
try {
  const url = new URL(rawEndpoint)
  endPoint = url.hostname
  if (url.port) {
    port = parseInt(url.port)
  }
  useSSL = url.protocol === 'https:'
} catch {
  // rawEndpoint not a URL, keep defaults
}

export const minioClient = new Client({
  endPoint,
  port,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
  secretKey: process.env.MINIO_SECRET_KEY || 'minio123'
})

// Bucket name for product images
export const BUCKET_NAME = 'product-images'

// Initialize bucket on startup
export const initializeBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME)
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
      // Set bucket policy to allow public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      }
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy))
      console.log(`Bucket ${BUCKET_NAME} created successfully`)
    }
  } catch (err) {
    console.error('Error initializing MinIO bucket:', err)
  }
}
