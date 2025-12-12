import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/globals.css'
import '../styles/theme.css'
import AdminLayoutWrapper from '../components/admin-layout-wrapper'
import { NotificationProvider } from '../context/notification-context'
import { LoadingProvider } from '../context/loading-context'
import { fetchCurrentUser } from '../lib/server-auth'
import { getCookieHeader } from '../lib/get-cookie-header'

export const metadata = {
  title: 'E-Commerce Admin - Dashboard',
  description: 'Modern admin dashboard for e-commerce management',
  icons: {
    icon: '/favicon.svg'
  }
}

export default async function RootLayout({ children }) {
  const cookieHeader = await getCookieHeader()
  const currentUser = await fetchCurrentUser(cookieHeader)

  return (
    <html lang="en">
      <body>
        <LoadingProvider>
          <NotificationProvider>
            <AdminLayoutWrapper currentUser={currentUser}>
              {children}
            </AdminLayoutWrapper>
          </NotificationProvider>
        </LoadingProvider>
      </body>
    </html>
  )
}
