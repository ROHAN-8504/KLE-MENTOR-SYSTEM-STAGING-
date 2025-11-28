import mongoose, { Schema, Document } from 'mongoose';

export type LogEventType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PROFILE_UPDATED'
  | 'AVATAR_UPDATED'
  | 'POST_CREATED'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'COMMENT_CREATED'
  | 'COMMENT_DELETED'
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'SEMESTER_UPDATED'
  | 'SEMESTER_DELETED'
  | 'UPDATE_USER_ROLE'
  | 'UPDATE_USER_STATUS'
  | 'DELETE_USER'
  | 'CREATE_GROUP'
  | 'DELETE_GROUP'
  | 'BULK_UPLOAD_USERS'
  | 'TRANSFER_SUPER_ADMIN'
  | 'REMOVE_ADMIN'
  | 'DEMOTE_ADMIN'
  | 'MAKE_SUPER_ADMIN'
  | 'RECORD_INTERACTION'
  | 'UPDATE_INTERACTION'
  | 'DELETE_INTERACTION';

export interface ILog extends Document {
  user: mongoose.Types.ObjectId;
  eventType: LogEventType;
  eventDetail?: string;
  ip?: string;
  userAgent?: string;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const logSchema = new Schema<ILog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        'LOGIN', 'LOGOUT', 'SIGNUP', 'PROFILE_UPDATED', 'AVATAR_UPDATED',
        'POST_CREATED', 'POST_UPDATED', 'POST_DELETED',
        'COMMENT_CREATED', 'COMMENT_DELETED',
        'MEETING_CREATED', 'MEETING_UPDATED',
        'GROUP_CREATED', 'GROUP_UPDATED', 'GROUP_DELETED',
        'USER_BANNED', 'USER_UNBANNED',
        'SEMESTER_UPDATED', 'SEMESTER_DELETED',
        'UPDATE_USER_ROLE', 'UPDATE_USER_STATUS', 'DELETE_USER',
        'CREATE_GROUP', 'DELETE_GROUP',
        'BULK_UPLOAD_USERS',
        'TRANSFER_SUPER_ADMIN', 'REMOVE_ADMIN', 'DEMOTE_ADMIN', 'MAKE_SUPER_ADMIN',
        'RECORD_INTERACTION', 'UPDATE_INTERACTION', 'DELETE_INTERACTION'
      ],
      required: true,
    },
    eventDetail: String,
    ip: String,
    userAgent: String,
    entityType: String,
    entityId: {
      type: Schema.Types.ObjectId,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ eventType: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });

export default mongoose.model<ILog>('Log', logSchema);
