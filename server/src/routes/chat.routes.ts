import { Router } from 'express';
import {
  getChats,
  accessChat,
  getMessages,
  sendMessage,
  markAsRead,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Chats
router.get('/', getChats);
router.post('/', accessChat);

// Messages
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/messages', sendMessage);
router.put('/:chatId/read', markAsRead);

export default router;
