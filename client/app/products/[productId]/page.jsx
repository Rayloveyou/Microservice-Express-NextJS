import axios from 'axios'
import { notFound } from 'next/navigation'
import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import ProductPageClient from './product-page-client'

export const metadata = {
  title: 'Product | E-Commerce'
}

export default async function ProductPage({ params }) {
  const { productId } = await params
  const cookieHeader = await getCookieHeader()
  const userData = await fetchCurrentUser(cookieHeader)
  const currentUser = userData?.currentUser || null

  const gatewayUrl = process.env.API_GATEWAY_URL
  let product = null
  try {
    const { data } = await axios.get(`${gatewayUrl}/api/products/${productId}`, {
      headers: { Cookie: cookieHeader }
    })
    product = data
  } catch (err) {
    return notFound()
  }

  return <ProductPageClient product={product} currentUser={currentUser} />
}
