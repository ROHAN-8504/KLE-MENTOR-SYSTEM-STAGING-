import { Router } from 'express';
import { getCurrentUser } from '../controllers/auth.controller';
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getUserById,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Current user
router.get('/me', getCurrentUser);
router.put('/me', updateProfile);

// Avatar
router.post('/me/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/me/avatar', deleteAvatar);

// Get user by ID
router.get('/:id', getUserById);

export default router;
