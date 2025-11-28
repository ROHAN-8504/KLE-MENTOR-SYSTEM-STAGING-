import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from '../models/User';
import Group from '../models/Group';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kle-mentor-system';

async function cleanupTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Count existing test data
    const testUsers = await User.countDocuments({ email: /@kle-.*\.test$/ });
    const testGroups = await Group.countDocuments({ name: /^Test Group/ });

    if (testUsers === 0 && testGroups === 0) {
      console.log('No test data found to clean up.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${testUsers} test users and ${testGroups} test groups.`);
    console.log('');
    console.log('Cleaning up...');

    // Delete test users
    const userResult = await User.deleteMany({ email: /@kle-.*\.test$/ });
    console.log(`   ✅ Deleted ${userResult.deletedCount} test users`);

    // Delete test groups
    const groupResult = await Group.deleteMany({ name: /^Test Group/ });
    console.log(`   ✅ Deleted ${groupResult.deletedCount} test groups`);

    console.log('');
    console.log('✅ Test data cleanup completed!');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  }
}

cleanupTestData();
