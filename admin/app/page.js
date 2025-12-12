import { Suspense } from 'react'
import MetricsCard from '../components/metrics-card'
import DailyOrdersChart from '../components/daily-orders-chart'
import RecentOrdersTable from '../components/recent-orders-table'
import TopProductsWidget from '../components/top-products-widget'
import { SkeletonDashboard } from '../components/ui/skeleton-loader'
import buildClient from '../api/build-client'
import { getCookieHeader } from '../lib/get-cookie-header'
import { fetchCurrentUser } from '../lib/server-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function DashboardContent() {
  const cookieHeader = await getCookieHeader()

  // Check admin authentication
  const currentUser = await fetchCurrentUser(cookieHeader)
  if (!currentUser) {
    return (
      <div className="dashboard-grid">
        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '48px',
            borderRadius: '16px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Admin Access Required</h2>
          <p>Please sign in with an admin account to access the dashboard.</p>
          <a
            href="/auth/signin"
            style={{
              display: 'inline-block',
              marginTop: '24px',
              padding: '12px 24px',
              background: 'var(--gradient-primary)',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  try {
    const client = buildClient({ headers: { cookie: cookieHeader } })

    // Calculate date range (last 7 days)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data } = await client.get(`/api/orders/admin/analytics?startDate=${startDate}&endDate=${endDate}`)

    return (
      <div className="dashboard-grid">
        {/* Welcome message */}
        <div className="mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Welcome back, {currentUser.email}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your store today.</p>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-row">
          <MetricsCard title="Total Orders" value={data.metrics.totalOrders} icon="📦" />
          <MetricsCard
            title="Total Revenue"
            value={`$${data.metrics.totalRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`}
            icon="💰"
          />
          <MetricsCard title="Today's Orders" value={data.metrics.todayOrders} icon="📈" />
          <MetricsCard
            title="Today's Revenue"
            value={`$${data.metrics.todayRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`}
            icon="💵"
          />
        </div>

        {/* Daily Orders Chart */}
        <DailyOrdersChart data={data.dailyOrders} />

        {/* Recent Orders & Top Products */}
        <div className="widgets-row">
          <RecentOrdersTable orders={data.recentOrders} />
          <TopProductsWidget products={data.topProducts} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Dashboard error:', error?.message || error)

    // Check if it's an auth error
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403

    return (
      <div className="dashboard-grid">
        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '48px',
            borderRadius: '16px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
            {isAuthError ? 'Session Expired' : 'Unable to load dashboard'}
          </h2>
          <p>{isAuthError ? 'Your session has expired. Please sign in again.' : 'There was an error loading the dashboard data.'}</p>
          {isAuthError ? (
            <a
              href="/auth/signin"
              style={{
                display: 'inline-block',
                marginTop: '24px',
                padding: '12px 24px',
                background: 'var(--gradient-primary)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Sign In
            </a>
          ) : (
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-block',
                marginTop: '24px',
                padding: '12px 24px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }
}

export default function HomePage() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <DashboardContent />
    </Suspense>
  )
}
