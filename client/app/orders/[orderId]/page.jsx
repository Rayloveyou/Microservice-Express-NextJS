import axios from 'axios'
import { notFound } from 'next/navigation'
import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import OrderPageClient from './order-page-client'

export const metadata = {
  title: 'Order | E-Commerce'
}

export default async function OrderPage({ params }) {
  const { orderId } = await params
  const cookieHeader = await getCookieHeader()

  const userData = await fetchCurrentUser(cookieHeader)
  const currentUser = userData?.currentUser || null

  const gatewayUrl = process.env.API_GATEWAY_URL
  let order = null
  try {
    const { data } = await axios.get(`${gatewayUrl}/api/orders/${orderId}`, {
      headers: { Cookie: cookieHeader }
    })
    order = data
  } catch (err) {
    return notFound()
  }

  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY || ''

  return <OrderPageClient order={order} currentUser={currentUser} stripeKey={stripeKey} />
}
