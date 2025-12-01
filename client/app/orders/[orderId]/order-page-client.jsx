'use client'
import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useCart } from '../../../context/cart-context'
import { StripeProvider } from '../../../components/stripe-provider'
import { StripePaymentForm } from '../../../components/stripe-payment-form'
import { useLoading } from '../../../context/loading-context'

export default function OrderPageClient({ order, currentUser, stripeKey }) {
  const totalPrice = typeof order.total === 'number' ? order.total.toFixed(2) : '0.00'

  const { refreshCart } = useCart()
  const { startLoading, stopLoading } = useLoading()
  const [liveOrder, setLiveOrder] = useState(order)
  const statusRef = useRef(order.status)
  const [paying, setPaying] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [confirmToken, setConfirmToken] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const terminal = ['Complete', 'Cancelled']
    if (terminal.includes(statusRef.current)) return

    const poll = async () => {
      try {
        const { data } = await axios.get(`/api/orders/${liveOrder.id}`)
        setLiveOrder(data)
        if (data.status !== statusRef.current) {
          statusRef.current = data.status
          if (['Complete', 'Cancelled'].includes(data.status)) {
            refreshCart()
          }
        }
      } catch {
        // ignore poll errors
      }
    }
    const intervalId = setInterval(poll, 4000)
    return () => clearInterval(intervalId)
  }, [liveOrder.id, refreshCart])

  if (!order) {
    return (
      <div className="mt-4">
        <div className="alert alert-danger">
          <h4>Order Not Loaded</h4>
          <p className="mb-0">Unable to load order details. It may not exist or you lack access.</p>
        </div>
        <Link href="/" className="btn btn-brand">
          Back to Products
        </Link>
      </div>
    )
  }

  const canAct = ['Created', 'created'].includes(liveOrder.status)

  const handleCancel = async () => {
    if (!canAct || canceling) return
    setCanceling(true)
    setErrorMsg(null)
    try {
      startLoading()
      await axios.delete(`/api/orders/${liveOrder.id}`)
      const { data } = await axios.get(`/api/orders/${liveOrder.id}`)
      setLiveOrder(data)
      statusRef.current = data.status
      refreshCart()
    } catch (err) {
      setErrorMsg(err.response?.data?.errors?.[0]?.message || 'Cancel failed')
    } finally {
      setCanceling(false)
      stopLoading()
    }
  }

  const handleToken = async token => {
    if (paying) return
    setPaying(true)
    setErrorMsg(null)
    try {
      startLoading()
      await axios.post('/api/payments', {
        token: token.id,
        orderId: liveOrder.id
      })
      const { data } = await axios.get(`/api/orders/${liveOrder.id}`)
      setLiveOrder(data)
      statusRef.current = data.status
      refreshCart()
    } catch (err) {
      setErrorMsg(err.response?.data?.errors?.[0]?.message || 'Payment failed')
    } finally {
      setPaying(false)
      stopLoading()
    }
  }

  const handleTokenFromForm = token => {
    setConfirmToken(token)
    setShowConfirm(true)
  }

  const handleConfirmYes = async () => {
    if (!confirmToken) {
      setShowConfirm(false)
      return
    }
    setShowConfirm(false)
    await handleToken(confirmToken)
    setConfirmToken(null)
  }

  const handleConfirmNo = () => {
    setShowConfirm(false)
    setConfirmToken(null)
  }

  return (
    <div className="mt-4">
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
            <span className="badge rounded-pill badge-brand mb-2">Order</span>
            <h1 className="display-6 mb-2">Complete Your Purchase</h1>
            <p className="mb-0">Review your order and proceed with payment</p>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card card-product">
            <div className="card-body">
              <h5 className="mb-3">Order Details</h5>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <strong>Order ID:</strong> {order?.id || 'N/A'}
                </li>
                <li className="mb-2">
                  <strong>Customer:</strong> {currentUser?.email || 'N/A'}
                </li>
                <li className="mb-2">
                  <strong>Items:</strong> {order.items ? order.items.length : 0}
                </li>
                <li className="mb-2">
                  <strong>Total Price:</strong> <span className="price">${totalPrice}</span>
                </li>
                <li className="mb-2">
                  <strong>Status:</strong>{' '}
                  <span
                    className={`badge ${liveOrder.status === 'Complete' ? 'text-bg-success' : liveOrder.status === 'Cancelled' ? 'text-bg-secondary' : 'text-bg-warning'}`}
                  >
                    {liveOrder.status}
                  </span>
                </li>
                {order.items && order.items.length > 0 && (
                  <li className="mt-3">
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Unit Price</th>
                            <th>Quantity</th>
                            <th>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((it, idx) => {
                            const unit =
                              typeof it.priceSnapshot === 'number'
                                ? it.priceSnapshot
                                : it.product?.price || 0
                            const qty = it.quantity || 0
                            const line = unit * qty
                            return (
                              <tr key={idx}>
                                <td>{it.titleSnapshot || it.product?.title || 'N/A'}</td>
                                <td>${unit}</td>
                                <td>{qty}</td>
                                <td>${line.toFixed(2)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card card-product">
            <div className="card-body">
              <h5 className="mb-3">Payment</h5>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="fw-semibold">Total</div>
                <div className="fs-5 price">${totalPrice}</div>
              </div>
              {errorMsg && (
                <div className="alert alert-danger py-2" role="alert">
                  {errorMsg}
                </div>
              )}
              {canAct && (
                <div className="d-flex flex-column gap-3">
                  <StripeProvider stripeKey={stripeKey?.trim()}>
                    <StripePaymentForm
                      amount={Math.round((order.total || 0) * 100)}
                      email={currentUser?.email}
                      onToken={handleTokenFromForm}
                      disabled={paying}
                    />
                  </StripeProvider>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={canceling}
                    className="btn btn-outline-danger w-100"
                  >
                    {canceling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              )}
              {!canAct && (
                <p className="text-muted small mb-0">
                  This order is {liveOrder.status.toLowerCase()}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          className="modal fade show"
          tabIndex="-1"
          role="dialog"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Purchase</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleConfirmNo}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  This order can not be cancelled after purchase. Do you want to continue?
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleConfirmNo}>
                  No
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmYes}
                  disabled={paying}
                >
                  Yes, pay now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
