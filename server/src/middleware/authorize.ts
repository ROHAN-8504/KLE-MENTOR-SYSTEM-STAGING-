import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

type UserRole = 'admin' | 'mentor' | 'student';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

// Check if user has a group (for mentor/student actions)
export const requireGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const Group = require('../models/Group').default;
    
    const group = req.user.role === 'mentor'
      ? await Group.findOne({ mentor: req.user._id })
      : await Group.findOne({ mentees: req.user._id });

    if (!group) {
      throw new AppError('You are not assigned to any group', 403);
    }

    (req as any).group = group;
    next();
  } catch (error) {
    next(error);
  }
};
