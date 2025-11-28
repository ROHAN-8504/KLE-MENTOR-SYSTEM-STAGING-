import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kle-mentor-system';

async function makeSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = process.argv[2];

    // List all admins first
    const allAdmins = await User.find({ role: 'admin' }).select('email profile.firstName profile.lastName isSuperAdmin clerkId');
    
    console.log('📋 Current Admin Accounts:');
    console.log('─'.repeat(60));
    
    if (allAdmins.length === 0) {
      console.log('   No admin accounts found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    allAdmins.forEach((admin, i) => {
      const isTest = admin.clerkId?.includes('test');
      const isSuperAdmin = admin.isSuperAdmin;
      console.log(`   ${i + 1}. ${admin.email}`);
      console.log(`      Name: ${admin.profile.firstName} ${admin.profile.lastName}`);
      console.log(`      Type: ${isTest ? '❌ TEST' : '✅ REAL'}`);
      console.log(`      Super Admin: ${isSuperAdmin ? '👑 YES' : 'No'}`);
      console.log('');
    });

    if (!email) {
      // If no email provided, make the first REAL admin (non-test) super admin
      const realAdmins = allAdmins.filter(a => !a.clerkId?.includes('test'));
      
      if (realAdmins.length === 0) {
        console.log('❌ No real admin accounts found. Cannot set super admin.');
        console.log('   Create an admin account first by signing up with the ADMIN_SECRET_KEY');
        await mongoose.disconnect();
        process.exit(1);
      }

      // Check if there's already a super admin
      const existingSuperAdmin = realAdmins.find(a => a.isSuperAdmin);
      if (existingSuperAdmin) {
        console.log(`ℹ️  Super admin already exists: ${existingSuperAdmin.email}`);
        await mongoose.disconnect();
        process.exit(0);
      }

      // Make the first real admin super admin
      const firstRealAdmin = realAdmins[0];
      await User.findByIdAndUpdate(firstRealAdmin._id, { isSuperAdmin: true });
      
      console.log('─'.repeat(60));
      console.log(`✅ ${firstRealAdmin.email} is now the SUPER ADMIN 👑`);
    } else {
      // Make specific user super admin
      const admin = await User.findOne({ email, role: 'admin' });

      if (!admin) {
        console.log(`❌ No admin found with email: ${email}`);
        await mongoose.disconnect();
        process.exit(1);
      }

      if (admin.clerkId?.includes('test')) {
        console.log(`❌ Cannot make test admin a super admin: ${email}`);
        await mongoose.disconnect();
        process.exit(1);
      }

      // Remove super admin from all others
      await User.updateMany(
        { role: 'admin' },
        { isSuperAdmin: false }
      );

      // Make the specified user super admin
      await User.findByIdAndUpdate(admin._id, { isSuperAdmin: true });

      console.log('─'.repeat(60));
      console.log(`✅ ${admin.email} is now the SUPER ADMIN 👑`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeSuperAdmin();
