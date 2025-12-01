import axios from 'axios'
import Link from 'next/link'

import ProductsClient from './products-client'
import { fetchCurrentUser } from '../../lib/server-auth'
import { getCookieHeader } from '../../lib/get-cookie-header'

export const metadata = {
  title: 'Products'
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = process.env.API_GATEWAY_URL
  let products = []

  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${gatewayUrl}/api/products?limit=1000`, {
        headers: { Cookie: cookieHeader }
      })
      // Handle new pagination response format
      if (data.products) {
        products = data.products
      } else {
        // Fallback for old format
        products = Array.isArray(data) ? data : []
      }
    } catch {
      products = []
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to view products. <a href="/auth/signin">Sign in</a>
        </div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-1">Products</h1>
                <p className="text-muted mb-0">Manage all products in the catalog.</p>
              </div>
              <Link href="/products/new" className="btn btn-primary btn-sm">
                Create Product
              </Link>
            </div>
          </div>

          <ProductsClient products={products} />
        </>
      )}
    </>
  )
}
