import axios from 'axios'
import Link from 'next/link'
import { Suspense } from 'react'

import { fetchCurrentUser } from '../lib/server-auth'
import { getCookieHeader } from '../lib/get-cookie-header'
import CategoryNav from '../components/category-nav'
import SearchBar from '../components/search-bar'
import Pagination from '../components/pagination'

export const metadata = {
  title: 'E-Commerce | Home'
}

// Force dynamic rendering to ensure searchParams work correctly
export const dynamic = 'force-dynamic'

export default async function LandingPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise
  const cookieHeader = await getCookieHeader()
  const data = await fetchCurrentUser(cookieHeader)
  const currentUser = data?.currentUser || null

  // Get query parameters
  const page = searchParams?.page || '1'
  const search = searchParams?.search || ''
  const category = searchParams?.category || ''

  let products = []
  let pagination = null

  try {
    const gatewayUrl = process.env.API_GATEWAY_URL
    const params = new URLSearchParams({
      page,
      limit: '12'
    })

    if (search) params.append('search', search)
    if (category) params.append('category', category)

    const requestUrl = `${gatewayUrl}/api/products?${params.toString()}`

    const res = await axios.get(requestUrl, {
      headers: { Cookie: cookieHeader }
    })

    // Handle pagination response format
    if (res.data.products) {
      products = res.data.products
      pagination = res.data.pagination
    } else {
      products = Array.isArray(res.data) ? res.data : []
    }
  } catch (err) {
    products = []
  }

  return (
    <div className="mt-4">
      {/* Hero */}
      <div className="hero brand-gradient mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="badge rounded-pill badge-brand mb-2">E-Commerce</span>
            <h1 className="display-6 mb-2">Discover. Shop. Enjoy.</h1>
            <p className="mb-3">Your favorite products with a smooth, secure checkout.</p>
            {!currentUser && (
              <div className="d-flex gap-2">
                <Link className="btn btn-outline-brand btn-sm" href="/auth/signin">
                  Sign in
                </Link>
                <Link className="btn btn-brand btn-sm" href="/auth/signup">
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <Suspense fallback={<div className="search-bar">Loading...</div>}>
          <SearchBar />
        </Suspense>
      </div>

      {/* Category Navigation */}
      <div className="mb-4">
        <Suspense fallback={<div className="category-nav">Loading...</div>}>
          <CategoryNav />
        </Suspense>
      </div>

      {/* Products Section */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="section-title mb-0">
            {search ? `Search results for "${search}"` : category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products` : 'All Products'}
          </h4>
          {pagination && (
            <span className="text-muted">
              Showing {products.length} of {pagination.total} products
            </span>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="alert alert-light border" role="alert">
          {search || category ? 'No products found matching your criteria.' : 'No products yet.'}
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {products.map(p => {
              const isOutOfStock = p.quantity === 0
              const productImage = p.imageUrl || '/images/no-image.svg'
              return (
                <div className="col" key={p.id}>
                  <Link href={`/products/${p.id}`} className="text-decoration-none text-reset">
                    <div className="card card-product h-100">
                      <img
                        src={productImage}
                        className="card-img-top"
                        alt={p.title}
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <div className="card-body">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <h5 className="card-title mb-0">{p.title}</h5>
                          {isOutOfStock ? (
                            <span className="badge text-bg-danger">Out of Stock</span>
                          ) : (
                            <span className="badge text-bg-success">{p.quantity} left</span>
                          )}
                        </div>
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="price">${p.price}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-5">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
