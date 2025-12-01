import Link from 'next/link'

const adminLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/products', label: 'Products' },
  { href: '/users', label: 'Users' },
  { href: '/orders', label: 'Orders' }
]

export const AdminLayout = ({ children, activePath }) => {
  return (
    <div className="row g-4">
      <div className="col-12 col-md-3 col-lg-2">
        <div className="card">
          <div className="card-body py-3">
            <div className="fw-semibold mb-2">Admin</div>
            <div className="list-group list-group-flush">
              {adminLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    'list-group-item list-group-item-action px-0 py-1 border-0' +
                    (activePath === link.href ? ' fw-semibold text-primary' : '')
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="col-12 col-md-9 col-lg-10">{children}</div>
    </div>
  )
}
