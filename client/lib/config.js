// Runtime config that works in both client and server
export const getStripeKey = () => {
  // Try multiple sources
  if (typeof window !== 'undefined') {
    // Client-side: check window object first (we'll inject it)
    if (window.__NEXT_DATA__?.props?.pageProps?.stripeKey) {
      return window.__NEXT_DATA__.props.pageProps.stripeKey
    }
  }
  
  // Fallback to env (works if env.NEXT_PUBLIC_STRIPE_KEY is set in next.config)
  return process.env.NEXT_PUBLIC_STRIPE_KEY
}
