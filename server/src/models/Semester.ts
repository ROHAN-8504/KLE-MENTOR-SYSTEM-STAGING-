import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject {
  name: string;
  code: string;
  credits: number;
  grade?: string;
  marks?: number;
}

export interface ISemester extends Document {
  userId: mongoose.Types.ObjectId;
  semester: number;
  year: number;
  sgpa?: number;
  cgpa?: number;
  subjects: ISubject[];
  backlogs?: number;
  achievements?: string;
  remarks?: string;
  marksheet?: string;
  createdAt: Date;
  updatedAt: Date;
}

const semesterSchema = new Schema<ISemester>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    sgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    subjects: [{
      name: { type: String, required: true },
      code: { type: String, required: true },
      credits: { type: Number, required: true },
      grade: { type: String },
      marks: { type: Number },
    }],
    backlogs: {
      type: Number,
      default: 0,
    },
    achievements: {
      type: String,
    },
    remarks: {
      type: String,
    },
    marksheet: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique semester per student
semesterSchema.index({ userId: 1, semester: 1, year: 1 }, { unique: true });

export default mongoose.model<ISemester>('Semester', semesterSchema);
