import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'mentor' | 'student';

export interface IUserProfile {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  address?: string;
  department?: string;
  designation?: string;
  enrollmentNo?: string;
  programme?: string;
  enrollmentYear?: string;
  semester?: string;
  gender?: string;
  dateOfBirth?: Date;
  bloodGroup?: string;
  category?: string;
  aadharNo?: string;
  homePlace?: string;
  hobbies?: string;
}

export interface IGuardian {
  father?: {
    name?: string;
    occupation?: string;
    phone?: string;
  };
  mother?: {
    name?: string;
    occupation?: string;
    phone?: string;
  };
  address?: string;
}

export interface IHostel {
  name?: string;
  roomNo?: string;
  wardenName?: string;
  wardenPhone?: string;
}

export interface IPastEducation {
  class10?: {
    board?: string;
    school?: string;
    percentage?: string;
  };
  class12?: {
    board?: string;
    school?: string;
    percentage?: string;
  };
}

export interface IUser extends Document {
  clerkId: string;
  email: string;
  role: UserRole;
  profile: IUserProfile;
  avatar: {
    url: string;
    publicId?: string;
  };
  guardian?: IGuardian;
  hostel?: IHostel;
  pastEducation?: IPastEducation;
  isBanned: boolean;
  isProfileComplete: boolean;
  isSuperAdmin: boolean; // Only for admin role - primary admin who can manage other admins
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'mentor', 'student'],
      required: true,
    },
    profile: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      lastName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      department: { type: String, trim: true },
      designation: { type: String, trim: true },
      enrollmentNo: { type: String, trim: true },
      programme: { type: String, trim: true },
      enrollmentYear: { type: String, trim: true },
      semester: { type: String, trim: true },
      gender: { type: String, trim: true },
      dateOfBirth: { type: Date },
      bloodGroup: { type: String, trim: true },
      category: { type: String, trim: true },
      aadharNo: { type: String, trim: true },
      homePlace: { type: String, trim: true },
      hobbies: { type: String, trim: true },
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String },
    },
    guardian: {
      father: {
        name: String,
        occupation: String,
        phone: String,
      },
      mother: {
        name: String,
        occupation: String,
        phone: String,
      },
      address: String,
    },
    hostel: {
      name: String,
      roomNo: String,
      wardenName: String,
      wardenPhone: String,
    },
    pastEducation: {
      class10: {
        board: String,
        school: String,
        percentage: String,
      },
      class12: {
        board: String,
        school: String,
        percentage: String,
      },
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ 'profile.department': 1 });
userSchema.index({ isBanned: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  const { firstName, middleName, lastName } = this.profile;
  return [firstName, middleName, lastName].filter(Boolean).join(' ');
});

// Transform output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.__v;
  return user;
};

export default mongoose.model<IUser>('User', userSchema);
