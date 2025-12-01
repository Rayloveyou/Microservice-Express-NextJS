import Stripe from 'stripe'

// Configure Stripe client with conservative network settings to reduce connection errors.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2024-06-20', // optional pin
  timeout: 10000, // ms per request
  maxNetworkRetries: 2, // default; adjust if transient network issues persist
  telemetry: true
})
