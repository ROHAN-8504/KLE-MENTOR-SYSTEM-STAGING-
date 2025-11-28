import { Router } from 'express';
import {
  getStudentDashboard,
  getMyMentor,
  getMyGroup,
  getMyMeetings,
  getMyAttendance,
  getMyInteractions,
  getMyAcademicRecords,
  addAcademicRecord,
  updateAcademicRecord,
  deleteAcademicRecord,
  uploadMarksheet,
  getGroupMates,
} from '../controllers/student.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize('student'));

// Dashboard
router.get('/dashboard', getStudentDashboard);

// Mentor & Group
router.get('/mentor', getMyMentor);
router.get('/group', getMyGroup);
router.get('/group-mates', getGroupMates);

// Meetings
router.get('/meetings', getMyMeetings);
router.get('/attendance', getMyAttendance);

// Interactions
router.get('/interactions', getMyInteractions);

// Academic Records
router.get('/academics', getMyAcademicRecords);
router.post('/academics', addAcademicRecord);
router.put('/academics/:id', updateAcademicRecord);
router.delete('/academics/:id', deleteAcademicRecord);
router.post('/academics/:id/marksheet', upload.single('marksheet'), uploadMarksheet);

export default router;
