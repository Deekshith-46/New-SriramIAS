const AnswerWritingCategory = require('../models/AnswerWritingCategory');

const DEFAULT_CATEGORIES = [
  { title: 'Daily', slug: 'daily' },
  { title: 'Weekly', slug: 'weekly' },
  { title: 'Monthly', slug: 'monthly' }
];

const seedAnswerWritingCategories = async () => {
  for (const cat of DEFAULT_CATEGORIES) {
    await AnswerWritingCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  console.log('✅ Answer writing categories seeded (daily, weekly, monthly)');
};

module.exports = { seedAnswerWritingCategories, DEFAULT_CATEGORIES };
