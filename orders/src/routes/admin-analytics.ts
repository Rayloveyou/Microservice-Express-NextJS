import express, { Request, Response } from 'express';
import { Order } from '../models/order';
import { requireAuth, requireAdmin } from '@datnxecommerce/common';

const router = express.Router();

router.get(
  '/api/orders/admin/analytics',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get date range from query params or default to last 7 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get daily orders aggregation (only completed orders for the graph)
      const dailyOrdersRaw = await Order.aggregate([
        {
          $match: {
            status: 'complete',
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $project: {
            date: '$_id',
            count: 1,
            revenue: { $round: ['$revenue', 2] },
            _id: 0,
          },
        },
      ]);

      // Fill in missing dates with 0 to ensure continuous data
      const dailyOrders = [];
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingData = dailyOrdersRaw.find(d => d.date === dateStr);

        dailyOrders.push({
          date: dateStr,
          count: existingData?.count || 0,
          revenue: existingData?.revenue || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get total metrics (only completed orders)
      const totalOrders = await Order.countDocuments({ status: 'complete' });

      const totalRevenueResult = await Order.aggregate([
        { $match: { status: 'complete' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);
      const totalRevenue = totalRevenueResult[0]?.total || 0;

      // Get today's metrics (only completed orders)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayOrders = await Order.countDocuments({
        status: 'complete',
        createdAt: { $gte: today, $lt: tomorrow },
      });

      const todayRevenueResult = await Order.aggregate([
        { $match: { status: 'complete', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]);
      const todayRevenue = todayRevenueResult[0]?.total || 0;

      // Get top products from order items (only completed orders)
      const topProducts = await Order.aggregate([
        { $match: { status: 'complete' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            title: { $first: '$items.title' },
            salesCount: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { salesCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            productId: '$_id',
            title: 1,
            salesCount: 1,
            revenue: { $round: ['$revenue', 2] },
            _id: 0,
          },
        },
      ]);

      // Get recent orders (only completed orders)
      const recentOrdersRaw = await Order.find({ status: 'complete' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('userId userEmail status total createdAt')
        .lean();

      // Transform _id to id for recent orders
      const recentOrders = recentOrdersRaw.map((order: any) => ({
        id: order._id.toString(),
        userId: order.userId,
        userEmail: order.userEmail,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
      }));

      res.send({
        dailyOrders,
        metrics: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          todayOrders,
          todayRevenue: Math.round(todayRevenue * 100) / 100,
        },
        topProducts,
        recentOrders,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).send({ errors: [{ message: 'Failed to fetch analytics' }] });
    }
  }
);

export { router as adminAnalyticsRouter };
