import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Meeting from '../models/Meeting';
import Group from '../models/Group';
import Notification from '../models/Notification';
import Log from '../models/Log';
import { sendEmail } from '../utils/email';
import { emitNotification } from '../socket';

// Get meetings (filtered by role)
export const getMeetings = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const { status, groupId } = req.query;

  let query: any = {};

  if (req.user.role === 'admin') {
    // Admin can see all meetings
    if (groupId) query.groupId = groupId;
  } else {
    // Mentors/Students see only their group meetings
    const groups = await Group.find({
      $or: [{ mentor: req.user._id }, { mentees: req.user._id }],
    });
    const groupIds = groups.map((g) => g._id);
    query.groupId = { $in: groupIds };
  }

  if (status) query.status = status;

  const [meetings, total] = await Promise.all([
    Meeting.find(query)
      .populate('groupId', 'name')
      .populate('scheduledBy', 'profile.firstName profile.lastName')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(limit),
    Meeting.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: meetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Create meeting
export const createMeeting = catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, description, dateTime, duration, venue, groupId, meetingType, meetingLink } = req.body;

  console.log('📅 Creating meeting with data:', { title, dateTime, duration, groupId, meetingType, venue, meetingLink });

  // Validate required fields
  if (!title || !title.trim()) {
    throw new AppError('Meeting title is required', 400);
  }

  if (!groupId) {
    throw new AppError('Group ID is required', 400);
  }

  if (!dateTime) {
    throw new AppError('Date and time is required', 400);
  }

  // Validate dateTime is in the future
  const meetingDate = new Date(dateTime);
  const now = new Date();
  
  console.log('📅 Date validation:', { meetingDate, now, isValid: !isNaN(meetingDate.getTime()) });
  
  if (isNaN(meetingDate.getTime())) {
    throw new AppError('Invalid date format', 400);
  }
  
  if (meetingDate <= now) {
    throw new AppError('Meeting date and time must be in the future', 400);
  }

  // Validate date is not too far in the future (1 year max)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  
  if (meetingDate > maxDate) {
    throw new AppError('Meeting cannot be scheduled more than 1 year in advance', 400);
  }

  // Validate duration
  if (duration && (duration < 5 || duration > 480)) {
    throw new AppError('Meeting duration must be between 5 and 480 minutes', 400);
  }

  // Verify mentor owns the group
  const group = await Group.findOne({
    _id: groupId,
    mentor: req.user._id,
  }).populate('mentees', 'profile.firstName profile.lastName email');

  console.log('📅 Group found:', group ? group.name : 'NOT FOUND');

  if (!group) {
    throw new AppError('Group not found or you are not the mentor', 404);
  }

  // Normalize meeting type
  const normalizedMeetingType = meetingType === 'offline' ? 'in-person' : (meetingType || 'online');

  const meeting = await Meeting.create({
    title,
    description,
    dateTime: meetingDate,
    duration: duration || 30,
    venue,
    groupId,
    meetingType: normalizedMeetingType,
    meetingLink,
    scheduledBy: req.user._id,
  });

  console.log('📅 Meeting created successfully:', meeting._id);

  await meeting.populate([
    { path: 'groupId', select: 'name' },
    { path: 'scheduledBy', select: 'profile.firstName profile.lastName' },
  ]);

  // Handle notifications in try-catch to prevent failure of main operation
  try {
    // Create notification for all mentees
    if (group.mentees && group.mentees.length > 0) {
      await Notification.create({
        type: 'MEETING_SCHEDULED',
        creator: req.user._id,
        content: meeting._id,
        contentModel: 'Meeting',
        message: `A new meeting "${title}" has been scheduled for ${meetingDate.toLocaleDateString()}`,
        receivers: (group.mentees as any[]).map((mentee) => ({ user: mentee._id, read: false })),
      });
      console.log('📅 Notifications created for mentees');
    }

    // Send email notifications
    const menteeEmails = (group.mentees as any[]).map((m) => m.email).filter(Boolean);
    if (menteeEmails.length > 0) {
      await sendEmail({
        to: menteeEmails,
        subject: `New Meeting: ${title}`,
        html: `
          <h2>New Meeting Scheduled</h2>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Date:</strong> ${meetingDate.toLocaleString()}</p>
          <p><strong>Duration:</strong> ${duration || 30} minutes</p>
          <p><strong>Venue:</strong> ${venue || meetingLink || 'TBD'}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        `,
      });
    }

    // Emit real-time notifications to all mentees
    const menteeIds = (group.mentees as any[]).map((m) => m._id.toString());
    emitNotification(menteeIds, {
      type: 'MEETING_SCHEDULED',
      title: 'New Meeting Scheduled',
      message: `A new meeting "${title}" has been scheduled`,
      content: meeting._id,
      createdAt: new Date(),
    });
  } catch (notificationError) {
    console.error('📅 Failed to send notifications:', notificationError);
    // Don't throw - meeting was created successfully
  }

  // Log activity (non-blocking)
  try {
    await Log.create({
      user: req.user._id,
      eventType: 'MEETING_CREATED',
      entityType: 'Meeting',
      entityId: meeting._id,
      eventDetail: `Created meeting: ${title}`,
      metadata: { groupId, dateTime: meetingDate },
    });
  } catch (logError) {
    console.error('📅 Failed to log activity:', logError);
  }

  res.status(201).json({
    success: true,
    message: 'Meeting created successfully',
    data: meeting,
  });
});

// Get single meeting
export const getMeeting = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const meeting = await Meeting.findById(id)
    .populate('groupId', 'name')
    .populate('scheduledBy', 'profile.firstName profile.lastName')
    .populate('attendance.student', 'profile.firstName profile.lastName usn');

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Verify access
  if (req.user.role !== 'admin') {
    const group = await Group.findOne({
      _id: meeting.groupId,
      $or: [{ mentor: req.user._id }, { mentees: req.user._id }],
    });

    if (!group) {
      throw new AppError('Access denied', 403);
    }
  }

  res.status(200).json({
    success: true,
    data: meeting,
  });
});

// Update meeting
export const updateMeeting = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const meeting = await Meeting.findById(id);

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Verify mentor owns the meeting
  if (meeting.scheduledBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Only the meeting creator can update it', 403);
  }

  // Validate dateTime if being updated
  if (updates.dateTime) {
    const meetingDate = new Date(updates.dateTime);
    const now = new Date();
    
    if (isNaN(meetingDate.getTime())) {
      throw new AppError('Invalid date format', 400);
    }
    
    if (meetingDate <= now) {
      throw new AppError('Meeting date and time must be in the future', 400);
    }

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    if (meetingDate > maxDate) {
      throw new AppError('Meeting cannot be scheduled more than 1 year in advance', 400);
    }
  }

  // Validate duration if being updated
  if (updates.duration && (updates.duration < 5 || updates.duration > 480)) {
    throw new AppError('Meeting duration must be between 5 and 480 minutes', 400);
  }

  const updatedMeeting = await Meeting.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate('groupId', 'name')
    .populate('scheduledBy', 'profile.firstName profile.lastName');

  // If date/time changed, notify mentees
  if (updates.dateTime && updates.dateTime !== meeting.dateTime.toISOString()) {
    const group = await Group.findById(meeting.groupId).populate('mentees');
    
    if (group && (group.mentees as any[]).length > 0) {
      await Notification.create({
        type: 'MEETING_UPDATED',
        creator: req.user._id,
        content: meeting._id,
        contentModel: 'Meeting',
        message: `Meeting "${meeting.title}" has been rescheduled to ${new Date(updates.dateTime).toLocaleDateString()}`,
        receivers: (group.mentees as any[]).map((mentee) => ({ user: mentee._id, read: false })),
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Meeting updated successfully',
    data: updatedMeeting,
  });
});

// Cancel meeting
export const cancelMeeting = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const meeting = await Meeting.findById(id);

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Verify mentor owns the meeting
  if (meeting.scheduledBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Only the meeting creator can cancel it', 403);
  }

  meeting.status = 'cancelled';
  meeting.cancellationReason = reason;
  await meeting.save();

  // Notify mentees
  const group = await Group.findById(meeting.groupId).populate('mentees');
  
  if (group && (group.mentees as any[]).length > 0) {
    await Notification.create({
      type: 'MEETING_UPDATED',
      creator: req.user._id,
      content: meeting._id,
      contentModel: 'Meeting',
      message: `Meeting "${meeting.title}" has been cancelled${reason ? `: ${reason}` : ''}`,
      receivers: (group.mentees as any[]).map((mentee) => ({ user: mentee._id, read: false })),
    });
  }

  res.status(200).json({
    success: true,
    message: 'Meeting cancelled',
    data: meeting,
  });
});

// Mark attendance
export const markAttendance = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { attendance } = req.body; // [{ studentId, present }]

  const meeting = await Meeting.findById(id);

  if (!meeting) {
    throw new AppError('Meeting not found', 404);
  }

  // Verify mentor owns the meeting
  const group = await Group.findOne({
    _id: meeting.groupId,
    mentor: req.user._id,
  });

  if (!group && req.user.role !== 'admin') {
    throw new AppError('Only the mentor can mark attendance', 403);
  }

  meeting.attendance = attendance.map((a: any) => ({
    student: a.studentId,
    present: a.present,
    markedAt: new Date(),
    markedBy: req.user._id,
  }));
  meeting.status = 'completed';
  await meeting.save();

  // Log activity
  await Log.create({
    user: req.user._id,
    eventType: 'MEETING_UPDATED',
    entityType: 'Meeting',
    entityId: meeting._id,
    eventDetail: `Marked attendance for meeting: ${meeting.title}`,
    metadata: { attendanceCount: attendance.length },
  });

  res.status(200).json({
    success: true,
    message: 'Attendance marked successfully',
    data: meeting,
  });
});

// Get meeting statistics
export const getMeetingStats = catchAsync(async (req: AuthRequest, res: Response) => {
  const { groupId, startDate, endDate } = req.query;

  let matchQuery: any = {};

  if (groupId) {
    matchQuery.groupId = groupId;
  } else if (req.user.role !== 'admin') {
    const groups = await Group.find({
      $or: [{ mentor: req.user._id }, { mentees: req.user._id }],
    });
    matchQuery.groupId = { $in: groups.map((g) => g._id) };
  }

  if (startDate || endDate) {
    matchQuery.dateTime = {};
    if (startDate) matchQuery.dateTime.$gte = new Date(startDate as string);
    if (endDate) matchQuery.dateTime.$lte = new Date(endDate as string);
  }

  const stats = await Meeting.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalMeetings = stats.reduce((acc, s) => acc + s.count, 0);
  const statusCounts = stats.reduce((acc, s) => {
    acc[s._id] = s.count;
    return acc;
  }, {} as Record<string, number>);

  res.status(200).json({
    success: true,
    data: {
      total: totalMeetings,
      ...statusCounts,
    },
  });
});
