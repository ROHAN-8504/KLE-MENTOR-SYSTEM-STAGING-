import mongoose, { Schema, Document } from 'mongoose';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type MeetingType = 'online' | 'offline' | 'in-person';

export interface IAttendance {
  student: mongoose.Types.ObjectId;
  present: boolean;
  markedAt?: Date;
  markedBy?: mongoose.Types.ObjectId;
}

export interface IMeeting extends Document {
  title: string;
  description?: string;
  dateTime: Date;
  duration: number;
  venue?: string;
  meetingType: MeetingType;
  meetingLink?: string;
  groupId: mongoose.Types.ObjectId;
  scheduledBy: mongoose.Types.ObjectId;
  status: MeetingStatus;
  cancellationReason?: string;
  attendance: IAttendance[];
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
    },
    venue: {
      type: String,
      trim: true,
    },
    meetingType: {
      type: String,
      enum: ['online', 'offline', 'in-person'],
      default: 'online',
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    scheduledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    attendance: [{
      student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      present: {
        type: Boolean,
        default: false,
      },
      markedAt: Date,
      markedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
meetingSchema.index({ scheduledBy: 1, dateTime: -1 });
meetingSchema.index({ groupId: 1, dateTime: -1 });
meetingSchema.index({ status: 1, dateTime: 1 });
// Compound index to speed up queries that filter by group/status and sort by dateTime
meetingSchema.index({ groupId: 1, status: 1, dateTime: -1 });

export default mongoose.model<IMeeting>('Meeting', meetingSchema);
