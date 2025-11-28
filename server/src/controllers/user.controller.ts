import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import User from '../models/User';
import Log from '../models/Log';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

// Get current user profile - Already optimized via auth middleware
export const getProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

// Update user profile - OPTIMIZED
export const updateProfile = catchAsync(async (req: AuthRequest, res: Response) => {
  const allowedUpdates = [
    'profile', 'guardian', 'hostel', 'pastEducation'
  ];

  const updates: any = {};
  
  for (const key of allowedUpdates) {
    if (req.body[key]) {
      if (key === 'profile') {
        // Merge profile updates
        updates['profile'] = {
          ...req.user.profile.toObject(),
          ...req.body.profile,
        };
      } else {
        updates[key] = req.body[key];
      }
    }
  }

  // Check if profile is complete
  const profile = updates.profile || req.user.profile;
  const isComplete = !!(
    profile.firstName &&
    profile.phone &&
    profile.department
  );
  updates.isProfileComplete = isComplete;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  // Log profile update (fire and forget)
  Log.create({ user: req.user._id, eventType: 'PROFILE_UPDATED' });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

// Upload avatar - OPTIMIZED
export const uploadAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('Please upload an image', 400);
  }

  // Delete old avatar if exists (fire and forget)
  if (req.user.avatar?.publicId) {
    deleteFromCloudinary(req.user.avatar.publicId).catch(() => {});
  }

  // Upload new avatar
  const result = await uploadToCloudinary(req.file.buffer, 'avatars');

  // Update user
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      avatar: {
        url: result.url,
        publicId: result.publicId,
      },
    },
    { new: true }
  ).select('avatar').lean();

  // Log avatar update (fire and forget)
  Log.create({ user: req.user._id, eventType: 'AVATAR_UPDATED' });

  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully',
    data: {
      avatar: user?.avatar,
    },
  });
});

// Delete avatar - OPTIMIZED
export const deleteAvatar = catchAsync(async (req: AuthRequest, res: Response) => {
  // Delete from cloudinary (fire and forget)
  if (req.user.avatar?.publicId) {
    deleteFromCloudinary(req.user.avatar.publicId).catch(() => {});
  }

  // Update user (fire and forget the DB update for speed)
  User.updateOne(
    { _id: req.user._id },
    { avatar: { url: '', publicId: undefined } }
  ).exec();

  res.status(200).json({
    success: true,
    message: 'Avatar removed successfully',
  });
});

// Get user by ID - OPTIMIZED
export const getUserById = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id)
    .select('profile avatar role email isProfileComplete')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});
