import Link from 'next/link'
import { useCart } from '../context/cart-context'

export default ({ currentUser }) => {
    const { cartCount } = useCart()
    
    const links = [
        !currentUser && { label: 'Sign Up', href: '/auth/signup' },
        !currentUser && { label: 'Sign In', href: '/auth/signin' },
        currentUser && { label: 'Sell Products', href: '/products/new' },
        currentUser && { label: 'My Orders', href: '/orders' },
        currentUser && { label: 'Sign Out', href: '/auth/signout' }
    ].filter(linkConfig => linkConfig)// Remove falsy values
    .map(({ label, href }) => { 
        return (
            <li key={href} className="nav-item">
                <Link href={href} className="nav-link">{label}</Link>
            </li>
        )
    })

    return <nav className="navbar navbar-light bg-light"> 
    <Link href="/" className="navbar-brand">Shop</Link>
    <div className="d-flex justify-content-end">
        <ul className="nav d-flex align-items-center">
            {/* Cart link with badge */}
            {currentUser && (
                <li className="nav-item me-2">
                    <Link href="/cart" className="nav-link position-relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        {cartCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                {cartCount}
                            </span>
                        )}
                    </Link>
                </li>
            )}
            {/* If currentUser is defined -> show sign out link */}
            {links}
        </ul>
    </div>
    </nav>
}
