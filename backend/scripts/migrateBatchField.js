const mongoose = require('mongoose');
const path = require('path');

// Explicitly set path to .env file relative to script location
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateBatchField() {
  try {
    // Verify MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI not found in .env file');
      console.log('Expected .env path:', path.join(__dirname, '../.env'));
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: true,
      tlsInsecure: true // Added for testing - remove in production
    });
    console.log('Connected to MongoDB successfully');
    
    console.log('Starting migration: renaming batchId to batch...');
    
    // First, find all documents with batchId
    const usersWithBatchId = await mongoose.connection.db.collection('users')
      .find({ batchId: { $exists: true } })
      .toArray();
    
    console.log(`Found ${usersWithBatchId.length} users with batchId field`);

    // Update all documents to rename batchId to batch
    const result = await mongoose.connection.db.collection('users').updateMany(
      { batchId: { $exists: true } },
      [
        { $set: { batch: '$batchId' } },
        { $unset: 'batchId' }
      ]
    );

    console.log(`Migration completed: Modified ${result.modifiedCount} documents`);

    // Verify changes
    const remainingBatchIds = await mongoose.connection.db.collection('users')
      .countDocuments({ batchId: { $exists: true } });
    
    console.log(`Verification: ${remainingBatchIds} documents still have batchId field`);
    
    // Update batch collection references
    console.log('Syncing batch collection user arrays...');
    
    const users = await mongoose.connection.db.collection('users')
      .find({ batch: { $exists: true, $ne: null } })
      .toArray();

    for (const user of users) {
      await mongoose.connection.db.collection('batches').updateOne(
        { _id: user.batch },
        { $addToSet: { users: user._id } }
      );
    }

    console.log('Batch collection user arrays synced');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

migrateBatchField();