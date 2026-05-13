require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
   .then(() => console.log('✅ MongoDB Connected'))
   .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
      process.exit(1);
   });

async function findAndDeleteCoupon() {
   try {
      const couponCode = 'BOOK100';
      
      console.log('\n🔍 Searching for coupon:', couponCode);
      
      // Find ALL coupons with this code (including soft-deleted)
      const coupons = await Coupon.find({ 
         couponCode: couponCode.toUpperCase() 
      });
      
      if (coupons.length === 0) {
         console.log('\n❌ No coupons found with code:', couponCode);
         console.log('✅ You can safely create a new coupon!');
         process.exit(0);
      }
      
      console.log(`\n📋 Found ${coupons.length} coupon(s):`);
      
      coupons.forEach((coupon, index) => {
         console.log(`\n--- Coupon ${index + 1} ---`);
         console.log('   ID:', coupon._id);
         console.log('   Name:', coupon.couponName);
         console.log('   Code:', coupon.couponCode);
         console.log('   Type:', coupon.type);
         console.log('   Value:', coupon.value);
         console.log('   applicableFor:', coupon.applicableFor);
         console.log('   Status:', coupon.status);
         console.log('   isDeleted:', coupon.isDeleted);
         console.log('   Created At:', coupon.createdAt);
      });
      
      console.log('\n⚠️  Action: HARD DELETING all coupons with this code...');
      
      // Hard delete all coupons with this code
      const result = await Coupon.deleteMany({ 
         couponCode: couponCode.toUpperCase() 
      });
      
      console.log(`\n✅ Successfully deleted ${result.deletedCount} coupon(s)!`);
      console.log('   You can now create a new coupon with code: BOOK100');
      console.log('\n💡 Tip: Use Postman to create the coupon now.');
      
      process.exit(0);
      
   } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error);
      process.exit(1);
   }
}

findAndDeleteCoupon();

