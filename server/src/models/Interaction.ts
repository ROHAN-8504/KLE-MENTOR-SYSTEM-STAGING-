import mongoose, { Schema, Document } from 'mongoose';

export interface IInteraction extends Document {
  mentor: mongoose.Types.ObjectId;
  counts: {
    posts: number;
    meetings: number;
    messages: number;
  };
  week: Date;
  posts: mongoose.Types.ObjectId[];
  meetings: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const interactionSchema = new Schema<IInteraction>(
  {
    mentor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    counts: {
      posts: { type: Number, default: 0 },
      meetings: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
    },
    week: {
      type: Date,
      required: true,
    },
    posts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post',
    }],
    meetings: [{
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for weekly queries
interactionSchema.index({ mentor: 1, week: -1 });

export default mongoose.model<IInteraction>('Interaction', interactionSchema);
