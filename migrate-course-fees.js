/**
 * Migrate Course Fees to New Structure
 * 
 * Old structure:
 * fees: {
 *   online: 100000,
 *   offline: 150000
 * }
 * 
 * New structure:
 * fees: {
 *   online: {
 *     actualPrice: 100000,
 *     discountPercent: 0,
 *     discountedPrice: 100000,
 *     hasDiscount: false,
 *     offerText: ''
 *   },
 *   offline: { ... }
 * }
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const migrateCourseFees = async () => {
   try {
      console.log('🔧 Migrating course fees structure...\n');

      await connectDB();

      const Course = require('./models/Course');

      // Find all courses with old fee structure
      const coursesWithOldFees = await Course.find({
         $or: [
            { 'fees.online': { $type: 'number' } },
            { 'fees.offline': { $type: 'number' } }
         ]
      });

      console.log(`📋 Found ${coursesWithOldFees.length} courses with old fee structure\n`);

      if (coursesWithOldFees.length === 0) {
         console.log('✅ All courses already have new fee structure. No migration needed.');
         process.exit(0);
      }

      let migratedCount = 0;
      let skippedCount = 0;

      for (const course of coursesWithOldFees) {
         try {
            const oldOnline = course.fees.online;
            const oldOffline = course.fees.offline;

            // Check if already migrated (skip if new structure)
            if (typeof oldOnline === 'object' && oldOnline.actualPrice !== undefined) {
               console.log(`⏭️  Skipped: ${course.title} (already migrated)`);
               skippedCount++;
               continue;
            }

            // Get old values (handle if they're numbers or already objects)
            const onlineActualPrice = typeof oldOnline === 'number' ? oldOnline : 0;
            const offlineActualPrice = typeof oldOffline === 'number' ? oldOffline : 0;

            // Update to new structure
            course.fees = {
               online: {
                  actualPrice: onlineActualPrice,
                  discountPercent: 0,
                  discountedPrice: onlineActualPrice,
                  hasDiscount: false,
                  offerText: ''
               },
               offline: {
                  actualPrice: offlineActualPrice,
                  discountPercent: 0,
                  discountedPrice: offlineActualPrice,
                  hasDiscount: false,
                  offerText: ''
               },
               description: course.fees.description || ''
            };

            await course.save();
            
            console.log(`✅ Migrated: ${course.title}`);
            console.log(`   Online: ₹${onlineActualPrice} → New structure`);
            console.log(`   Offline: ₹${offlineActualPrice} → New structure\n`);
            
            migratedCount++;
         } catch (error) {
            console.error(`❌ Error migrating course ${course.title}:`, error.message);
         }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 Migration Complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Migrated: ${migratedCount} courses`);
      console.log(`⏭️  Skipped: ${skippedCount} courses`);
      console.log(`📊 Total processed: ${coursesWithOldFees.length} courses`);
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your Node.js server');
      console.log('   2. Test course creation with new fee fields');
      console.log('   3. Verify existing courses display correctly');

      process.exit(0);

   } catch (error) {
      console.error('❌ Migration error:', error.message);
      process.exit(1);
   }
};

migrateCourseFees();
