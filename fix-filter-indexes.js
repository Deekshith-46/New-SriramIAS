require('dotenv').config();
const mongoose = require('mongoose');

async function fixFilterIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const collection = mongoose.connection.collection('filters');

    // Get all existing indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Existing indexes:');
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${JSON.stringify(idx)}`);
    });

    // Drop all indexes except _id_
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        console.log(`\n🗑️  Dropping index: ${idx.name}`);
        await collection.dropIndex(idx.name);
      }
    }

    console.log('\n✅ All old indexes dropped');

    // Create new compound unique index
    console.log('\n📝 Creating new compound unique index...');
    await collection.createIndex(
      { type: 1, value: 1, categoryId: 1, subCategoryId: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'type_1_value_1_categoryId_1_subCategoryId_1'
      }
    );

    console.log('✅ New index created successfully');

    // Verify indexes
    const newIndexes = await collection.indexes();
    console.log('\n📋 New indexes:');
    newIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n🎉 Filter indexes fixed successfully!');
    console.log('You can now create filters with different subCategoryIds');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixFilterIndexes();
