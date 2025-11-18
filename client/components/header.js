import Link from 'next/link'
import { useCart } from '../context/cart-context'

const getInitials = (email = '') => {
  const prefix = email.split('@')[0] || ''
  return prefix.slice(0, 3).toUpperCase()
}

export default function Header({ currentUser }) {
  const { cartCount } = useCart()

  const links = [
    !currentUser && { label: 'Sign Up', href: '/auth/signup' },
    !currentUser && { label: 'Sign In', href: '/auth/signin' },
    currentUser && { label: 'Sell Products', href: '/products/new' },
    currentUser && { label: 'My Orders', href: '/orders' },
    currentUser && { label: 'Sign Out', href: '/auth/signout' }
  ]
    .filter(Boolean)
    .map(({ label, href }) => (
      <li key={href} className="nav-item">
        <Link href={href} className="nav-link nav-link-custom text-white-50">
          {label}
        </Link>
      </li>
    ))

  return (
    <header className="app-header brand-gradient text-white">
      <div className="container py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <Link href="/" className="logo text-decoration-none text-white d-flex align-items-center">
          <div className="logo-mark me-2">E</div>
          <div>
            <div className="fw-semibold">E-Commerce</div>
            <small className="text-white-50">Discover. Shop. Enjoy.</small>
          </div>
        </Link>

        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-end">
          <Link href="/cart" className="cart-pill text-white text-decoration-none d-flex align-items-center gap-2 position-relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="cart-count badge rounded-pill">{cartCount}</span>
            )}
          </Link>

          {currentUser && (
            <div className="user-pill text-white d-flex align-items-center gap-2">
              <div className="user-icon position-relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                </svg>
                <span className="user-badge">{getInitials(currentUser.email)}</span>
              </div>
              <div className="d-flex flex-column lh-1">
                <small className="text-white-50">Xin chào</small>
                <span className="fw-semibold">{getInitials(currentUser.email)}</span>
              </div>
            </div>
          )}

          <ul className="nav align-items-center">{links}</ul>
        </div>
      </div>
    </header>
  )
}
