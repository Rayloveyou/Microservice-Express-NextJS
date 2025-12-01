import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import CartPageClient from './cart-page-client'

export const metadata = {
  title: 'Cart | E-Commerce'
}

export default async function CartPage() {
  const cookieHeader = await getCookieHeader()
  const data = await fetchCurrentUser(cookieHeader)
  const currentUser = data?.currentUser || null

  return <CartPageClient currentUser={currentUser} />
}
