import { Router } from 'express';
import {
  getMeetings,
  createMeeting,
  getMeeting,
  updateMeeting,
  cancelMeeting,
  markAttendance,
  getMeetingStats,
} from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateObjectId } from '../middleware/sanitize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Meetings
router.get('/', getMeetings);
router.get('/stats', getMeetingStats);
router.post('/', authorize('mentor', 'admin'), createMeeting);
router.get('/:id', validateObjectId('id'), getMeeting);
router.put('/:id', validateObjectId('id'), authorize('mentor', 'admin'), updateMeeting);
router.post('/:id/cancel', validateObjectId('id'), authorize('mentor', 'admin'), cancelMeeting);
router.post('/:id/attendance', validateObjectId('id'), authorize('mentor', 'admin'), markAttendance);

export default router;
