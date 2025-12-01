'use client'

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

export default function DailyOrdersChart({ data }) {
  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3 className="chart-title">📈 Daily Orders (Last 7 Days)</h3>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00f2ea" />
                <stop offset="100%" stopColor="#ff0050" />
              </linearGradient>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f2ea" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff0050" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#a1a1aa"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#a1a1aa"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                color: '#ffffff',
                padding: '12px'
              }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
              itemStyle={{ color: '#00f2ea' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="url(#colorOrders)"
              fill="url(#colorGradient)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
