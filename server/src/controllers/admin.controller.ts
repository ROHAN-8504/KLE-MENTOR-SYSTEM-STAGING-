import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import { sanitizeRegex, escapeHtml } from '../middleware/sanitize';
import User from '../models/User';
import Group from '../models/Group';
import Meeting from '../models/Meeting';
import Post from '../models/Post';
import Log from '../models/Log';
import Notification from '../models/Notification';
import Interaction from '../models/Interaction';
import Semester from '../models/Semester';
import { emitNotification } from '../socket';

// Dashboard statistics
export const getDashboardStats = catchAsync(async (req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalMentors,
    totalStudents,
    totalGroups,
    totalMeetings,
    completedMeetings,
    pendingMeetings,
    totalPosts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'mentor' }),
    User.countDocuments({ role: 'student' }),
    Group.countDocuments(),
    Meeting.countDocuments(),
    Meeting.countDocuments({ status: 'completed' }),
    Meeting.countDocuments({ status: 'scheduled' }),
    Post.countDocuments(),
  ]);

  // Recent activity
  const recentActivity = await Log.find()
    .populate('user', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        mentors: totalMentors,
        students: totalStudents,
        admins: totalUsers - totalMentors - totalStudents,
      },
      groups: totalGroups,
      meetings: {
        total: totalMeetings,
        completed: completedMeetings,
        pending: pendingMeetings,
      },
      posts: totalPosts,
      recentActivity,
    },
  });
});

// Get all users
export const getAllUsers = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { role, search, status } = req.query;

  let query: any = {};

  if (role) query.role = role;
  if (status) query.status = status;
  if (search) {
    // Sanitize search to prevent NoSQL injection
    const sanitizedSearch = sanitizeRegex(String(search));
    query.$or = [
      { 'profile.firstName': { $regex: sanitizedSearch, $options: 'i' } },
      { 'profile.lastName': { $regex: sanitizedSearch, $options: 'i' } },
      { email: { $regex: sanitizedSearch, $options: 'i' } },
      { usn: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Update user role
export const updateUserRole = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['admin', 'mentor', 'student'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'UPDATE_USER_ROLE',
    entityType: 'User',
    entityId: user._id,
    eventDetail: `Updated user ${user.email} role to ${role}`,
    metadata: { oldRole: user.role, newRole: role },
  });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: user,
  });
});

// Update user status
export const updateUserStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'blocked'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'UPDATE_USER_STATUS',
    entityType: 'User',
    entityId: user._id,
    eventDetail: `Updated user ${user.email} status to ${status}`,
    metadata: { status },
  });

  res.status(200).json({
    success: true,
    message: 'User status updated successfully',
    data: user,
  });
});

// Delete user
export const deleteUser = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent deleting super admin
  if (user.isSuperAdmin) {
    throw new AppError('Cannot delete super admin. Transfer ownership first.', 400);
  }

  // Only super admin can delete other admins
  if (user.role === 'admin' && !req.user.isSuperAdmin) {
    throw new AppError('Only super admin can delete other admins', 403);
  }

  // Prevent deleting yourself
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot delete your own account', 400);
  }

  // Remove user from groups
  await Group.updateMany(
    { mentees: id },
    { $pull: { mentees: id } }
  );

  // Delete user
  await User.findByIdAndDelete(id);

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'DELETE_USER',
    entityType: 'User',
    entityId: id,
    eventDetail: `Deleted user ${user.email}`,
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// Get all groups
export const getAllGroups = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { search, mentorId } = req.query;

  let query: any = {};

  if (mentorId) query.mentor = mentorId;
  if (search) {
    // Sanitize search to prevent NoSQL injection
    const sanitizedSearch = sanitizeRegex(String(search));
    query.name = { $regex: sanitizedSearch, $options: 'i' };
  }

  const [groups, total] = await Promise.all([
    Group.find(query)
      .populate('mentor', 'profile.firstName profile.lastName email')
      .populate('mentees', 'profile.firstName profile.lastName email usn')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Group.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Create group
export const createGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const { name, description, mentorId, mentor, menteeIds } = req.body;
  
  // Accept both mentorId and mentor field names
  const actualMentorId = mentorId || mentor;

  if (!actualMentorId) {
    throw new AppError('Mentor is required', 400);
  }

  // Verify mentor exists and is a mentor
  const mentorUser = await User.findOne({ _id: actualMentorId, role: 'mentor' });
  if (!mentorUser) {
    throw new AppError('Mentor not found or user is not a mentor', 404);
  }

  // Verify mentees exist and are students
  if (menteeIds?.length) {
    const mentees = await User.find({ _id: { $in: menteeIds }, role: 'student' });
    if (mentees.length !== menteeIds.length) {
      throw new AppError('Some mentees not found or are not students', 400);
    }
  }

  const group = await Group.create({
    name,
    description,
    mentor: actualMentorId,
    mentees: menteeIds || [],
    createdBy: req.user._id,
  });

  await group.populate([
    { path: 'mentor', select: 'profile.firstName profile.lastName email' },
    { path: 'mentees', select: 'profile.firstName profile.lastName email usn' },
  ]);

  // Notify mentor
  const mentorNotification = await Notification.create({
    type: 'GROUP_ASSIGNED',
    creator: req.user._id,
    content: group._id,
    contentModel: 'Group',
    message: `You have been assigned as mentor for group "${name}"`,
    receivers: [{ user: actualMentorId, read: false }],
  });

  // Emit real-time notification to mentor
  emitNotification([actualMentorId], {
    _id: mentorNotification._id,
    type: 'GROUP_ASSIGNED',
    message: `You have been assigned as mentor for group "${name}"`,
    content: group._id,
    createdAt: mentorNotification.createdAt,
  });

  // Notify mentees
  if (menteeIds?.length) {
    const menteeNotification = await Notification.create({
      type: 'GROUP_ASSIGNED',
      creator: req.user._id,
      content: group._id,
      contentModel: 'Group',
      message: `You have been added to group "${name}"`,
      receivers: menteeIds.map((menteeId: string) => ({ user: menteeId, read: false })),
    });

    // Emit real-time notification to all mentees
    emitNotification(menteeIds, {
      _id: menteeNotification._id,
      type: 'GROUP_ASSIGNED',
      message: `You have been added to group "${name}"`,
      content: group._id,
      createdAt: menteeNotification.createdAt,
    });
  }

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'CREATE_GROUP',
    entityType: 'Group',
    entityId: group._id,
    eventDetail: `Created group: ${name}`,
  });

  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: group,
  });
});

// Update group
export const updateGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const group = await Group.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate('mentor', 'profile.firstName profile.lastName email')
    .populate('mentees', 'profile.firstName profile.lastName email usn');

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Group updated successfully',
    data: group,
  });
});

// Delete group
export const deleteGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const group = await Group.findByIdAndDelete(id);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'DELETE_GROUP',
    entityType: 'Group',
    entityId: id,
    eventDetail: `Deleted group: ${group.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Group deleted successfully',
  });
});

// Add mentees to group
export const addMenteesToGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { menteeIds } = req.body;

  const group = await Group.findById(id);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Verify mentees exist and are students
  const mentees = await User.find({ _id: { $in: menteeIds }, role: 'student' });
  if (mentees.length !== menteeIds.length) {
    throw new AppError('Some mentees not found or are not students', 400);
  }

  // Add mentees to group
  await Group.findByIdAndUpdate(id, {
    $addToSet: { mentees: { $each: menteeIds } },
  });

  // Notify new mentees
  const notification = await Notification.create({
    type: 'GROUP_ASSIGNED',
    creator: req.user._id,
    content: group._id,
    contentModel: 'Group',
    message: `You have been added to group "${group.name}"`,
    receivers: menteeIds.map((menteeId: string) => ({ user: menteeId, read: false })),
  });

  // Emit real-time notification to all new mentees
  emitNotification(menteeIds, {
    _id: notification._id,
    type: 'GROUP_ASSIGNED',
    message: `You have been added to group "${group.name}"`,
    content: group._id,
    createdAt: notification.createdAt,
  });

  const updatedGroup = await Group.findById(id)
    .populate('mentor', 'profile.firstName profile.lastName email')
    .populate('mentees', 'profile.firstName profile.lastName email usn');

  res.status(200).json({
    success: true,
    message: 'Mentees added successfully',
    data: updatedGroup,
  });
});

// Remove mentee from group
export const removeMenteeFromGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id, menteeId } = req.params;

  const group = await Group.findByIdAndUpdate(
    id,
    { $pull: { mentees: menteeId } },
    { new: true }
  )
    .populate('mentor', 'profile.firstName profile.lastName email')
    .populate('mentees', 'profile.firstName profile.lastName email usn');

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Mentee removed successfully',
    data: group,
  });
});

// Get activity logs
export const getActivityLogs = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const { action, userId, entityType, startDate, endDate } = req.query;

  let query: any = {};

  if (action) query.action = action;
  if (userId) query.user = userId;
  if (entityType) query.entityType = entityType;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate as string);
    if (endDate) query.createdAt.$lte = new Date(endDate as string);
  }

  const [logs, total] = await Promise.all([
    Log.find(query)
      .populate('user', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Log.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Bulk upload students (CSV/Excel)
export const bulkUploadUsers = catchAsync(async (req: AuthRequest, res: Response) => {
  const { users } = req.body; // Array of user objects

  if (!users?.length) {
    throw new AppError('No users provided', 400);
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[],
  };

  for (const userData of users) {
    try {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        // Update existing user
        await User.findByIdAndUpdate(existingUser._id, {
          $set: {
            usn: userData.usn,
            'profile.firstName': userData.firstName,
            'profile.lastName': userData.lastName,
            'profile.phone': userData.phone,
            'profile.department': userData.department,
            'profile.semester': userData.semester,
          },
        });
        results.updated++;
      } else {
        // Create new user placeholder
        await User.create({
          email: userData.email,
          clerkId: `pending_${userData.email}`,
          usn: userData.usn,
          role: userData.role || 'student',
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            department: userData.department,
            semester: userData.semester,
          },
        });
        results.created++;
      }
    } catch (error: any) {
      results.errors.push(`Error processing ${userData.email}: ${error.message}`);
    }
  }

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'BULK_UPLOAD_USERS',
    entityType: 'User',
    eventDetail: `Bulk uploaded users: ${results.created} created, ${results.updated} updated`,
    metadata: results,
  });

  res.status(200).json({
    success: true,
    message: 'Bulk upload completed',
    data: results,
  });
});

// Generate reports
export const generateReport = catchAsync(async (req: AuthRequest, res: Response) => {
  const { type, groupId, startDate, endDate, period } = req.query;

  let reportData: any = {};

  // If no type specified, return overview stats
  if (!type || type === 'overview') {
    // Calculate date range based on period
    let dateFilter: Date | undefined;
    const now = new Date();
    switch (period) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        dateFilter = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateFilter = undefined;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers, mentors, students, admins, newUsersThisMonth,
      totalGroups, totalMeetings, completedMeetings, cancelledMeetings,
      totalPosts, postsThisMonth, totalInteractions, interactionsThisMonth
    ] = await Promise.all([
      User.countDocuments(dateFilter ? { createdAt: { $gte: dateFilter } } : {}),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Group.countDocuments(),
      Meeting.countDocuments(),
      Meeting.countDocuments({ status: 'completed' }),
      Meeting.countDocuments({ status: 'cancelled' }),
      Post.countDocuments(),
      Post.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Interaction.countDocuments(),
      Interaction.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    // Calculate average mentees per group
    const groups = await Group.find();
    const avgMentees = groups.length > 0
      ? groups.reduce((sum, g) => sum + (g.mentees?.length || 0), 0) / groups.length
      : 0;

    // Calculate average attendance
    const completedMeetingsWithAttendance = await Meeting.find({ status: 'completed' });
    let totalAttendance = 0;
    let totalExpected = 0;
    for (const meeting of completedMeetingsWithAttendance) {
      const attendanceArray = meeting.attendance || [];
      totalAttendance += attendanceArray.filter((a: any) => a.present).length;
      totalExpected += attendanceArray.length;
    }
    const avgAttendance = totalExpected > 0 ? (totalAttendance / totalExpected) * 100 : 0;

    reportData = {
      users: {
        total: totalUsers,
        mentors,
        students,
        admins,
        newThisMonth: newUsersThisMonth,
      },
      groups: {
        total: totalGroups,
        averageMentees: avgMentees,
      },
      meetings: {
        total: totalMeetings,
        completed: completedMeetings,
        cancelled: cancelledMeetings,
        averageAttendance: avgAttendance,
      },
      posts: {
        total: totalPosts,
        thisMonth: postsThisMonth,
      },
      interactions: {
        total: totalInteractions,
        thisMonth: interactionsThisMonth,
      },
    };

    return res.status(200).json({
      success: true,
      data: reportData,
    });
  }

  switch (type) {
    case 'meetings':
      reportData = await Meeting.aggregate([
        {
          $match: {
            ...(groupId && { groupId }),
            ...(startDate || endDate ? {
              dateTime: {
                ...(startDate && { $gte: new Date(startDate as string) }),
                ...(endDate && { $lte: new Date(endDate as string) }),
              },
            } : {}),
          },
        },
        {
          $group: {
            _id: { $month: '$dateTime' },
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      break;

    case 'interactions':
      reportData = await Interaction.aggregate([
        {
          $match: {
            ...(startDate || endDate ? {
              date: {
                ...(startDate && { $gte: new Date(startDate as string) }),
                ...(endDate && { $lte: new Date(endDate as string) }),
              },
            } : {}),
          },
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);
      break;

    case 'attendance':
      const meetings = await Meeting.find({
        ...(groupId && { groupId }),
        status: 'completed',
        ...(startDate || endDate ? {
          dateTime: {
            ...(startDate && { $gte: new Date(startDate as string) }),
            ...(endDate && { $lte: new Date(endDate as string) }),
          },
        } : {}),
      }).populate('attendance.student', 'profile.firstName profile.lastName usn');

      reportData = meetings.map((m: any) => ({
        meeting: m.title,
        date: m.dateTime,
        attendance: m.attendance,
      }));
      break;

    default:
      throw new AppError('Invalid report type', 400);
  }

  res.status(200).json({
    success: true,
    data: reportData,
  });
});

// ==========================================
// ADMIN MANAGEMENT FUNCTIONS
// ==========================================

// Get all admin users
export const getAllAdmins = catchAsync(async (req: AuthRequest, res: Response) => {
  const admins = await User.find({ role: 'admin' })
    .select('profile.firstName profile.lastName email isSuperAdmin createdAt clerkId')
    .sort({ isSuperAdmin: -1, createdAt: 1 });

  // Check if current user is super admin
  const currentUserIsSuperAdmin = req.user.isSuperAdmin === true;

  res.status(200).json({
    success: true,
    data: {
      admins: admins.map(admin => ({
        _id: admin._id,
        firstName: admin.profile.firstName,
        lastName: admin.profile.lastName,
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        isTestAccount: admin.clerkId?.includes('test'),
        createdAt: admin.createdAt,
      })),
      currentUserIsSuperAdmin,
      currentUserId: req.user._id,
    },
  });
});

// Transfer super admin ownership to another admin
export const transferSuperAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const { newAdminId } = req.body;

  // Only super admin can transfer ownership
  if (!req.user.isSuperAdmin) {
    throw new AppError('Only super admin can transfer ownership', 403);
  }

  // Find the new admin
  const newAdmin = await User.findOne({ _id: newAdminId, role: 'admin' });
  if (!newAdmin) {
    throw new AppError('Target user not found or is not an admin', 404);
  }

  // Cannot transfer to yourself
  if (newAdmin._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot transfer ownership to yourself', 400);
  }

  // Transfer ownership
  await User.findByIdAndUpdate(req.user._id, { isSuperAdmin: false });
  await User.findByIdAndUpdate(newAdmin._id, { isSuperAdmin: true });

  // Log the transfer
  await Log.create({
    user: req.user._id,
    eventType: 'TRANSFER_SUPER_ADMIN',
    entityType: 'User',
    entityId: newAdmin._id,
    eventDetail: `Super admin transferred from ${req.user.email} to ${newAdmin.email}`,
  });

  res.status(200).json({
    success: true,
    message: `Super admin ownership transferred to ${newAdmin.email}`,
    data: {
      newSuperAdmin: {
        _id: newAdmin._id,
        email: newAdmin.email,
        firstName: newAdmin.profile.firstName,
        lastName: newAdmin.profile.lastName,
      },
    },
  });
});

// Remove an admin (only super admin can do this)
export const removeAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const { adminId } = req.params;

  // Only super admin can remove admins
  if (!req.user.isSuperAdmin) {
    throw new AppError('Only super admin can remove other admins', 403);
  }

  const adminToRemove = await User.findOne({ _id: adminId, role: 'admin' });
  if (!adminToRemove) {
    throw new AppError('Admin not found', 404);
  }

  // Cannot remove super admin
  if (adminToRemove.isSuperAdmin) {
    throw new AppError('Cannot remove super admin. Transfer ownership first.', 400);
  }

  // Cannot remove yourself
  if (adminToRemove._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot remove yourself', 400);
  }

  // Delete the admin
  await User.findByIdAndDelete(adminId);

  // Log the removal
  await Log.create({
    user: req.user._id,
    eventType: 'REMOVE_ADMIN',
    entityType: 'User',
    entityId: adminId,
    eventDetail: `Admin ${adminToRemove.email} removed by ${req.user.email}`,
  });

  res.status(200).json({
    success: true,
    message: `Admin ${adminToRemove.email} has been removed`,
  });
});

// Demote an admin to mentor or student (only super admin)
export const demoteAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const { adminId, newRole } = req.body;

  // Only super admin can demote admins
  if (!req.user.isSuperAdmin) {
    throw new AppError('Only super admin can demote admins', 403);
  }

  if (!['mentor', 'student'].includes(newRole)) {
    throw new AppError('Invalid role. Must be mentor or student', 400);
  }

  const adminToDemote = await User.findOne({ _id: adminId, role: 'admin' });
  if (!adminToDemote) {
    throw new AppError('Admin not found', 404);
  }

  // Cannot demote super admin
  if (adminToDemote.isSuperAdmin) {
    throw new AppError('Cannot demote super admin. Transfer ownership first.', 400);
  }

  // Cannot demote yourself
  if (adminToDemote._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot demote yourself', 400);
  }

  // Demote the admin
  await User.findByIdAndUpdate(adminId, { 
    role: newRole, 
    isSuperAdmin: false 
  });

  // Log the demotion
  await Log.create({
    user: req.user._id,
    eventType: 'DEMOTE_ADMIN',
    entityType: 'User',
    entityId: adminId,
    eventDetail: `Admin ${adminToDemote.email} demoted to ${newRole} by ${req.user.email}`,
  });

  res.status(200).json({
    success: true,
    message: `${adminToDemote.email} has been demoted to ${newRole}`,
  });
});

// Make an existing admin a super admin (only current super admin can do this)
export const makeSuperAdmin = catchAsync(async (req: AuthRequest, res: Response) => {
  const { adminId } = req.body;

  // Check if there's already a super admin
  const existingSuperAdmin = await User.findOne({ role: 'admin', isSuperAdmin: true });
  
  if (existingSuperAdmin && !req.user.isSuperAdmin) {
    throw new AppError('A super admin already exists. Only the current super admin can transfer ownership.', 403);
  }

  const admin = await User.findOne({ _id: adminId, role: 'admin' });
  if (!admin) {
    throw new AppError('Admin not found', 404);
  }

  // If there's an existing super admin, remove their status
  if (existingSuperAdmin && existingSuperAdmin._id.toString() !== adminId) {
    await User.findByIdAndUpdate(existingSuperAdmin._id, { isSuperAdmin: false });
  }

  // Make the new admin super admin
  await User.findByIdAndUpdate(adminId, { isSuperAdmin: true });

  // Log the change
  await Log.create({
    user: req.user._id,
    eventType: 'MAKE_SUPER_ADMIN',
    entityType: 'User',
    entityId: adminId,
    eventDetail: `${admin.email} is now super admin`,
  });

  res.status(200).json({
    success: true,
    message: `${admin.email} is now the super admin`,
  });
});
