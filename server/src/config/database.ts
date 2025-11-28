import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // Optimized connection options for better performance
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Socket timeout
      // Performance optimizations
      autoIndex: process.env.NODE_ENV !== 'production', // Don't auto-build indexes in production
    });
    
    // Enable lean queries by default for read operations
    mongoose.set('toJSON', { virtuals: true });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
