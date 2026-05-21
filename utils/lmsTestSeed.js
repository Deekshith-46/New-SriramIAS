const LmsTestCategory = require('../models/LmsTestCategory');
const { DEFAULT_CATEGORIES } = require('./lmsTestHelpers');

const seedLmsTestCategories = async () => {
  for (const cat of DEFAULT_CATEGORIES) {
    await LmsTestCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  console.log('✅ LMS test categories seeded (weekly, daily, monthly)');
};

module.exports = { seedLmsTestCategories };
