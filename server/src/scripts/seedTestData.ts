import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import User, { IUser } from '../models/User';
import Group, { IGroup } from '../models/Group';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kle-mentor-system';

// Configuration
const NUM_STUDENTS = 50;
const NUM_MENTORS = 5;
const STUDENTS_PER_GROUP = 10; // 50 students / 5 mentors = 10 students per mentor

// Sample data arrays
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharva', 'Advait', 'Pranav', 'Kabir', 'Ananya', 'Diya', 'Saanvi', 'Aanya', 'Aadhya',
  'Isha', 'Kavya', 'Riya', 'Priya', 'Sneha', 'Pooja', 'Neha', 'Shruti', 'Anjali', 'Divya',
  'Rohan', 'Rahul', 'Amit', 'Vikram', 'Suresh', 'Mahesh', 'Rajesh', 'Kiran', 'Varun', 'Nikhil',
  'Arun', 'Deepak', 'Sanjay', 'Manish', 'Vinay', 'Gaurav', 'Sachin', 'Vishal', 'Akash', 'Nitin'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Rao', 'Naidu', 'Iyer',
  'Nair', 'Menon', 'Pillai', 'Das', 'Ghosh', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Patil', 'Kulkarni',
  'Deshmukh', 'Joshi', 'Deshpande', 'Hegde', 'Bhat', 'Shetty', 'Kamath', 'Pai', 'Acharya', 'Gowda'
];

const mentorFirstNames = ['Rajendra', 'Sunil', 'Pradeep', 'Anand', 'Vijay'];
const mentorLastNames = ['Patil', 'Kulkarni', 'Deshmukh', 'Joshi', 'Hegde'];

const departments = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical'
];

const designations = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Senior Lecturer',
  'HOD'
];

const programmes = ['B.E.', 'B.Tech'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const genders = ['Male', 'Female'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Helper functions
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function generateEnrollmentNo(index: number, year: string): string {
  return `2${year}CS${String(index + 1).padStart(3, '0')}`;
}

function generateEmail(firstName: string, lastName: string, role: string, index: number): string {
  const sanitizedFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const sanitizedLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${sanitizedFirst}.${sanitizedLast}${index}@kle-${role}.test`;
}

async function seedTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Ask for confirmation before clearing existing data
    console.log('⚠️  This script will create test data for:');
    console.log(`   - 1 Admin account`);
    console.log(`   - ${NUM_MENTORS} Mentor accounts`);
    console.log(`   - ${NUM_STUDENTS} Student accounts`);
    console.log(`   - ${NUM_MENTORS} Groups (${STUDENTS_PER_GROUP} students each)`);
    console.log('');

    // Check for existing test data
    const existingTestUsers = await User.countDocuments({ email: /@kle-.*\.test$/ });
    const existingTestGroups = await Group.countDocuments({ name: /^Test Group/ });

    if (existingTestUsers > 0 || existingTestGroups > 0) {
      console.log(`Found ${existingTestUsers} existing test users and ${existingTestGroups} test groups.`);
      console.log('Cleaning up existing test data...');
      
      // Delete existing test data
      await User.deleteMany({ email: /@kle-.*\.test$/ });
      await Group.deleteMany({ name: /^Test Group/ });
      console.log('✅ Cleaned up existing test data');
      console.log('');
    }

    // ==========================================
    // 1. CREATE ADMIN
    // ==========================================
    console.log('📝 Creating Admin...');
    
    const admin = await User.create({
      clerkId: `admin_test_${Date.now()}`,
      email: 'admin@kle-admin.test',
      role: 'admin',
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: generatePhone(),
        department: 'Administration',
      },
      isProfileComplete: true,
    });

    console.log(`   ✅ Admin created: ${admin.email}`);
    console.log('');

    // ==========================================
    // 2. CREATE MENTORS
    // ==========================================
    console.log(`📝 Creating ${NUM_MENTORS} Mentors...`);
    
    const mentors: IUser[] = [];
    for (let i = 0; i < NUM_MENTORS; i++) {
      const firstName = mentorFirstNames[i];
      const lastName = mentorLastNames[i];
      const department = departments[i];
      
      const mentor = await User.create({
        clerkId: `mentor_test_${Date.now()}_${i}`,
        email: generateEmail(firstName, lastName, 'mentor', i + 1),
        role: 'mentor',
        profile: {
          firstName,
          lastName,
          phone: generatePhone(),
          department,
          designation: getRandomElement(designations),
          gender: getRandomElement(genders),
          bloodGroup: getRandomElement(bloodGroups),
          address: `Faculty Quarters ${i + 1}, KLE Campus`,
        },
        isProfileComplete: true,
      });
      
      mentors.push(mentor);
      console.log(`   ✅ Mentor ${i + 1}: ${mentor.profile.firstName} ${mentor.profile.lastName} (${mentor.email}) - ${department}`);
    }
    console.log('');

    // ==========================================
    // 3. CREATE STUDENTS
    // ==========================================
    console.log(`📝 Creating ${NUM_STUDENTS} Students...`);
    
    const students: IUser[] = [];
    const enrollmentYear = '23'; // 2023 batch
    
    for (let i = 0; i < NUM_STUDENTS; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = getRandomElement(lastNames);
      const department = departments[Math.floor(i / STUDENTS_PER_GROUP)]; // Assign to department based on group
      
      const student = await User.create({
        clerkId: `student_test_${Date.now()}_${i}`,
        email: generateEmail(firstName, lastName, 'student', i + 1),
        role: 'student',
        profile: {
          firstName,
          lastName,
          phone: generatePhone(),
          department,
          enrollmentNo: generateEnrollmentNo(i, enrollmentYear),
          programme: getRandomElement(programmes),
          enrollmentYear: '2023',
          semester: getRandomElement(semesters),
          gender: getRandomElement(genders),
          bloodGroup: getRandomElement(bloodGroups),
          homePlace: `City ${i + 1}`,
          address: `Hostel Block ${String.fromCharCode(65 + (i % 5))}, Room ${100 + (i % 50)}`,
        },
        guardian: {
          father: {
            name: `${getRandomElement(firstNames)} ${lastName}`,
            occupation: getRandomElement(['Engineer', 'Doctor', 'Teacher', 'Business', 'Farmer', 'Government Employee']),
            phone: generatePhone(),
          },
          mother: {
            name: `${getRandomElement(firstNames)} ${lastName}`,
            occupation: getRandomElement(['Homemaker', 'Teacher', 'Doctor', 'Nurse', 'Business']),
            phone: generatePhone(),
          },
          address: `House No. ${i + 1}, Main Road, City ${i + 1}`,
        },
        hostel: {
          name: `Hostel Block ${String.fromCharCode(65 + (i % 5))}`,
          roomNo: `${100 + (i % 50)}`,
          wardenName: `Mr. ${getRandomElement(lastNames)}`,
          wardenPhone: generatePhone(),
        },
        pastEducation: {
          class10: {
            board: getRandomElement(['CBSE', 'ICSE', 'State Board']),
            school: `School ${i + 1}`,
            percentage: `${75 + Math.floor(Math.random() * 20)}%`,
          },
          class12: {
            board: getRandomElement(['CBSE', 'ICSE', 'State Board']),
            school: `PU College ${i + 1}`,
            percentage: `${70 + Math.floor(Math.random() * 25)}%`,
          },
        },
        isProfileComplete: true,
      });
      
      students.push(student);
      
      // Log progress every 10 students
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Created ${i + 1}/${NUM_STUDENTS} students...`);
      }
    }
    console.log(`   ✅ All ${NUM_STUDENTS} students created!`);
    console.log('');

    // ==========================================
    // 4. CREATE GROUPS AND ASSIGN STUDENTS
    // ==========================================
    console.log(`📝 Creating ${NUM_MENTORS} Groups and assigning students...`);
    
    const groups: IGroup[] = [];
    for (let i = 0; i < NUM_MENTORS; i++) {
      const mentor = mentors[i];
      const groupStudents = students.slice(i * STUDENTS_PER_GROUP, (i + 1) * STUDENTS_PER_GROUP);
      
      const group = await Group.create({
        name: `Test Group ${i + 1} - ${departments[i]}`,
        description: `Mentoring group for ${departments[i]} department students. Mentor: ${mentor.profile.firstName} ${mentor.profile.lastName}`,
        mentor: mentor._id,
        mentees: groupStudents.map(s => s._id),
        createdBy: admin._id,
      });
      
      groups.push(group);
      console.log(`   ✅ Group ${i + 1}: "${group.name}" - ${groupStudents.length} students assigned to ${mentor.profile.firstName} ${mentor.profile.lastName}`);
    }
    console.log('');

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    📊 SEED DATA SUMMARY                    ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('👤 ADMIN ACCOUNT:');
    console.log(`   Email: admin@kle-admin.test`);
    console.log('');
    console.log('👨‍🏫 MENTOR ACCOUNTS:');
    mentors.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.profile.firstName} ${m.profile.lastName}`);
      console.log(`      Email: ${m.email}`);
      console.log(`      Department: ${m.profile.department}`);
      console.log(`      Group: Test Group ${i + 1} - ${departments[i]}`);
      console.log('');
    });
    
    console.log('👨‍🎓 STUDENT ACCOUNTS:');
    console.log(`   Total: ${NUM_STUDENTS} students`);
    console.log(`   Distribution: ${STUDENTS_PER_GROUP} students per mentor`);
    console.log('');
    console.log('   Sample student emails:');
    students.slice(0, 5).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.email} (${s.profile.enrollmentNo})`);
    });
    console.log(`   ... and ${NUM_STUDENTS - 5} more`);
    console.log('');
    
    console.log('📁 GROUPS:');
    groups.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.name}`);
      console.log(`      Mentor: ${mentors[i].profile.firstName} ${mentors[i].profile.lastName}`);
      console.log(`      Students: ${g.mentees.length}`);
    });
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  NOTE: These are test accounts with fake Clerk IDs.');
    console.log('   They cannot be used for actual login via Clerk.');
    console.log('   Use these for testing group management, admin features,');
    console.log('   and mentor-mentee relationships in the database.');
    console.log('');
    console.log('✅ Seed data creation completed successfully!');

    await mongoose.disconnect();
    console.log('');
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTestData();
