import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Group from '../models/Group';
import Notification from '../models/Notification';
import Log from '../models/Log';

// Simple group cache (5 min TTL)
const groupCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedGroup = async (userId: string) => {
  const cached = groupCache.get(userId);
  if (cached && cached.expiry > Date.now()) return cached.data;
  
  const group = await Group.findOne({
    $or: [{ mentor: userId }, { mentees: userId }],
  }).select('_id name mentor mentees').lean();
  
  if (group) {
    groupCache.set(userId, { data: group, expiry: Date.now() + CACHE_TTL });
  }
  return group;
};

// Get posts for user's group - OPTIMIZED
export const getPosts = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const skip = (page - 1) * limit;

  // Get user's group from cache
  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    throw new AppError('You are not part of any group', 403);
  }

  const [posts, total] = await Promise.all([
    Post.find({ groupId: group._id })
      .select('title content author isPinned commentCount visibility createdAt')
      .populate('author', 'profile.firstName profile.lastName avatar role')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments({ groupId: group._id }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    data: {
      items: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
  });
});

// Create post - OPTIMIZED
export const createPost = catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, content, visibility = 'group', isPinned = false, commentEnabled = true } = req.body;

  if (!title || !content) {
    throw new AppError('Title and content are required', 400);
  }

  // Get user's group from cache
  const group = await getCachedGroup(req.user._id.toString());

  if (!group) {
    throw new AppError('You are not part of any group', 403);
  }

  const post = await Post.create({
    title,
    content,
    author: req.user._id,
    groupId: group._id,
    visibility,
    isPinned,
    commentEnabled,
  });

  await post.populate('author', 'profile.firstName profile.lastName avatar role');

  // Create notification for group members (fire and forget)
  const receivers = [
    ...group.mentees.map((id: any) => ({ user: id, read: false })),
    { user: group.mentor, read: false },
  ].filter((r: any) => r.user.toString() !== req.user._id.toString());

  if (receivers.length > 0) {
    // Fire and forget notification creation
    Notification.create({
      type: 'POST_CREATED',
      creator: req.user._id,
      content: post._id,
      contentModel: 'Post',
      message: `${req.user.profile.firstName} created a new post`,
      receivers,
    }).then(notification => {
      const io = req.app.get('io');
      receivers.forEach((r: any) => {
        io.to(r.user.toString()).emit('new Notification', notification);
      });
    });
  }

  // Log (fire and forget)
  Log.create({ user: req.user._id, eventType: 'POST_CREATED' });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: post,
  });
});

// Get single post - OPTIMIZED
export const getPost = catchAsync(async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id)
    .select('title content author isPinned commentEnabled commentCount visibility groupId createdAt')
    .populate('author', 'profile.firstName profile.lastName avatar role')
    .lean();

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Update post - OPTIMIZED
export const updatePost = catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, content, visibility, isPinned, commentEnabled } = req.body;

  const post = await Post.findById(req.params.id).select('author title content visibility isPinned commentEnabled');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only edit your own posts', 403);
  }

  if (title !== undefined) post.title = title;
  if (content !== undefined) post.content = content;
  if (visibility !== undefined) post.visibility = visibility;
  if (isPinned !== undefined) post.isPinned = isPinned;
  if (commentEnabled !== undefined) post.commentEnabled = commentEnabled;
  await post.save();

  await post.populate('author', 'profile.firstName profile.lastName avatar role');

  // Log (fire and forget)
  Log.create({ user: req.user._id, eventType: 'POST_UPDATED' });

  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    data: post,
  });
});

// Delete post - OPTIMIZED
export const deletePost = catchAsync(async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id).select('author _id');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own posts', 403);
  }

  // Delete post and comments in parallel (fire and forget for comments)
  Comment.deleteMany({ postId: post._id }).exec();
  await post.deleteOne();

  // Log (fire and forget)
  Log.create({ user: req.user._id, eventType: 'POST_DELETED' });

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully',
  });
});

// Get comments for a post - OPTIMIZED
export const getComments = catchAsync(async (req: AuthRequest, res: Response) => {
  const postId = req.params.id;
  const comments = await Comment.find({ postId })
    .select('content author createdAt')
    .populate('author', 'profile.firstName profile.lastName avatar role')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: comments,
  });
});

// Add comment - OPTIMIZED
export const addComment = catchAsync(async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  const postId = req.params.id;

  if (!content) {
    throw new AppError('Comment content is required', 400);
  }

  const post = await Post.findById(postId).select('author commentEnabled commentCount');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (!post.commentEnabled) {
    throw new AppError('Comments are disabled for this post', 400);
  }

  const comment = await Comment.create({
    content,
    author: req.user._id,
    postId,
  });

  // Update comment count (fire and forget)
  Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }).exec();

  await comment.populate('author', 'profile.firstName profile.lastName avatar role');

  // Notify post author (fire and forget)
  if (post.author.toString() !== req.user._id.toString()) {
    Notification.create({
      type: 'COMMENT_ADDED',
      creator: req.user._id,
      content: comment._id,
      contentModel: 'Comment',
      message: `${req.user.profile.firstName} commented on your post`,
      receivers: [{ user: post.author, read: false }],
    }).then(notification => {
      const io = req.app.get('io');
      io.to(post.author.toString()).emit('new Notification', notification);
    });
  }

  // Log (fire and forget)
  Log.create({ user: req.user._id, eventType: 'COMMENT_CREATED' });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: comment,
  });
});

// Delete comment - OPTIMIZED
export const deleteComment = catchAsync(async (req: AuthRequest, res: Response) => {
  const comment = await Comment.findById(req.params.commentId).select('author postId');

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own comments', 403);
  }

  // Update post comment count (fire and forget)
  Post.updateOne({ _id: comment.postId }, { $inc: { commentCount: -1 } }).exec();

  await comment.deleteOne();

  // Log (fire and forget)
  Log.create({ user: req.user._id, eventType: 'COMMENT_DELETED' });

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
});
