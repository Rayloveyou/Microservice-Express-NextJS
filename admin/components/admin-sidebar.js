'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminSidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/products', label: 'Products', icon: '📦' },
    { href: '/orders', label: 'Orders', icon: '📋' },
    { href: '/users', label: 'Users', icon: '👥' }
  ]

  const isActive = (href) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <img src="/logo.svg" alt="Logo" width="32" height="32" />
          <span>Admin</span>
        </Link>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
