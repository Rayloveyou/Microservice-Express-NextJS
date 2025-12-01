import MetricsCard from '../components/metrics-card'
import DailyOrdersChart from '../components/daily-orders-chart'
import RecentOrdersTable from '../components/recent-orders-table'
import TopProductsWidget from '../components/top-products-widget'
import buildClient from '../api/build-client'
import { getCookieHeader } from '../lib/get-cookie-header'

export default async function HomePage() {
  try {
    const cookieHeader = await getCookieHeader()
    const client = buildClient({ headers: { cookie: cookieHeader } })

    // Calculate date range (last 7 days)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data } = await client.get(
      `/api/orders/admin/analytics?startDate=${startDate}&endDate=${endDate}`
    )

    return (
      <div className="dashboard-grid">
        {/* Metrics Cards */}
        <div className="metrics-row">
          <MetricsCard
            title="Total Orders"
            value={data.metrics.totalOrders}
            icon="📦"
          />
          <MetricsCard
            title="Total Revenue"
            value={`$${data.metrics.totalRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`}
            icon="💰"
          />
          <MetricsCard
            title="Today's Orders"
            value={data.metrics.todayOrders}
            icon="📈"
          />
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
    console.error('Dashboard error:', error)
    return (
      <div className="dashboard-grid">
        <div style={{
          background: 'var(--bg-surface)',
          padding: '48px',
          borderRadius: '16px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
            Unable to load dashboard
          </h2>
          <p>Please ensure you are signed in as an admin.</p>
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
}
