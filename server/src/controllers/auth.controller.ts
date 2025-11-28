import { Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import User from '../models/User';
import Log from '../models/Log';

// Select role after first signup
export const selectRole = catchAsync(async (req: AuthRequest, res: Response) => {
  const { role, adminKey } = req.body;

  console.log('Select role called:', { role, userId: req.auth?.userId });

  if (!req.auth?.userId) {
    throw new AppError('Authentication required', 401);
  }

  // Allow admin role only with correct admin key
  const validRoles = ['mentor', 'student'];
  let isSuperAdmin = false;
  
  if (role === 'admin') {
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY;
    console.log('Admin key check:', { provided: !!adminKey, expected: !!expectedAdminKey });
    if (!expectedAdminKey || adminKey !== expectedAdminKey) {
      throw new AppError('Invalid admin key', 403);
    }
    
    // Check if this is the first admin (will be super admin)
    const existingAdminCount = await User.countDocuments({ role: 'admin' });
    if (existingAdminCount === 0) {
      isSuperAdmin = true;
    }
  } else if (!validRoles.includes(role)) {
    throw new AppError('Invalid role. Must be mentor or student', 400);
  }

  // Check if user already exists
  let user = await User.findOne({ clerkId: req.auth.userId });

  if (user) {
    throw new AppError('User already has a role assigned', 400);
  }

  // Fetch user details from Clerk
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(req.auth.userId);
  } catch (clerkError: any) {
    console.error('Clerk getUser error:', clerkError.message);
    throw new AppError('Could not fetch user details from authentication service', 500);
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const firstName = clerkUser.firstName;
  const lastName = clerkUser.lastName;

  if (!email) {
    throw new AppError('Email not found in authentication service', 500);
  }

  // Create user in database
  user = await User.create({
    clerkId: req.auth.userId,
    email: email,
    role: role,
    profile: {
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
    },
    avatar: {
      url: clerkUser.imageUrl || '',
    },
    isSuperAdmin: isSuperAdmin,
  });

  console.log('User created:', user._id);

  // Update Clerk user metadata with role
  try {
    await clerkClient.users.updateUserMetadata(req.auth.userId, {
      publicMetadata: {
        role: role,
        dbId: user._id.toString(),
      },
    });
  } catch (metadataError: any) {
    console.error('Failed to update Clerk metadata:', metadataError.message);
    // Don't fail the request, just log the error
  }

  // Log the signup
  try {
    await Log.create({
      user: user._id,
      eventType: 'SIGNUP',
      eventDetail: `New ${role} registered`,
    });
  } catch (logError: any) {
    console.error('Failed to create log:', logError.message);
  }

  res.status(201).json({
    success: true,
    message: 'Role assigned successfully',
    data: {
      user,
      redirectUrl: `/${role}/dashboard`,
    },
  });
});

// Clerk webhook handler
export const handleClerkWebhook = catchAsync(async (req: AuthRequest, res: Response) => {
  // Verify webhook signature
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError('Missing webhook headers', 400);
  }

  // In production, verify the signature using Clerk's webhook secret
  // const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  // if (webhookSecret) {
  //   const { Webhook } = await import('svix');
  //   const wh = new Webhook(webhookSecret);
  //   try {
  //     wh.verify(JSON.stringify(req.body), {
  //       'svix-id': svixId,
  //       'svix-timestamp': svixTimestamp,
  //       'svix-signature': svixSignature,
  //     });
  //   } catch (err) {
  //     throw new AppError('Invalid webhook signature', 401);
  //   }
  // }

  const { type, data } = req.body;

  switch (type) {
    case 'user.created':
      // User will be created when they select a role
      console.log('Clerk user created:', data.id);
      break;

    case 'user.updated':
      // Update user in database if needed
      const user = await User.findOne({ clerkId: data.id });
      if (user) {
        const primaryEmail = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
        if (primaryEmail && primaryEmail.email_address !== user.email) {
          user.email = primaryEmail.email_address;
          await user.save();
        }
      }
      break;

    case 'user.deleted':
      // Optionally handle user deletion
      await User.findOneAndUpdate(
        { clerkId: data.id },
        { isBanned: true }
      );
      break;

    default:
      console.log('Unhandled webhook type:', type);
  }

  res.status(200).json({ received: true });
});

// Get current user
export const getCurrentUser = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    // User not in database yet
    if (req.auth?.userId) {
      // Get info from Clerk
      const clerkUser = await clerkClient.users.getUser(req.auth.userId);
      return res.status(200).json({
        success: true,
        data: {
          needsRoleSelection: true,
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
        },
      });
    }
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: req.user,
  });
});
