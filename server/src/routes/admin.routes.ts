import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addMenteesToGroup,
  removeMenteeFromGroup,
  getActivityLogs,
  bulkUploadUsers,
  generateReport,
  // Admin Management
  getAllAdmins,
  transferSuperAdmin,
  removeAdmin,
  demoteAdmin,
  makeSuperAdmin,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateObjectId } from '../middleware/sanitize';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/role', validateObjectId('id'), updateUserRole);
router.put('/users/:id/status', validateObjectId('id'), updateUserStatus);
router.delete('/users/:id', validateObjectId('id'), deleteUser);
router.post('/users/bulk', bulkUploadUsers);

// Groups
router.get('/groups', getAllGroups);
router.post('/groups', createGroup);
router.put('/groups/:id', validateObjectId('id'), updateGroup);
router.delete('/groups/:id', validateObjectId('id'), deleteGroup);
router.post('/groups/:id/mentees', validateObjectId('id'), addMenteesToGroup);
router.delete('/groups/:id/mentees/:menteeId', validateObjectId('id'), validateObjectId('menteeId'), removeMenteeFromGroup);

// Activity Logs
router.get('/logs', getActivityLogs);

// Reports
router.get('/reports', generateReport);

// Admin Management (Super Admin only for most operations)
router.get('/admins', getAllAdmins);
router.post('/admins/transfer', transferSuperAdmin);
router.delete('/admins/:adminId', validateObjectId('adminId'), removeAdmin);
router.post('/admins/demote', demoteAdmin);
router.post('/admins/make-super', makeSuperAdmin);

export default router;
