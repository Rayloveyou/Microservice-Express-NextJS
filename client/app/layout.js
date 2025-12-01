import 'bootstrap/dist/css/bootstrap.css'
import '../styles/theme.css'

import Header from '../components/header'
import Footer from '../components/footer'
import { CartProvider } from '../context/cart-context'
import { LoadingProvider } from '../context/loading-context'
import { NotificationsProvider } from '../context/notifications-context'
import { fetchCurrentUser } from '../lib/server-auth'
import { getCookieHeader } from '../lib/get-cookie-header'
import BlockedRedirect from '../components/blocked-redirect'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'E-Commerce - Modern Shopping Experience',
  description: 'Discover amazing products with our modern dark theme shopping platform. Shop. Enjoy. Experience the future of e-commerce.',
  icons: {
    icon: '/favicon.svg',
  }
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const cookieHeader = await getCookieHeader()
  const data = await fetchCurrentUser(cookieHeader)
  const currentUser = data?.currentUser || null
  const blocked = data?.blocked || false

  return (
    <html lang="en">
      <body>
        <BlockedRedirect blocked={blocked} />
        <LoadingProvider>
          <CartProvider currentUser={currentUser} cookiesFromServer={cookieStore}>
            <NotificationsProvider currentUser={currentUser}>
              <div className="app-shell d-flex flex-column min-vh-100">
                <Header currentUser={currentUser} />
                <div className="container flex-grow-1 py-4">{children}</div>
                <Footer />
              </div>
            </NotificationsProvider>
          </CartProvider>
        </LoadingProvider>
      </body>
    </html>
  )
}
