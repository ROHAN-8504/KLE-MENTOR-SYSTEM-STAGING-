import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Notification from '../models/Notification';

// Get user's notifications - OPTIMIZED
export const getNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const skip = (page - 1) * limit;
  const { unreadOnly } = req.query;

  // Query notifications where current user is in receivers array
  let query: any = { 'receivers.user': req.user._id };
  
  if (unreadOnly === 'true') {
    query['receivers'] = {
      $elemMatch: { user: req.user._id, read: false }
    };
  }

  // Use Promise.all for parallel queries
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .select('type creator content contentModel message receivers createdAt')
      .populate('creator', 'profile.firstName profile.lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      receivers: { $elemMatch: { user: req.user._id, read: false } }
    }),
  ]);

  // Transform notifications to include user's read status
  const transformedNotifications = notifications.map((notification: any) => {
    const userReceiver = notification.receivers.find(
      (r: any) => r.user.toString() === req.user._id.toString()
    );
    return {
      _id: notification._id,
      type: notification.type,
      creator: notification.creator,
      content: notification.content,
      contentModel: notification.contentModel,
      message: notification.message,
      isRead: userReceiver?.read || false,
      readAt: userReceiver?.readAt,
      createdAt: notification.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    },
  });
});

// Mark notification as read
export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { 
      _id: id, 
      'receivers.user': req.user._id 
    },
    { 
      $set: { 
        'receivers.$.read': true,
        'receivers.$.readAt': new Date()
      } 
    },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification,
  });
});

// Mark all notifications as read
export const markAllAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  await Notification.updateMany(
    { 'receivers.user': req.user._id, 'receivers.read': false },
    { 
      $set: { 
        'receivers.$[elem].read': true,
        'receivers.$[elem].readAt': new Date()
      } 
    },
    { 
      arrayFilters: [{ 'elem.user': req.user._id }] 
    }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

// Delete notification (removes user from receivers)
export const deleteNotification = catchAsync(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Remove user from receivers array
  const notification = await Notification.findOneAndUpdate(
    { _id: id, 'receivers.user': req.user._id },
    { $pull: { receivers: { user: req.user._id } } },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // If no receivers left, delete the notification entirely
  if (notification.receivers.length === 0) {
    await Notification.findByIdAndDelete(id);
  }

  res.status(200).json({
    success: true,
    message: 'Notification deleted',
  });
});

// Clear all notifications for user
export const clearAllNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
  // Remove user from all notification receivers
  await Notification.updateMany(
    { 'receivers.user': req.user._id },
    { $pull: { receivers: { user: req.user._id } } }
  );

  // Clean up notifications with no receivers
  await Notification.deleteMany({ receivers: { $size: 0 } });

  res.status(200).json({
    success: true,
    message: 'All notifications cleared',
  });
});

// Create notification (internal use)
export const createNotification = async (data: {
  type: string;
  creator: string;
  content: string;
  contentModel: string;
  message: string;
  receiverIds: string[];
}) => {
  return Notification.create({
    type: data.type,
    creator: data.creator,
    content: data.content,
    contentModel: data.contentModel,
    message: data.message,
    receivers: data.receiverIds.map(id => ({ user: id, read: false })),
  });
};

// Create bulk notifications (internal use)
export const createBulkNotifications = async (notifications: Array<{
  type: string;
  creator: string;
  content: string;
  contentModel: string;
  message: string;
  receiverIds: string[];
}>) => {
  const docs = notifications.map(n => ({
    type: n.type,
    creator: n.creator,
    content: n.content,
    contentModel: n.contentModel,
    message: n.message,
    receivers: n.receiverIds.map(id => ({ user: id, read: false })),
  }));
  return Notification.insertMany(docs);
};
