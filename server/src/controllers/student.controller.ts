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

// Get student dashboard
export const getStudentDashboard = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id })
    .populate('mentor', 'profile.firstName profile.lastName avatar email');

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

  const [upcomingMeetings, recentPosts, totalMeetings, attendedMeetings] = await Promise.all([
    Meeting.find({
      groupId: group._id,
      dateTime: { $gte: new Date() },
      status: 'scheduled',
    })
      .sort({ dateTime: 1 })
      .limit(5),
    Post.find({ groupId: group._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'profile.firstName profile.lastName avatar'),
    Meeting.countDocuments({ groupId: group._id, status: 'completed' }),
    Meeting.countDocuments({
      groupId: group._id,
      status: 'completed',
      'attendance.student': req.user._id,
      'attendance.present': true,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      group: {
        _id: group._id,
        name: group.name,
      },
      mentor: group.mentor,
      upcomingMeetings,
      recentPosts,
      attendance: {
        total: totalMeetings,
        attended: attendedMeetings,
        percentage: totalMeetings > 0 ? ((attendedMeetings / totalMeetings) * 100).toFixed(2) : 0,
      },
    },
  });
});

// Get my mentor
export const getMyMentor = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id })
    .populate('mentor', 'profile avatar email');

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

// Get my group
export const getMyGroup = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id })
    .populate('mentor', 'profile.firstName profile.lastName avatar email')
    .populate('mentees', 'profile.firstName profile.lastName avatar usn');

  if (!group) {
    throw new AppError('You are not assigned to any group yet', 404);
  }

  res.status(200).json({
    success: true,
    data: group,
  });
});

// Get my meetings
export const getMyMeetings = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { status } = req.query;

  const group = await Group.findOne({ mentees: req.user._id });

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
      .populate('scheduledBy', 'profile.firstName profile.lastName')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit),
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

// Get my attendance
export const getMyAttendance = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id });

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
  }).sort({ dateTime: -1 });

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

// Get my interactions with mentor
export const getMyInteractions = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [interactions, total] = await Promise.all([
    Interaction.find({ studentId: req.user._id })
      .populate('mentorId', 'profile.firstName profile.lastName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
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

// Manage academic records (Semester)
export const getMyAcademicRecords = catchAsync(async (req: AuthRequest, res: Response) => {
  const records = await Semester.find({ userId: req.user._id }).sort({
    year: -1,
    semester: -1,
  });

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

// Get group mates
export const getGroupMates = catchAsync(async (req: AuthRequest, res: Response) => {
  const group = await Group.findOne({ mentees: req.user._id }).populate(
    'mentees',
    'profile.firstName profile.lastName avatar usn email'
  );

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
