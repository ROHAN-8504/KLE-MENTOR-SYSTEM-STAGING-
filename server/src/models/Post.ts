import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  visibility: 'all' | 'group' | 'personal';
  isPinned: boolean;
  attachments?: string[];
  commentCount: number;
  commentEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    visibility: {
      type: String,
      enum: ['all', 'group', 'personal'],
      default: 'group',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    attachments: [{
      type: String,
    }],
    commentCount: {
      type: Number,
      default: 0,
    },
    commentEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
postSchema.index({ groupId: 1, createdAt: -1 });
postSchema.index({ groupId: 1, isPinned: -1, createdAt: -1 });
postSchema.index({ author: 1 });

export default mongoose.model<IPost>('Post', postSchema);
