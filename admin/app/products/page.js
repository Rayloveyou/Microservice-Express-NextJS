import axios from 'axios'
import Link from 'next/link'

import ProductsClient from './products-client'
import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'
import { requireEnv } from '../../lib/require-env'

export const metadata = {
  title: 'Products | Admin'
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = requireEnv('API_GATEWAY_URL')
  let products = []

  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${gatewayUrl}/api/products?limit=1000`, {
        headers: { Cookie: cookieHeader }
      })
      if (data.products) {
        products = data.products
      } else {
        products = Array.isArray(data) ? data : []
      }
    } catch (err) {
      console.error('Failed to fetch products:', err?.message)
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="auth-error-container">
          <div className="auth-error-card">
            <h2>Authentication Required</h2>
            <p>Please sign in to view products.</p>
            <a href="/auth/signin" className="btn btn-primary">
              Sign In
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Products</h1>
              <p className="page-subtitle">Manage all products in the catalog.</p>
            </div>
            <Link href="/products/new" className="btn btn-primary">
              Create Product
            </Link>
          </div>

          <ProductsClient products={products} />
        </>
      )}
    </>
  )
}
