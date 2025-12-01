export const metadata = {
  title: 'Access Restricted'
}

export default function BlockedPage() {
  return (
    <div className="mt-4">
      <div className="hero brand-gradient mb-4">
        <div>
          <span className="badge rounded-pill badge-brand mb-2">Account</span>
          <h1 className="display-6 mb-2">Access Restricted</h1>
          <p className="mb-0">
            Sorry, your account has been blocked. Please contact admin support if you
            believe this is a mistake.
          </p>
        </div>
      </div>

      <div className="card card-product">
        <div className="card-body">
          <p className="mb-0">
            You cannot use this account at the moment. Try signing in with another
            account, or reach out to the administrator for more details.
          </p>
        </div>
      </div>
    </div>
  )
}

