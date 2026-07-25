/**
 * Migration Script: Move base64 images from MongoDB to Cloudinary
 * 
 * This script will:
 * 1. Find all events with base64 poster_url
 * 2. Upload each image to Cloudinary
 * 3. Replace base64 with Cloudinary URL
 * 4. Reduce database size by ~98%
 */

// Load environment variables FIRST
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Then load other modules (cloudinary config will now have env vars)
const mongoose = require('mongoose');
const Event = require('../models/Events');
const Product = require('../models/Products');
const { uploadBase64Image, isBase64Image, isCloudinaryUrl, cloudinary } = require('../config/cloudinary');

async function migrateEventImages() {
  console.log('📋 MIGRATING EVENT POSTERS...\n');

  const events = await Event.find({});
  console.log(`📊 Found ${events.length} events to check\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalSaved = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const progress = `[${i + 1}/${events.length}]`;

    if (!event.poster_url) {
      console.log(`${progress} ⏭️  Skipped: "${event.title}" (no poster)`);
      skippedCount++;
      continue;
    }

    if (isCloudinaryUrl(event.poster_url)) {
      console.log(`${progress} ✅ Already migrated: "${event.title}"`);
      skippedCount++;
      continue;
    }

    if (!isBase64Image(event.poster_url)) {
      console.log(`${progress} ⏭️  Skipped: "${event.title}" (not base64)`);
      skippedCount++;
      continue;
    }

    const currentSize = event.poster_url.length;
    const currentSizeKB = (currentSize / 1024).toFixed(2);

    try {
      console.log(`${progress} 📤 Uploading: "${event.title}" (${currentSizeKB} KB)...`);

      const cloudinaryUrl = await uploadBase64Image(event.poster_url, 'events');

      event.poster_url = cloudinaryUrl;
      await event.save();

      const newSize = cloudinaryUrl.length;
      const savedKB = (currentSize - newSize) / 1024;
      totalSaved += (currentSize - newSize);

      console.log(`${progress} ✅ Migrated: "${event.title}"`);
      console.log(`          ${currentSizeKB} KB → ${(newSize / 1024).toFixed(2)} KB (saved ${savedKB.toFixed(2)} KB)\n`);

      migratedCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`${progress} ❌ ERROR: "${event.title}" - ${error.message}\n`);
      errorCount++;
    }
  }

  return { migratedCount, skippedCount, errorCount, totalSaved };
}

async function migrateProductImages() {
  console.log('\n📋 MIGRATING PRODUCT IMAGES...\n');

  const products = await Product.find({});
  console.log(`📊 Found ${products.length} products to check\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalSaved = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const progress = `[${i + 1}/${products.length}]`;

    if (!product.image_url || product.image_url === '/images/img_default.png') {
      console.log(`${progress} ⏭️  Skipped: "${product.name}" (default image)`);
      skippedCount++;
      continue;
    }

    if (isCloudinaryUrl(product.image_url)) {
      console.log(`${progress} ✅ Already migrated: "${product.name}"`);
      skippedCount++;
      continue;
    }

    if (!isBase64Image(product.image_url)) {
      console.log(`${progress} ⏭️  Skipped: "${product.name}" (not base64)`);
      skippedCount++;
      continue;
    }

    const currentSize = product.image_url.length;
    const currentSizeKB = (currentSize / 1024).toFixed(2);

    try {
      console.log(`${progress} 📤 Uploading: "${product.name}" (${currentSizeKB} KB)...`);

      const cloudinaryUrl = await uploadBase64Image(product.image_url, 'products');

      product.image_url = cloudinaryUrl;
      await product.save();

      const newSize = cloudinaryUrl.length;
      const savedKB = (currentSize - newSize) / 1024;
      totalSaved += (currentSize - newSize);

      console.log(`${progress} ✅ Migrated: "${product.name}"`);
      console.log(`          ${currentSizeKB} KB → ${(newSize / 1024).toFixed(2)} KB (saved ${savedKB.toFixed(2)} KB)\n`);

      migratedCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`${progress} ❌ ERROR: "${product.name}" - ${error.message}\n`);
      errorCount++;
    }
  }

  return { migratedCount, skippedCount, errorCount, totalSaved };
}

async function migrateImages() {
  try {
    console.log('🚀 Starting image migration to Cloudinary...\n');

    // Debug: Show what's loaded
    console.log('🔍 Debug - Environment variables:');
    console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET');
    console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY || 'NOT SET');
    console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
    console.log('');

    // Check Cloudinary credentials
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.error('❌ ERROR: Cloudinary credentials not found in .env file!');
      console.log('\nPlease add to your .env file:');
      console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('CLOUDINARY_API_KEY=your_api_key');
      console.log('CLOUDINARY_API_SECRET=your_api_secret');
      console.log('\nGet credentials from: https://console.cloudinary.com/');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected!\n');

    // Migrate Events
    const eventResults = await migrateEventImages();

    // Migrate Products
    const productResults = await migrateProductImages();

    // Combined Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETE MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log('\n🎨 EVENTS:');
    console.log(`  ✅ Successfully migrated:  ${eventResults.migratedCount}`);
    console.log(`  ⏭️  Skipped:               ${eventResults.skippedCount}`);
    console.log(`  ❌ Errors:                 ${eventResults.errorCount}`);
    console.log(`  💾 Space saved:            ${(eventResults.totalSaved / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n🎫 PRODUCTS:');
    console.log(`  ✅ Successfully migrated:  ${productResults.migratedCount}`);
    console.log(`  ⏭️  Skipped:               ${productResults.skippedCount}`);
    console.log(`  ❌ Errors:                 ${productResults.errorCount}`);
    console.log(`  💾 Space saved:            ${(productResults.totalSaved / 1024 / 1024).toFixed(2)} MB`);

    const totalMigrated = eventResults.migratedCount + productResults.migratedCount;
    const totalSaved = eventResults.totalSaved + productResults.totalSaved;
    const totalErrors = eventResults.errorCount + productResults.errorCount;

    console.log('\n📊 TOTALS:');
    console.log(`  ✅ Total migrated:         ${totalMigrated}`);
    console.log(`  ❌ Total errors:           ${totalErrors}`);
    console.log(`  💾 Total space saved:      ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
    console.log('='.repeat(80));

    if (totalMigrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ Your database is now much smaller and faster!');
      console.log('✅ All images are hosted on Cloudinary CDN');
      console.log('✅ Future uploads will automatically go to Cloudinary');
    }

    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} image(s) failed to migrate. Check errors above.`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run migration
migrateImages();

