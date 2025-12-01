import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/globals.css'
import '../styles/theme.css'
import SessionRefresher from '../components/session-refresher'
import AdminSidebar from '../components/admin-sidebar'
import AdminHeader from '../components/admin-header'

export const metadata = {
  title: 'E-Commerce Admin - Dashboard',
  description: 'Modern admin dashboard for e-commerce management',
  icons: {
    icon: '/favicon.svg',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionRefresher />
        <div className="admin-layout">
          <AdminSidebar />

          <div className="admin-main">
            <AdminHeader />
            <main className="admin-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
