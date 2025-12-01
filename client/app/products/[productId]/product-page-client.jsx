'use client'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '../../../context/cart-context'

export default function ProductPageClient({ product = {}, currentUser }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isOutOfStock = product.quantity === 0
  const stockStatus = isOutOfStock ? 'Out of Stock' : `${product.quantity} in stock`
  const productImage = product.imageUrl || '/images/no-image.svg'

  const handleQuantityChange = e => {
    const value = parseInt(e.target.value, 10)
    if (value > 0 && value <= product.quantity) {
      setQuantity(value)
    }
  }

  const handleAddToCart = async () => {
    if (!currentUser) {
      router.push('/auth/signin')
      return
    }

    setLoading(true)
    setError(null)

    const result = await addToCart(product.id, quantity)

    setLoading(false)

    if (result.success) {
      router.push('/cart')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="mt-4">
      {/* Hero */}
      <div className="hero brand-gradient mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          {!currentUser && (
            <div className="d-flex gap-2">
              <a className="btn btn-outline-brand btn-sm" href="/auth/signin">
                Sign in
              </a>
              <a className="btn btn-brand btn-sm" href="/auth/signup">
                Create account
              </a>
            </div>
          )}
          <div>
            <span className="badge rounded-pill badge-brand mb-2">Product</span>
            <h1 className="display-6 mb-2">{product.title || 'Product'}</h1>
            <p className="mb-0">Securely purchase your favorite products.</p>
          </div>
          <div className="text-end">
            <div className="fw-semibold">Price</div>
            <div className="fs-3">${product.price}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card card-product mb-4">
            <img
              src={productImage}
              className="card-img-top"
              alt={product.title}
              style={{ height: '400px', objectFit: 'cover' }}
              onError={e => {
                e.currentTarget.src = '/images/no-image.svg'
              }}
            />
          </div>
          <div className="card card-product">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Details</h5>
                {isOutOfStock ? (
                  <span className="badge text-bg-danger">Out of Stock</span>
                ) : (
                  <span className="badge text-bg-success">In Stock</span>
                )}
              </div>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Title:</strong> {product.title}
                </li>
                <li className="mb-2">
                  <strong>Price:</strong> ${product.price}
                </li>
                <li className="mb-2">
                  <strong>Stock:</strong> {stockStatus}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card card-product">
            <div className="card-body d-grid gap-2">
              <div className="d-flex align-items-center justify-content-between">
                <div className="fw-semibold">Price</div>
                <div className="fs-5 price">${product.price}</div>
              </div>
              {!isOutOfStock && (
                <div>
                  <label htmlFor="quantity" className="form-label mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    className="form-control"
                    min="1"
                    max={product.quantity}
                    value={quantity}
                    onChange={handleQuantityChange}
                  />
                  <div className="text-muted small mt-1">Max: {product.quantity}</div>
                </div>
              )}
              <div className="d-flex align-items-center justify-content-between">
                <div className="fw-semibold">Total</div>
                <div className="fs-5 price">${(product.price * quantity).toFixed(2)}</div>
              </div>
              {isOutOfStock ? (
                <button className="btn btn-secondary" disabled>
                  Out of Stock
                </button>
              ) : (
                <button onClick={handleAddToCart} className="btn btn-brand" disabled={loading}>
                  {loading ? 'Adding...' : `Add ${quantity} to Cart`}
                </button>
              )}
              {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}
              <Link className="btn btn-outline-secondary" href="/">
                Back to products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
