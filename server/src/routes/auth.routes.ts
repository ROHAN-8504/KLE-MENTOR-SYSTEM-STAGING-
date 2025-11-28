import { Router } from 'express';
import { selectRole, handleClerkWebhook } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Clerk webhook (no auth)
router.post('/webhook', handleClerkWebhook);

// Select role after first login
router.post('/select-role', authenticate, selectRole);

export default router;
