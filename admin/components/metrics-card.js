'use client'

export default function MetricsCard({ title, value, icon, change }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div className="metric-card-title">{title}</div>
        <div className="metric-card-icon">{icon}</div>
      </div>
      <div className="metric-card-value">{value}</div>
      {change !== undefined && (
        <div className={`metric-card-change ${change < 0 ? 'negative' : ''}`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : '→'} {Math.abs(change)}%
        </div>
      )}
    </div>
  )
}
