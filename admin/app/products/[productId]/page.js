import axios from 'axios'

import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import ProductEditFormClient from './product-edit-form-client'

export const metadata = {
  title: 'Edit Product'
}

export const dynamic = 'force-dynamic'

export default async function AdminEditProductPage({ params }) {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  const gatewayUrl = process.env.API_GATEWAY_URL
  const { productId } = await params

  let product = null
  if (isSignedIn) {
    try {
      const { data } = await axios.get(`${gatewayUrl}/api/products/${productId}`, {
        headers: { Cookie: cookieHeader }
      })
      product = data
    } catch {
      product = null
    }
  }

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to edit products. <a href="/auth/signin">Sign in</a>
        </div>
      ) : !product ? (
        <div className="alert alert-danger">Product not found.</div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h4 mb-1">Edit Product</h1>
              <p className="text-muted mb-0">{product?.title}</p>
            </div>
          </div>

          <ProductEditFormClient product={product} />
        </>
      )}
    </>
  )
}
