/**
 * Sync products from products database to cart database
 * Run when products are added but cart service wasn't running
 */

const mongoose = require('mongoose');

const PRODUCTS_URI = 'mongodb://mongo:mongo@localhost:27017/products?authSource=admin';
const CART_URI = 'mongodb://mongo:mongo@localhost:27017/cart?authSource=admin';

async function syncProducts() {
  try {
    // Connect to products DB
    const productsConn = await mongoose.createConnection(PRODUCTS_URI).asPromise();
    console.log('Connected to products database');

    // Connect to cart DB
    const cartConn = await mongoose.createConnection(CART_URI).asPromise();
    console.log('Connected to cart database');

    // Get all products
    const productsCollection = productsConn.db.collection('products');
    const products = await productsCollection.find({}).toArray();
    console.log(`Found ${products.length} products in products database`);

    // Get existing products in cart DB
    const cartProductsCollection = cartConn.db.collection('products');
    const existingProducts = await cartProductsCollection.find({}).toArray();
    const existingIds = new Set(existingProducts.map(p => p._id.toString()));
    console.log(`Found ${existingProducts.length} existing products in cart database`);

    // Prepare products to sync (those not in cart DB)
    const productsToSync = products.filter(p => !existingIds.has(p._id.toString()));

    if (productsToSync.length === 0) {
      console.log('All products are already synced!');
      await productsConn.close();
      await cartConn.close();
      return;
    }

    console.log(`Syncing ${productsToSync.length} new products...`);

    // Insert products into cart DB
    const insertOps = productsToSync.map(product => ({
      _id: product._id,
      title: product.title,
      price: product.price,
      quantity: product.quantity,
      category: product.category,
      imageUrl: product.imageUrl,
      version: product.version || 0,
      createdAt: product.createdAt || new Date(),
      updatedAt: product.updatedAt || new Date()
    }));

    if (insertOps.length > 0) {
      await cartProductsCollection.insertMany(insertOps);
      console.log(`✅ Successfully synced ${insertOps.length} products to cart database`);
    }

    // Display summary
    console.log('\n=== Sync Summary ===');
    console.log(`Total products in products DB: ${products.length}`);
    console.log(`Products synced to cart DB: ${insertOps.length}`);
    console.log(`Total products now in cart DB: ${existingProducts.length + insertOps.length}`);

    await productsConn.close();
    await cartConn.close();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error syncing products:', error);
    process.exit(1);
  }
}

syncProducts();
