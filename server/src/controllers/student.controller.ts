import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import User from '../models/User';
import Group from '../models/Group';
import Meeting from '../models/Meeting';
import Post from '../models/Post';
import Interaction from '../models/Interaction';
import Semester from '../models/Semester';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

// Simple cache for student's group (5 min TTL)
const groupCache = new Map<string, { data: any; expiry: number }>();
const GROUP_CACHE_TTL = 5 * 60 * 1000;

const getCachedGroup = async (userId: string) => {
  const cached = groupCache.get(userId);
  if (cached && cached.expiry > Date.now()) return cached.data;
  
  const group = await Group.findOne({ mentees: userId })
    .populate('mentor', 'profile.firstName profile.lastName avatar email')
    .lean();
  
  if (group) {
    groupCache.set(userId, { data: group, expiry: Date.now() + GROUP_CACHE_TTL });
  }
  return group;
};

// Get student dashboard - OPTIMIZED
export const getStudentDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    return res.status(200).json({
      success: true,
      data: {
        message: 'You are not assigned to any group yet',
        mentor: null,
        upcomingMeetings: [],
        recentPosts: [],
      },
    });
  }

  // Use aggregation for attendance calculation (faster than multiple queries)
  const [upcomingMeetings, recentPosts, attendanceStats] = await Promise.all([
    Meeting.find({
      groupId: group._id,
      dateTime: { $gte: new Date() },
      status: 'scheduled',
    })
      .select('title dateTime duration venue meetingType')
      .sort({ dateTime: 1 })
      .limit(5)
      .lean(),
    Post.find({ groupId: group._id })
      .select('title content isPinned createdAt author')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'profile.firstName profile.lastName avatar')
      .lean(),
    Meeting.aggregate([
      { $match: { groupId: group._id, status: 'completed' } },
      { $unwind: { path: '$attendance', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          attended: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$attendance.student', req.user._id] },
                  { $eq: ['$attendance.present', true] }
                ]},
                1, 0
              ]
            }
          }
        }
      }
    ])
  ]);

  const stats = attendanceStats[0] || { total: 0, attended: 0 };

  res.status(200).json({
    success: true,
    data: {
      group: { _id: group._id, name: group.name },
      mentor: group.mentor,
      upcomingMeetings,
      recentPosts,
      attendance: {
        total: stats.total,
        attended: stats.attended,
        percentage: stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(2) : 0,
      },
    },
  });
});

// Get my mentor - OPTIMIZED
export const getMyMentor = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    throw new AppError('You are not assigned to any mentor yet', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      mentor: group.mentor,
      group: {
        _id: group._id,
        name: group.name,
      },
    },
  });
});

// Get my group - OPTIMIZED
export const getMyGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id })
    .select('name mentor mentees')
    .populate('mentor', 'profile.firstName profile.lastName avatar email')
    .populate('mentees', 'profile.firstName profile.lastName avatar usn')
    .lean();

  if (!group) {
    throw new AppError('You are not assigned to any group yet', 404);
  }

  res.status(200).json({
    success: true,
    data: group,
  });
});

// Get my meetings - OPTIMIZED
export const getMyMeetings = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;
  const { status } = req.query;

  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    return res.status(200).json({
      success: true,
      data: {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      },
    });
  }

  let query: any = { groupId: group._id };
  if (status) query.status = status;

  const [meetings, total] = await Promise.all([
    Meeting.find(query)
      .select('title dateTime duration venue meetingType meetingLink status scheduledBy')
      .populate('scheduledBy', 'profile.firstName profile.lastName')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items: meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Get my attendance - OPTIMIZED
export const getMyAttendance = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    return res.status(200).json({
      success: true,
      data: {
        attendance: [],
        summary: { total: 0, present: 0, percentage: 0 },
      },
    });
  }

  const meetings = await Meeting.find({
    groupId: group._id,
    status: 'completed',
  })
    .select('title dateTime attendance')
    .sort({ dateTime: -1 })
    .lean();

  const attendance = meetings.map((m: any) => {
    const myAttendance = m.attendance.find(
      (a: any) => a.student?.toString() === req.user._id.toString()
    );
    return {
      meeting: m.title,
      date: m.dateTime,
      present: myAttendance?.present || false,
    };
  });

  const totalMeetings = attendance.length;
  const presentCount = attendance.filter((a) => a.present).length;

  res.status(200).json({
    success: true,
    data: {
      attendance,
      summary: {
        total: totalMeetings,
        present: presentCount,
        percentage: totalMeetings > 0 ? ((presentCount / totalMeetings) * 100).toFixed(2) : 0,
      },
    },
  });
});

// Get my interactions with mentor - OPTIMIZED
export const getMyInteractions = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;

  const [interactions, total] = await Promise.all([
    Interaction.find({ studentId: req.user._id })
      .select('mentorId date type notes')
      .populate('mentorId', 'profile.firstName profile.lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Interaction.countDocuments({ studentId: req.user._id }),
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

// Manage academic records (Semester) - OPTIMIZED
export const getMyAcademicRecords = catchAsync(async (req: AuthRequest, res: Response) => {
  const records = await Semester.find({ userId: req.user._id })
    .select('semester year sgpa cgpa backlogs achievements marksheet')
    .sort({ year: -1, semester: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: records,
  });
});

// Add academic record
export const addAcademicRecord = catchAsync(async (req: AuthRequest, res: Response) => {
  const { semester, year, sgpa, cgpa, subjects, backlogs, achievements, remarks } = req.body;

  // Check if record already exists
  const existingRecord = await Semester.findOne({
    userId: req.user._id,
    semester,
    year,
  });

  if (existingRecord) {
    throw new AppError('Record for this semester already exists', 400);
  }

  const record = await Semester.create({
    userId: req.user._id,
    semester,
    year,
    sgpa,
    cgpa,
    subjects,
    backlogs,
    achievements,
    remarks,
  });

  res.status(201).json({
    success: true,
    message: 'Academic record added successfully',
    data: record,
  });
});

// Update academic record
export const updateAcademicRecord = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const record = await Semester.findOneAndUpdate(
    { _id: id, userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Academic record updated successfully',
    data: record,
  });
});

// Delete academic record
export const deleteAcademicRecord = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const record = await Semester.findOneAndDelete({
    _id: id,
    userId: req.user._id,
  });

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Academic record deleted successfully',
  });
});

// Upload marksheet
export const uploadMarksheet = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.file) {
    throw new AppError('Please upload a file', 400);
  }

  const record = await Semester.findOne({ _id: id, userId: req.user._id });

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  // Delete old marksheet if exists
  if (record.marksheet) {
    await deleteFromCloudinary(record.marksheet);
  }

  // Upload new marksheet
  const result = await uploadToCloudinary(req.file.buffer, 'marksheets');

  record.marksheet = result.url;
  await record.save();

  res.status(200).json({
    success: true,
    message: 'Marksheet uploaded successfully',
    data: record,
  });
});

// Get group mates - OPTIMIZED
export const getGroupMates = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id })
    .select('mentees')
    .populate('mentees', 'profile.firstName profile.lastName avatar usn email')
    .lean();

  if (!group) {
    throw new AppError('You are not assigned to any group yet', 404);
  }

  // Filter out current user
  const groupMates = (group.mentees as any[]).filter(
    (m) => m._id.toString() !== req.user._id.toString()
  );

  res.status(200).json({
    success: true,
    data: groupMates,
  });
});
