import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 
  | 'POST_CREATED'
  | 'COMMENT_ADDED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_UPDATED'
  | 'MESSAGE_RECEIVED'
  | 'GROUP_ASSIGNED';

export interface INotificationReceiver {
  user: mongoose.Types.ObjectId;
  read: boolean;
  readAt?: Date;
}

export interface INotification extends Document {
  type: NotificationType;
  creator: mongoose.Types.ObjectId;
  content: mongoose.Types.ObjectId;
  contentModel: string;
  message: string;
  receivers: INotificationReceiver[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['POST_CREATED', 'COMMENT_ADDED', 'MEETING_SCHEDULED', 'MEETING_UPDATED', 'MESSAGE_RECEIVED', 'GROUP_ASSIGNED'],
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: Schema.Types.ObjectId,
      refPath: 'contentModel',
      required: true,
    },
    contentModel: {
      type: String,
      enum: ['Post', 'Comment', 'Meeting', 'Message', 'Group', 'Interaction'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    receivers: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      read: {
        type: Boolean,
        default: false,
      },
      readAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ 'receivers.user': 1, createdAt: -1 });
notificationSchema.index({ 'receivers.user': 1, 'receivers.read': 1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
