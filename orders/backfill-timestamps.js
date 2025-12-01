/**
 * Script to backfill createdAt and updatedAt fields for existing orders
 * Run this once after enabling timestamps in the Order model
 *
 * Usage: node backfill-order-timestamps.js
 */

const mongoose = require('mongoose');

// MongoDB connection string - using local development settings
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:mongo@localhost:27017/orders?authSource=admin';

async function backfillTimestamps() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');

    // Find all orders without createdAt field
    const ordersWithoutTimestamps = await ordersCollection.find({
      createdAt: { $exists: false }
    }).toArray();

    console.log(`Found ${ordersWithoutTimestamps.length} orders without timestamps`);

    if (ordersWithoutTimestamps.length === 0) {
      console.log('No orders to update. All orders have timestamps.');
      await mongoose.connection.close();
      return;
    }

    // Backfill timestamps
    // Use _id ObjectId timestamp as createdAt (MongoDB ObjectIds contain creation timestamp)
    const bulkOps = ordersWithoutTimestamps.map(order => {
      const createdAtFromObjectId = order._id.getTimestamp();
      return {
        updateOne: {
          filter: { _id: order._id },
          update: {
            $set: {
              createdAt: createdAtFromObjectId,
              updatedAt: createdAtFromObjectId
            }
          }
        }
      };
    });

    console.log('Updating orders with timestamps...');
    const result = await ordersCollection.bulkWrite(bulkOps);
    console.log(`Successfully updated ${result.modifiedCount} orders`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error backfilling timestamps:', error);
    process.exit(1);
  }
}

backfillTimestamps();
