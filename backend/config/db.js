const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let gfs;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Initialize GridFS bucket
    gfs = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'fs'
    });
    
    // Make bucket globally available
    global.gfsBucket = gfs;
    
    console.log('MongoDB Connected');
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;