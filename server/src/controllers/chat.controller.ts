import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Group from '../models/Group';
import { emitChatMessage } from '../socket';

// Get user's chats
export const getChats = catchAsync(async (req: AuthRequest, res: Response) => {
  const chats = await Chat.find({
    'participants.user': req.user._id,
  })
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .populate('latestMessage')
    .sort({ updatedAt: -1 });

  // Populate sender in latestMessage
  await Chat.populate(chats, {
    path: 'latestMessage.sender',
    select: 'profile.firstName profile.lastName avatar',
  });

  res.status(200).json({
    success: true,
    data: chats,
  });
});

// Create or access chat
export const accessChat = catchAsync(async (req: AuthRequest, res: Response) => {
  const { participantId } = req.body;

  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }

  // Check if chat already exists
  let chat = await Chat.findOne({
    'participants.user': { $all: [req.user._id, participantId] },
  })
    .populate('participants.user', 'profile.firstName profile.lastName avatar role')
    .populate('latestMessage');

  if (chat) {
    return res.status(200).json({
      success: true,
      data: chat,
    });
  }

  // Verify user can chat with this participant (same group)
  const group = await Group.findOne({
    $or: [
      { mentor: req.user._id, mentees: participantId },
      { mentor: participantId, mentees: req.user._id },
      { mentees: { $all: [req.user._id, participantId] } },
    ],
  });

  if (!group && req.user.role !== 'admin') {
    throw new AppError('You can only chat with users in your group', 403);
  }

  // Create new chat
  chat = await Chat.create({
    participants: [
      { user: req.user._id },
      { user: participantId },
    ],
  });

  chat = await Chat.findById(chat._id)
    .populate('participants.user', 'profile.firstName profile.lastName avatar role');

  res.status(201).json({
    success: true,
    data: chat,
  });
});

// Get chat messages
export const getMessages = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  // Verify user is part of chat
  const chat = await Chat.findOne({
    _id: chatId,
    'participants.user': req.user._id,
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  const messages = await Message.find({ chatId })
    .populate('sender', 'profile.firstName profile.lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ chatId });

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

// Send message
export const sendMessage = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { content } = req.body;

  // Verify user is part of chat
  const chat = await Chat.findOne({
    _id: chatId,
    'participants.user': req.user._id,
  }).populate('participants.user', 'profile.firstName profile.lastName avatar role');

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  const message = await Message.create({
    sender: req.user._id,
    content,
    chatId,
    readBy: [req.user._id],
  });

  // Update chat's latest message
  chat.latestMessage = message._id;
  await chat.save();

  await message.populate('sender', 'profile.firstName profile.lastName avatar');

  // Emit real-time message to all participants in the chat room (except sender)
  emitChatMessage(chatId, {
    ...message.toObject(),
    chat: chat.toObject(),
    chatId,
  }, req.user._id.toString());

  res.status(201).json({
    success: true,
    message: 'Message sent',
    data: message,
  });
});

// Mark messages as read
export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;

  // Verify user is part of chat
  const chat = await Chat.findOne({
    _id: chatId,
    'participants.user': req.user._id,
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  // Mark all messages as read
  await Message.updateMany(
    { chatId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

  res.status(200).json({
    success: true,
    message: 'Messages marked as read',
  });
});
