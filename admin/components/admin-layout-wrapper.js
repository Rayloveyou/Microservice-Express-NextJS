'use client'

import { usePathname } from 'next/navigation'
import AdminSidebar from './admin-sidebar'
import AdminHeader from './admin-header'
import SessionRefresher from './session-refresher'

export default function AdminLayoutWrapper({ children, currentUser }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')

  // Don't show sidebar/header on auth pages
  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <SessionRefresher />
      <div className="admin-layout">
        <AdminSidebar currentUser={currentUser} />
        <div className="admin-main">
          <AdminHeader currentUser={currentUser} />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </>
  )
}
