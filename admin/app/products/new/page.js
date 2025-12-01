import { fetchCurrentUser } from '../../../lib/server-auth'
import { getCookieHeader } from '../../../lib/get-cookie-header'
import NewProductFormClient from './new-product-form-client'

export const metadata = {
  title: 'Create Product'
}

export const dynamic = 'force-dynamic'

export default async function AdminNewProductPage() {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)
  const isSignedIn = !!currentUser

  return (
    <>
      {!isSignedIn ? (
        <div className="alert alert-warning">
          Please sign in to create products. <a href="/auth/signin">Sign in</a>
        </div>
      ) : (
        <>
          <div className="row mb-4">
            <div className="col">
              <h1 className="h4 mb-1">Create Product</h1>
              <p className="text-muted mb-0">List a new product for sale.</p>
            </div>
          </div>

          <NewProductFormClient />
        </>
      )}
    </>
  )
}
