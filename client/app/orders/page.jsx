import axios from 'axios'
import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import OrdersPageClient from './orders-page-client'

export const metadata = {
  title: 'Orders | E-Commerce'
}

export default async function OrdersPage() {
  const cookieHeader = await getCookieHeader()
  const userData = await fetchCurrentUser(cookieHeader)
  const currentUser = userData?.currentUser || null

  let orders = []
  try {
    const gatewayUrl = process.env.API_GATEWAY_URL
    const { data } = await axios.get(`${gatewayUrl}/api/orders`, {
      headers: { Cookie: cookieHeader }
    })
    orders = Array.isArray(data) ? data : []
  } catch (err) {
    orders = []
  }

  return <OrdersPageClient orders={orders} currentUser={currentUser} />
}
