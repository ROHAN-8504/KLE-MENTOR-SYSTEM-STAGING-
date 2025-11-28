import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { catchAsync, AppError } from '../middleware/errorHandler';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Group from '../models/Group';
import Notification from '../models/Notification';
import Log from '../models/Log';

// Get posts for user's group
export const getPosts = catchAsync(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Get user's group
  const group = await Group.findOne({
    $or: [
      { mentor: req.user._id },
      { mentees: req.user._id },
    ],
  });

  if (!group) {
    throw new AppError('You are not part of any group', 403);
  }

  const posts = await Post.find({ groupId: group._id })
    .populate('author', 'profile.firstName profile.lastName avatar role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Post.countDocuments({ groupId: group._id });
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

// Create post
export const createPost = catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, content, visibility = 'group', isPinned = false, commentEnabled = true } = req.body;

  if (!title || !content) {
    throw new AppError('Title and content are required', 400);
  }

  // Get user's group
  const group = await Group.findOne({
    $or: [
      { mentor: req.user._id },
      { mentees: req.user._id },
    ],
  });

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

  // Create notification for group members
  const receivers = [
    ...group.mentees.map(id => ({ user: id, read: false })),
    { user: group.mentor, read: false },
  ].filter(r => r.user.toString() !== req.user._id.toString());

  if (receivers.length > 0) {
    const notification = await Notification.create({
      type: 'POST_CREATED',
      creator: req.user._id,
      content: post._id,
      contentModel: 'Post',
      message: `${req.user.profile.firstName} created a new post`,
      receivers,
    });

    // Emit socket event
    const io = req.app.get('io');
    receivers.forEach(r => {
      io.to(r.user.toString()).emit('new Notification', notification);
    });
  }

  // Log
  await Log.create({
    user: req.user._id,
    eventType: 'POST_CREATED',
  });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: post,
  });
});

// Get single post
export const getPost = catchAsync(async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'profile.firstName profile.lastName avatar role');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  res.status(200).json({
    success: true,
    data: post,
  });
});

// Update post
export const updatePost = catchAsync(async (req: AuthRequest, res: Response) => {
  const { title, content, visibility, isPinned, commentEnabled } = req.body;

  const post = await Post.findById(req.params.id);

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

  // Log
  await Log.create({
    user: req.user._id,
    eventType: 'POST_UPDATED',
  });

  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    data: post,
  });
});

// Delete post
export const deletePost = catchAsync(async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own posts', 403);
  }

  // Delete associated comments
  await Comment.deleteMany({ postId: post._id });

  await post.deleteOne();

  // Log
  await Log.create({
    user: req.user._id,
    eventType: 'POST_DELETED',
  });

  res.status(200).json({
    success: true,
    message: 'Post deleted successfully',
  });
});

// Get comments for a post
export const getComments = catchAsync(async (req: AuthRequest, res: Response) => {
  const postId = req.params.id;
  const comments = await Comment.find({ postId })
    .populate('author', 'profile.firstName profile.lastName avatar role')
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: comments,
  });
});

// Add comment
export const addComment = catchAsync(async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  const postId = req.params.id;

  if (!content) {
    throw new AppError('Comment content is required', 400);
  }

  const post = await Post.findById(postId);

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

  // Update comment count
  post.commentCount += 1;
  await post.save();

  await comment.populate('author', 'profile.firstName profile.lastName avatar role');

  // Notify post author
  if (post.author.toString() !== req.user._id.toString()) {
    const notification = await Notification.create({
      type: 'COMMENT_ADDED',
      creator: req.user._id,
      content: comment._id,
      contentModel: 'Comment',
      message: `${req.user.profile.firstName} commented on your post`,
      receivers: [{ user: post.author, read: false }],
    });

    const io = req.app.get('io');
    io.to(post.author.toString()).emit('new Notification', notification);
  }

  // Log
  await Log.create({
    user: req.user._id,
    eventType: 'COMMENT_CREATED',
  });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: comment,
  });
});

// Delete comment
export const deleteComment = catchAsync(async (req: AuthRequest, res: Response) => {
  const comment = await Comment.findById(req.params.commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own comments', 403);
  }

  // Update post comment count
  await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });

  await comment.deleteOne();

  // Log
  await Log.create({
    user: req.user._id,
    eventType: 'COMMENT_DELETED',
  });

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
});
