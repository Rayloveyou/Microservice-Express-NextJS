# Dark Theme Implementation Guide

**Status**: IN PROGRESS
**Completed**: Phase 1 (Design System)
**Remaining**: Phases 2-5

---

## ✅ COMPLETED

### Phase 1: Design System Setup

#### Client Theme CSS (`client/styles/theme.css`)
- ✅ Dark color palette (TikTok-inspired)
- ✅ Gradient utilities (cyan/pink)
- ✅ Button styles with hover effects
- ✅ Card animations
- ✅ Form dark styling
- ✅ Loading spinner
- ✅ Skeleton loader
- ✅ Toast notifications
- ✅ Responsive utilities

#### Admin Theme CSS (`admin/styles/theme.css`)
- ✅ Same design tokens as Client
- ✅ Admin layout (sidebar + main content)
- ✅ Dashboard grid system
- ✅ Metrics cards
- ✅ Chart section styles
- ✅ Data tables dark theme
- ✅ Status badges
- ✅ Top products widget styles
- ✅ Modal styles
- ✅ Form dark styling
- ✅ Responsive design

---

## 📋 NEXT STEPS TO COMPLETE

### Phase 2: Client Frontend Updates

Run these commands to continue:

```bash
# Continue implementation với Claude Code
Hãy tiếp tục implement Phase 2: Update Client components theo plan dark-theme-redesign-plan.md
```

**What needs to be done:**

1. **Update Layout** (`client/app/layout.js`):
   - Import theme.css
   - Apply dark body background
   - Update metadata

2. **Update Header** (`client/components/header.js`):
   - Already has most styles
   - May need minor tweaks for consistency

3. **Update Homepage** (`client/app/page.js`):
   - Update hero section
   - Product grid with skeleton loaders

4. **Update Product Pages**:
   - `client/app/products/page.jsx`
   - `client/app/products/[productId]/product-page-client.jsx`

5. **Update Cart** (`client/app/cart/cart-page-client.jsx`)

6. **Update Auth Pages**:
   - `client/app/auth/signin/signin-client.js`
   - `client/app/auth/signup/signup-client.js`

7. **Create Loading Components**:
   - `client/components/ui/loading-spinner.js`
   - `client/components/ui/skeleton-loader.js`

### Phase 3: Admin Dashboard with Analytics

**Most Important Phase!**

#### 3.1 Install Chart Library

```bash
cd admin
npm install recharts
```

#### 3.2 Create Backend Analytics Endpoint

File: `orders/src/routes/admin-analytics.ts`

```typescript
import express, { Request, Response } from 'express';
import { Order } from '../models/order';
import { requireAuth, requireAdmin } from '@datnxecommerce/common';

const router = express.Router();

router.get(
  '/api/orders/admin/analytics',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    // Get daily orders aggregation
    const dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate as string),
            $lte: new Date(endDate as string)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    // Get metrics
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Get top products (from order items)
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          salesCount: { $sum: '$items.quantity' }
        }
      },
      { $sort: { salesCount: -1 } },
      { $limit: 5 }
    ]);

    res.send({
      dailyOrders,
      metrics: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0
      },
      topProducts
    });
  }
);

export { router as adminAnalyticsRouter };
```

Then add to `orders/src/app.ts`:
```typescript
import { adminAnalyticsRouter } from './routes/admin-analytics';
app.use(adminAnalyticsRouter);
```

#### 3.3 Create Dashboard Components

**File: `admin/components/metrics-card.js`**

```javascript
export default function MetricsCard({ title, value, icon, change }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div className="metric-card-title">{title}</div>
        <div className="metric-card-icon">{icon}</div>
      </div>
      <div className="metric-card-value">{value}</div>
      {change && (
        <div className={`metric-card-change ${change < 0 ? 'negative' : ''}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
```

**File: `admin/components/daily-orders-chart.js`**

```javascript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyOrdersChart({ data }) {
  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3 className="chart-title">Daily Orders</h3>
        <div className="chart-controls">
          <button className="chart-control-btn active">7 Days</button>
          <button className="chart-control-btn">30 Days</button>
          <button className="chart-control-btn">90 Days</button>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00f2ea" />
                <stop offset="100%" stopColor="#ff0050" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '12px',
                color: '#ffffff'
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="url(#colorOrders)"
              strokeWidth={3}
              dot={{ fill: '#00f2ea', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**File: `admin/app/page.jsx`** (Dashboard)

```javascript
import MetricsCard from '@/components/metrics-card';
import DailyOrdersChart from '@/components/daily-orders-chart';
import buildClient from '@/lib/build-client';

export default async function AdminDashboard() {
  const client = buildClient();

  // Calculate date range (last 7 days)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data } = await client.get(`/api/orders/admin/analytics?startDate=${startDate}&endDate=${endDate}`);

  return (
    <div className="admin-content">
      <h1 className="admin-header-title">Dashboard</h1>

      <div className="dashboard-grid">
        <div className="metrics-row">
          <MetricsCard
            title="Total Orders"
            value={data.metrics.totalOrders}
            icon="📦"
          />
          <MetricsCard
            title="Total Revenue"
            value={`$${data.metrics.totalRevenue.toFixed(2)}`}
            icon="💰"
          />
          <MetricsCard
            title="Today's Orders"
            value={data.metrics.todayOrders}
            icon="📈"
          />
          <MetricsCard
            title="Today's Revenue"
            value={`$${data.metrics.todayRevenue.toFixed(2)}`}
            icon="💵"
          />
        </div>

        <DailyOrdersChart data={data.dailyOrders} />

        {/* Add Recent Orders Table and Top Products Widget here */}
      </div>
    </div>
  );
}
```

### Phase 4: Loading Components

**File: `client/components/ui/loading-spinner.js`**

```javascript
export default function LoadingSpinner() {
  return <div className="spinner-gradient" />;
}
```

**File: `client/components/ui/skeleton-card.js`**

```javascript
export default function SkeletonCard() {
  return (
    <div className="card-product">
      <div className="skeleton" style={{ height: '200px' }} />
      <div className="card-body">
        <div className="skeleton" style={{ height: '24px', marginBottom: '12px' }} />
        <div className="skeleton" style={{ height: '20px', width: '60%' }} />
      </div>
    </div>
  );
}
```

### Phase 5: Testing

```bash
# Start Client
cd client
npm run dev

# Start Admin
cd admin
npm run dev

# Test on different screens:
# - Mobile (iPhone SE, iPhone 12)
# - Tablet (iPad)
# - Desktop (1920x1080)
```

---

## 🎯 QUICK START TO CONTINUE

### Option 1: Continue with Claude Code

Ask Claude Code:
```
Tiếp tục implement Phase 2 theo file plans/dark-theme-redesign-plan.md,
bắt đầu với việc update Client layout và components
```

### Option 2: Manual Implementation

1. Copy code từ guide này
2. Tạo các files theo structure
3. Test từng page một

---

## 📊 PROGRESS TRACKER

- [x] Phase 1: Design System (100%)
  - [x] Client theme.css
  - [x] Admin theme.css

- [ ] Phase 2: Client Frontend (0%)
  - [ ] Update layout
  - [ ] Update components
  - [ ] Update pages

- [ ] Phase 3: Admin Dashboard (0%)
  - [ ] Backend analytics API
  - [ ] Install Recharts
  - [ ] Dashboard components
  - [ ] Charts

- [ ] Phase 4: Loading States (0%)
  - [ ] Loading spinner
  - [ ] Skeleton loaders
  - [ ] Toast notifications

- [ ] Phase 5: Testing (0%)
  - [ ] Responsive testing
  - [ ] Browser testing
  - [ ] Accessibility testing

---

## 🚀 ESTIMATED TIME REMAINING

- Phase 2: 4-6 hours
- Phase 3: 6-8 hours (including backend)
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours

**Total**: ~14-20 hours of development

---

## 💡 TIPS

1. **Test incrementally**: Test each component as you build it
2. **Use Chrome DevTools**: For responsive testing
3. **Check console**: For any errors
4. **Commit often**: Git commit after each major change
5. **Dark theme**: Make sure to test contrast for accessibility

---

## ❓ NEED HELP?

Ask Claude Code to:
- "Continue implementation from Phase 2"
- "Create the analytics dashboard component"
- "Fix responsive issues on mobile"
- "Add loading skeletons to product grid"

---

**Last Updated**: 2025-12-01
**Status**: Theme CSS completed, components implementation pending
