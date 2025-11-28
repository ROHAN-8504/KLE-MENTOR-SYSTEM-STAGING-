import { Router } from 'express';
import {
  getMentorDashboard,
  getMyGroups,
  getGroupDetails,
  getMenteeDetails,
  recordInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
  getAttendanceReport,
  getMenteeAcademicRecords,
} from '../controllers/mentor.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication and mentor role
router.use(authenticate);
router.use(authorize('mentor'));

// Dashboard
router.get('/dashboard', getMentorDashboard);

// Groups
router.get('/groups', getMyGroups);
router.get('/groups/:id', getGroupDetails);

// Mentees
router.get('/mentees/:id', getMenteeDetails);
router.get('/mentees/:studentId/academics', getMenteeAcademicRecords);

// Interactions
router.get('/interactions', getInteractions);
router.post('/interactions', recordInteraction);
router.put('/interactions/:id', updateInteraction);
router.delete('/interactions/:id', deleteInteraction);

// Reports
router.get('/attendance', getAttendanceReport);

export default router;
