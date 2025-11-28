import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kle-mentor-system';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log(`  ID: ${existingAdmin._id}`);
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    // NOTE: You need to first create this user in Clerk and get the clerkId
    const adminClerkId = process.env.ADMIN_CLERK_ID;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@kle-mentor.com';

    if (!adminClerkId) {
      console.log('\n⚠️  To create an admin user:');
      console.log('1. Sign up a user through Clerk (visit your frontend)');
      console.log('2. Get the Clerk user ID from Clerk Dashboard');
      console.log('3. Set ADMIN_CLERK_ID and ADMIN_EMAIL in your .env file');
      console.log('4. Run this script again\n');
      
      // Alternative: Create admin without Clerk (for testing only)
      console.log('Creating test admin without Clerk ID (for development only)...');
      
      const testAdmin = await User.create({
        clerkId: 'admin_test_' + Date.now(),
        email: adminEmail,
        role: 'admin',
        profile: {
          firstName: 'System',
          lastName: 'Admin',
        },
      });
      
      console.log('\n✅ Test admin created:');
      console.log(`  Email: ${testAdmin.email}`);
      console.log(`  ID: ${testAdmin._id}`);
      console.log('\n⚠️  This admin cannot login via Clerk. For production, use a real Clerk ID.');
      
      await mongoose.disconnect();
      return;
    }

    const admin = await User.create({
      clerkId: adminClerkId,
      email: adminEmail,
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Admin',
      },
    });

    console.log('\n✅ Admin user created successfully:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  ID: ${admin._id}`);
    console.log(`  Clerk ID: ${admin.clerkId}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
