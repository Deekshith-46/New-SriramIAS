/**
 * Fix Duplicate Key Error on Coupons Collection
 * 
 * Problem: Old index 'code_1' exists from previous schema
 * Solution: Drop old index and rebuild new indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const fixCouponIndexes = async () => {
   try {
      console.log('🔧 Fixing coupon indexes...\n');

      await connectDB();

      const db = mongoose.connection.db;
      const collection = db.collection('coupons');

      // Step 1: Get all existing indexes
      console.log('📋 Current indexes:');
      const indexes = await collection.indexes();
      indexes.forEach((idx, i) => {
         console.log(`   ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
      });

      // Step 2: Drop old 'code_1' index if exists
      const oldIndexExists = indexes.some(idx => idx.name === 'code_1');
      
      if (oldIndexExists) {
         console.log('\n❌ Dropping old index: code_1');
         await collection.dropIndex('code_1');
         console.log('✅ Old index dropped successfully');
      } else {
         console.log('\n✅ Old index code_1 not found (already dropped)');
      }

      // Step 3: Drop old 'expiryDate_1' index if exists
      const oldExpiryIndex = indexes.some(idx => idx.name === 'expiryDate_1');
      if (oldExpiryIndex) {
         console.log('❌ Dropping old index: expiryDate_1');
         await collection.dropIndex('expiryDate_1');
         console.log('✅ Old expiryDate_1 index dropped');
      }

      // Step 4: Check for documents with null/missing couponCode
      console.log('\n🔍 Checking for documents with missing couponCode...');
      const docsWithNullCode = await collection.countDocuments({
         $or: [
            { couponCode: null },
            { couponCode: { $exists: false } }
         ]
      });

      if (docsWithNullCode > 0) {
         console.log(`⚠️  Found ${docsWithNullCode} documents with missing couponCode`);
         console.log('🗑️  Deleting these old documents automatically...\n');
         
         // Show sample documents before deletion
         const samples = await collection.find({
            $or: [
               { couponCode: null },
               { couponCode: { $exists: false } }
            ]
         }).limit(5).toArray();

         console.log('Documents to be deleted:');
         samples.forEach((doc, i) => {
            console.log(`   ${i + 1}. _id: ${doc._id}`);
            console.log(`      code: ${doc.code || 'null'}`);
            console.log(`      couponName: ${doc.couponName || 'N/A'}`);
         });

         // Delete old documents with missing couponCode
         const deleteResult = await collection.deleteMany({
            $or: [
               { couponCode: null },
               { couponCode: { $exists: false } }
            ]
         });

         console.log(`\n✅ Deleted ${deleteResult.deletedCount} old documents`);
      } else {
         console.log('✅ All documents have valid couponCode');
      }

      // Step 5: Rebuild indexes from schema
      console.log('\n🔄 Rebuilding indexes from schema...');
      const Coupon = require('./models/Coupon');
      await Coupon.syncIndexes();
      console.log('✅ Indexes rebuilt successfully');

      // Step 6: Verify new indexes
      console.log('\n✅ New indexes:');
      const newIndexes = await collection.indexes();
      newIndexes.forEach((idx, i) => {
         console.log(`   ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
      });

      console.log('\n✅ Coupon indexes fixed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. If you have old documents with null couponCode, delete them manually');
      console.log('   2. Restart your Node.js server');
      console.log('   3. Try creating a coupon again');

      process.exit(0);

   } catch (error) {
      console.error('❌ Error fixing indexes:', error.message);
      process.exit(1);
   }
};

fixCouponIndexes();
