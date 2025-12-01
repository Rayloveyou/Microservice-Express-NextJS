'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '../../context/cart-context'
import UseRequest from '../../hooks/use-request'

export default function CartPageClient({ currentUser }) {
  const router = useRouter()
  const { cart, removeFromCart, refreshCart } = useCart()
  const [removing, setRemoving] = useState(null)

  const { doRequest, errors, loading } = UseRequest({
    url: '/api/cart/checkout',
    method: 'post',
    body: {},
    onSuccess: data => {
      const order = data?.order
      refreshCart()
      router.push(order?.id ? `/orders/${order.id}` : '/orders')
    }
  })

  if (!currentUser) {
    return (
      <div className="mt-4">
        <div className="alert alert-warning">
          Please <Link href="/auth/signin">sign in</Link> to view your cart.
        </div>
      </div>
    )
  }

  const handleRemove = async productId => {
    setRemoving(productId)
    const result = await removeFromCart(productId)
    setRemoving(null)
    if (!result.success) {
      alert(result.error)
    }
  }

  // Normalize items so we still show entries even if product snapshot is missing
  const normalizedItems = (cart?.items || [])
    .filter(i => i && typeof i.quantity === 'number')
    .map(item => {
      const product = item.product || {
        id: item.productId,
        title: 'Product unavailable',
        price: 0,
        quantity: 0,
        missing: true
      }
      return { ...item, product }
    })

  const totalPrice = normalizedItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  )
  const totalItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="mt-4">
      {/* Hero */}
      <div className="hero brand-gradient mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="badge rounded-pill badge-brand mb-2">Shopping Cart</span>
            <h1 className="display-6 mb-2">Your Cart</h1>
            <p className="mb-0">Review items and proceed to checkout</p>
          </div>
        </div>
      </div>

      {/* Cart Content */}
      {!cart || cart.items?.length === 0 ? (
        <div className="card card-product">
          <div className="card-body text-center py-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              fill="currentColor"
              className="text-muted mb-3"
              viewBox="0 0 16 16"
            >
              <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            <h5>Your cart is empty</h5>
            <p className="text-muted mb-3">Add some products to get started</p>
            <Link href="/" className="btn btn-brand">
              Browse Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="card card-product">
              <div className="card-body">
                <h5 className="mb-3">Cart Items ({cart.items.length})</h5>
                {normalizedItems.map(item => {
                  const itemTotal = item.product.price * item.quantity
                  const isOutOfStock =
                    typeof item.product.quantity === 'number' &&
                    item.product.quantity < item.quantity

                  return (
                    <div
                      key={item.product.id}
                      className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3"
                    >
                      <div className="flex-grow-1">
                        <Link
                          href={`/products/${item.product.id}`}
                          className="text-decoration-none"
                        >
                          <h6 className="mb-1">{item.product.title}</h6>
                        </Link>
                        <div className="text-muted small">
                          ${item.product.price} × {item.quantity} = ${itemTotal.toFixed(2)}
                        </div>
                        {isOutOfStock && (
                          <div className="text-danger small mt-1">
                            ⚠️ Only {item.product.quantity} in stock
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold mb-2">${itemTotal.toFixed(2)}</div>
                        {item.locked ? (
                          <span className="badge text-bg-secondary">Locked</span>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemove(item.product.id)}
                            disabled={removing === item.product.id}
                          >
                            {removing === item.product.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card card-product">
              <div className="card-body">
                <h5 className="mb-3">Order Summary</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Items ({totalItems})</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                  <span>Shipping</span>
                  <span className="text-success">Free</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold fs-5 price">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  className="btn btn-brand w-100 mb-2"
                  onClick={() => {
                    const itemsPayload = normalizedItems.map(item => ({
                      productId: item.product.id,
                      quantity: item.quantity
                    }))
                    doRequest({ items: itemsPayload })
                  }}
                  disabled={!normalizedItems.length || loading}
                >
                  {loading ? 'Processing checkout...' : 'Proceed to Checkout'}
                </button>
                {errors && <div className="alert alert-danger mt-2 mb-0">{errors}</div>}
                <Link href="/" className="btn btn-outline-secondary w-100">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
