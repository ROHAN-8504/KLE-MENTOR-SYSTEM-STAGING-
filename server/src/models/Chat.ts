import mongoose, { Schema, Document } from 'mongoose';

export interface IChatParticipant {
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
}

export interface IChat extends Document {
  participants: IChatParticipant[];
  latestMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    participants: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding user's chats
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ updatedAt: -1 });

export default mongoose.model<IChat>('Chat', chatSchema);
