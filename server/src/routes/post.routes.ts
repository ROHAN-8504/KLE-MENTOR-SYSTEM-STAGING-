import { Router } from 'express';
import {
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  getComments,
  addComment,
  deleteComment,
} from '../controllers/post.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateObjectId } from '../middleware/sanitize';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Posts - All group members (mentor, student) can create/edit/delete their own posts
router.get('/', getPosts);
router.post('/', upload.array('attachments', 5), createPost);
router.get('/:id', validateObjectId('id'), getPost);
router.put('/:id', validateObjectId('id'), updatePost);
router.delete('/:id', validateObjectId('id'), deletePost);

// Comments
router.get('/:id/comments', validateObjectId('id'), getComments);
router.post('/:id/comments', validateObjectId('id'), addComment);
router.delete('/:id/comments/:commentId', validateObjectId('id'), validateObjectId('commentId'), deleteComment);

export default router;
