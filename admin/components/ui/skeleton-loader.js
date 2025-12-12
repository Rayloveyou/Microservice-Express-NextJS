'use client'

export default function SkeletonLoader({ width = '100%', height = '20px', className = '', borderRadius = '6px' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  )
}

// Skeleton card for dashboard metrics
export function SkeletonMetricCard() {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <SkeletonLoader width="60%" height="14px" />
        <SkeletonLoader width="40px" height="40px" borderRadius="12px" />
      </div>
      <SkeletonLoader width="50%" height="32px" className="my-3" />
      <SkeletonLoader width="30%" height="14px" />
    </div>
  )
}

// Skeleton for table rows
export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <SkeletonLoader width={i === 0 ? '80%' : '60%'} height="16px" />
        </td>
      ))}
    </tr>
  )
}

// Skeleton for data table
export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <SkeletonLoader width="150px" height="24px" />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <SkeletonLoader width="80px" height="14px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Skeleton for chart section
export function SkeletonChart() {
  return (
    <div className="chart-section">
      <div className="chart-header">
        <SkeletonLoader width="200px" height="24px" />
      </div>
      <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '24px' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonLoader
            key={i}
            width="100%"
            height={`${Math.random() * 150 + 50}px`}
            borderRadius="8px 8px 0 0"
          />
        ))}
      </div>
    </div>
  )
}

// Full dashboard skeleton
export function SkeletonDashboard() {
  return (
    <div className="dashboard-grid">
      {/* Metrics Row */}
      <div className="metrics-row">
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
        <SkeletonMetricCard />
      </div>

      {/* Chart */}
      <SkeletonChart />

      {/* Widgets Row */}
      <div className="widgets-row">
        <SkeletonTable rows={5} columns={4} />
        <div className="top-products-widget">
          <SkeletonLoader width="150px" height="24px" className="mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="product-item">
              <SkeletonLoader width="48px" height="48px" borderRadius="12px" />
              <div className="product-info">
                <SkeletonLoader width="80%" height="14px" className="mb-2" />
                <SkeletonLoader width="40%" height="12px" />
              </div>
              <SkeletonLoader width="80px" height="6px" borderRadius="99px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
