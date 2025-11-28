import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: any;
  auth?: {
    userId: string;
    sessionId: string;
  };
}

// Verify Clerk token and attach user
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Clerk
    let sessionClaims;
    try {
      sessionClaims = await clerkClient.verifyToken(token);
    } catch (clerkError: any) {
      console.error('Clerk token verification error:', clerkError.message);
      throw new AppError('Invalid or expired token', 401);
    }

    if (!sessionClaims || !sessionClaims.sub) {
      throw new AppError('Invalid token', 401);
    }

    // Get user from database
    const user = await User.findOne({ clerkId: sessionClaims.sub });

    if (!user) {
      // User not in database yet - might need role selection
      req.auth = { userId: sessionClaims.sub, sessionId: sessionClaims.sid as string };
      return next();
    }

    if (user.isBanned) {
      throw new AppError('Your account has been suspended', 403);
    }

    req.user = user;
    req.auth = { userId: sessionClaims.sub, sessionId: sessionClaims.sid as string };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

// Alias for authMiddleware
export const authenticate = authMiddleware;

// Optional auth - doesn't fail if no token
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const sessionClaims = await clerkClient.verifyToken(token);

    if (sessionClaims) {
      const user = await User.findOne({ clerkId: sessionClaims.sub });
      if (user && !user.isBanned) {
        req.user = user;
      }
      req.auth = { userId: sessionClaims.sub, sessionId: sessionClaims.sid as string };
    }

    next();
  } catch (error) {
    next();
  }
};
