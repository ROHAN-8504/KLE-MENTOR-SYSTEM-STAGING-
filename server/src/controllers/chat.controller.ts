import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Group from '../models/Group';
import { emitChatMessage } from '../socket';

// Simple group access cache (5 min TTL)
const groupAccessCache = new Map<string, { canChat: boolean; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Get user's chats - OPTIMIZED
export const getChats = catchAsync(async (req: AuthRequest, res: Response) => {
  const chats = await Chat.find({
    'participants.user': req.user._id,
  })
    .select('participants latestMessage updatedAt')
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .populate({
      path: 'latestMessage',
      select: 'content sender createdAt',
      populate: { path: 'sender', select: 'profile.firstName profile.lastName avatar' }
    })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: chats,
  });
});

// Create or access chat - OPTIMIZED with caching
export const accessChat = catchAsync(async (req: AuthRequest, res: Response) => {
  const { participantId } = req.body;

  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    'participants.user': { $all: [req.user._id, participantId] },
  })
    .select('participants latestMessage')
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .populate('latestMessage')
    .lean();

  if (chat) {
    return res.status(200).json({
      success: true,
      data: chat,
    });
  }

  // Check cached group access
  const cacheKey = `${req.user._id}-${participantId}`;
  const cached = groupAccessCache.get(cacheKey);
  let canChat = false;

  if (cached && cached.expiry > Date.now()) {
    canChat = cached.canChat;
  } else {
    // Verify user can chat with this participant (same group)
    const group = await Group.findOne({
      $or: [
        { mentor: req.user._id, mentees: participantId },
        { mentor: participantId, mentees: req.user._id },
        { mentees: { $all: [req.user._id, participantId] } },
      ],
    }).select('_id').lean();

    canChat = !!group || req.user.role === 'admin';
    groupAccessCache.set(cacheKey, { canChat, expiry: Date.now() + CACHE_TTL });
  }

  if (!canChat) {
    throw new AppError('You can only chat with users in your group', 403);
  }

  // Create new chat
  const newChat = await Chat.create({
    participants: [
      { user: req.user._id },
      { user: participantId },
    ],
  });

  chat = await Chat.findById(newChat._id)
    .select('participants latestMessage')
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .lean();

  res.status(201).json({
    success: true,
    data: chat,
  });
});

// Get chat messages - OPTIMIZED
export const getMessages = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const skip = (page - 1) * limit;

  // Verify user is part of chat with minimal data
  const chatExists = await Chat.exists({
    _id: chatId,
    'participants.user': req.user._id,
  });

  if (!chatExists) {
    throw new AppError('Chat not found', 404);
  }

  const [messages, total] = await Promise.all([
    Message.find({ chatId })
      .select('content sender readBy createdAt')
      .populate('sender', 'profile.firstName profile.lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ chatId }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
});

// Send message - OPTIMIZED
export const sendMessage = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { content } = req.body;

  // Verify user is part of chat
  const chat = await Chat.findOne({
    _id: chatId,
    'participants.user': req.user._id,
  })
    .select('participants latestMessage')
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .lean();

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  const message = await Message.create({
    sender: req.user._id,
    content,
    chatId,
    readBy: [req.user._id],
  });

  // Update chat's latest message (fire and forget for speed)
  Chat.updateOne({ _id: chatId }, { latestMessage: message._id }).exec();

  await message.populate('sender', 'profile.firstName profile.lastName avatar');

  // Emit real-time message to all participants in the chat room (except sender)
  emitChatMessage(chatId, {
    ...message.toObject(),
    chat,
    chatId,
  }, req.user._id.toString());

  res.status(201).json({
    success: true,
    message: 'Message sent',
    data: message,
  });
});

// Mark messages as read - OPTIMIZED
export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;

  // Verify user is part of chat with exists check (faster)
  const chatExists = await Chat.exists({
    _id: chatId,
    'participants.user': req.user._id,
  });

  if (!chatExists) {
    throw new AppError('Chat not found', 404);
  }

  // Mark all messages as read (fire and forget for speed)
  Message.updateMany(
    { chatId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  ).exec();

  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
  });
});
