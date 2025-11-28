import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import User from '../models/User';
import Group from '../models/Group';
import Meeting from '../models/Meeting';
import Post from '../models/Post';
import Interaction from '../models/Interaction';
import Log from '../models/Log';
import Notification from '../models/Notification';

// Get mentor dashboard - OPTIMIZED
export const getMentorDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
  // Single query to get groups with mentees
  const groups = await Group.find({ mentor: req.user._id })
    .populate('mentees', 'profile.firstName profile.lastName usn avatar')
    .lean();

  if (groups.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        groups: 0,
        totalMentees: 0,
        meetings: { total: 0, completed: 0 },
        upcomingMeetings: [],
        recentPosts: [],
        menteeList: [],
      },
    });
  }

  const groupIds = groups.map((g) => g._id);
  const totalMentees = groups.reduce((acc, g) => acc + (g.mentees?.length || 0), 0);

  // Parallel queries with lean() for faster reads
  const [upcomingMeetings, recentPosts, meetingStats] = await Promise.all([
    Meeting.find({
      groupId: { $in: groupIds },
      dateTime: { $gte: new Date() },
      status: 'scheduled',
    })
      .select('title dateTime duration venue meetingType status')
      .sort({ dateTime: 1 })
      .limit(5)
      .lean(),
    Post.find({ groupId: { $in: groupIds } })
      .select('title content isPinned createdAt author')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'profile.firstName profile.lastName avatar')
      .lean(),
    Meeting.aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $group: { 
        _id: null, 
        total: { $sum: 1 }, 
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } 
      }}
    ]),
  ]);

  const stats = meetingStats[0] || { total: 0, completed: 0 };

  res.status(200).json({
    success: true,
    data: {
      groups: groups.length,
      totalMentees,
      meetings: {
        total: stats.total,
        completed: stats.completed,
      },
      upcomingMeetings,
      recentPosts,
      menteeList: groups.flatMap((g) => g.mentees || []),
    },
  });
});

// Get mentor's groups - OPTIMIZED
export const getMyGroups = catchAsync(async (req: AuthRequest, res: Response) => {
  const groups = await Group.find({ mentor: req.user._id })
    .populate('mentees', 'profile.firstName profile.lastName usn avatar email status')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: groups,
  });
});

// Get single group details - OPTIMIZED
export const getGroupDetails = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const groupObjectId = new mongoose.Types.ObjectId(id);

  const [group, meetingStats, totalPosts] = await Promise.all([
    Group.findOne({ _id: id, mentor: req.user._id })
      .populate('mentees', 'profile.firstName profile.lastName usn avatar email phone status')
      .lean(),
    Meeting.aggregate([
      { $match: { groupId: groupObjectId } },
      { $group: { 
        _id: null, 
        total: { $sum: 1 }, 
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } 
      }}
    ]),
    Post.countDocuments({ groupId: id }),
  ]);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  const stats = meetingStats[0] || { total: 0, completed: 0 };

  res.status(200).json({
    success: true,
    data: {
      group,
      stats: {
        totalMeetings: stats.total,
        completedMeetings: stats.completed,
        totalPosts,
        totalMentees: group.mentees?.length || 0,
      },
    },
  });
});

// Get mentee details - OPTIMIZED
export const getMenteeDetails = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const Semester = require('../models/Semester').default;

  // Verify mentor has access to this mentee
  const group = await Group.findOne({ mentor: req.user._id, mentees: id })
    .select('_id name')
    .lean();

  if (!group) {
    throw new AppError('Mentee not found in your groups', 404);
  }

  const [mentee, interactions, academicRecords] = await Promise.all([
    User.findById(id).select('-clerkId').lean(),
    Interaction.find({ studentId: id, mentorId: req.user._id })
      .select('type description date outcome')
      .sort({ date: -1 })
      .limit(10)
      .lean(),
    Semester.find({ userId: id })
      .select('semester year sgpa cgpa backlogs')
      .sort({ year: -1, semester: -1 })
      .lean(),
  ]);

  if (!mentee) {
    throw new AppError('Mentee not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      mentee,
      interactions,
      academicRecords,
      group,
    },
  });
});

// Record interaction with student - OPTIMIZED
export const recordInteraction = catchAsync(async (req: AuthRequest, res: Response) => {
  const { studentId, type, description, date, outcome, followUpRequired, followUpDate, attachments } = req.body;

  // Verify mentor has access to this student
  const group = await Group.findOne({ mentor: req.user._id, mentees: studentId })
    .select('_id')
    .lean();

  if (!group) {
    throw new AppError('Student not found in your groups', 404);
  }

  const interaction = await Interaction.create({
    studentId,
    mentorId: req.user._id,
    groupId: group._id,
    type,
    description,
    date: date || new Date(),
    outcome,
    followUpRequired,
    followUpDate,
    attachments,
  });

  // Fire and forget: Notify student and log
  Notification.create({
    type: 'MEETING_UPDATED',
    creator: req.user._id,
    content: interaction._id,
    contentModel: 'Interaction',
    message: `Your mentor has recorded a ${type} interaction`,
    receivers: [{ user: studentId, read: false }],
  });

  Log.create({
    user: req.user._id,
    eventType: 'RECORD_INTERACTION',
    entityType: 'Interaction',
    entityId: interaction._id,
    eventDetail: `Recorded ${type} interaction with student`,
    metadata: { studentId, type },
  });

  res.status(201).json({
    success: true,
    message: 'Interaction recorded successfully',
    data: interaction,
  });
});

// Get interactions - OPTIMIZED
export const getInteractions = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;
  const { studentId, type, startDate, endDate } = req.query;

  let query: any = { mentorId: req.user._id };

  if (studentId) query.studentId = studentId;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate as string);
    if (endDate) query.date.$lte = new Date(endDate as string);
  }

  const [interactions, total] = await Promise.all([
    Interaction.find(query)
      .select('studentId groupId type description date outcome followUpRequired')
      .populate('studentId', 'profile.firstName profile.lastName usn')
      .populate('groupId', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Interaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: interactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Update interaction
export const updateInteraction = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const interaction = await Interaction.findOneAndUpdate(
    { _id: id, mentorId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!interaction) {
    throw new AppError('Interaction not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Interaction updated successfully',
    data: interaction,
  });
});

// Delete interaction
export const deleteInteraction = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const interaction = await Interaction.findOneAndDelete({
    _id: id,
    mentorId: req.user._id,
  });

  if (!interaction) {
    throw new AppError('Interaction not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Interaction deleted successfully',
  });
});

// Get meeting attendance report - OPTIMIZED
export const getAttendanceReport = catchAsync(async (req: AuthRequest, res: Response) => {
  const { groupId, studentId } = req.query;

  let query: any = { scheduledBy: req.user._id, status: 'completed' };
  if (groupId) query.groupId = groupId;

  const meetings = await Meeting.find(query)
    .select('title dateTime attendance')
    .populate('attendance.student', 'profile.firstName profile.lastName usn')
    .sort({ dateTime: -1 })
    .lean();

  if (studentId) {
    // Filter attendance for specific student
    const studentAttendance = meetings.map((m: any) => ({
      meeting: m.title,
      date: m.dateTime,
      present: m.attendance.find((a: any) => a.student._id.toString() === studentId)?.present || false,
    }));

    const totalMeetings = studentAttendance.length;
    const presentCount = studentAttendance.filter((a) => a.present).length;

    return res.status(200).json({
      success: true,
      data: {
        attendance: studentAttendance,
        summary: {
          total: totalMeetings,
          present: presentCount,
          percentage: totalMeetings > 0 ? ((presentCount / totalMeetings) * 100).toFixed(2) : 0,
        },
      },
    });
  }

  res.status(200).json({
    success: true,
    data: meetings.map((m: any) => ({
      meeting: m.title,
      date: m.dateTime,
      attendance: m.attendance,
      presentCount: m.attendance.filter((a: any) => a.present).length,
      totalCount: m.attendance.length,
    })),
  });
});

// Get mentee academic records - OPTIMIZED
export const getMenteeAcademicRecords = catchAsync(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const Semester = require('../models/Semester').default;

  // Verify access with minimal data
  const groupExists = await Group.exists({ mentor: req.user._id, mentees: studentId });
  if (!groupExists) {
    throw new AppError('Student not found in your groups', 403);
  }

  const records = await Semester.find({ userId: studentId })
    .select('semester year sgpa cgpa subjects backlogs achievements marksheet')
    .sort({ year: -1, semester: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: records,
  });
});
