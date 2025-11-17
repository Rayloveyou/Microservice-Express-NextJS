/** @type {import('next').NextConfig} */
const nextConfig = {
    // Make runtime env variables available to the browser
    env: {
        NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
    },
}

export default nextConfig