export interface User {
  _id: string;
  clerkId: string;
  email: string;
  role: 'admin' | 'mentor' | 'student';
  usn?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    department?: string;
    semester?: number;
    bio?: string;
    dateOfBirth?: string;
    address?: string;
  };
  avatar?: string;
  status: 'active' | 'inactive' | 'blocked';
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  mentor: User | string;
  mentees: User[] | string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: User;
  groupId: Group | string;
  attachments?: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  postId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  participants: Array<{
    user: User;
    joinedAt: string;
  }>;
  latestMessage?: Message;
  updatedAt: string;
}

export interface Message {
  _id: string;
  sender: User;
  content: string;
  chatId: string;
  readBy: string[];
  createdAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  dateTime: string;
  duration: number;
  venue?: string;
  meetingType: 'in-person' | 'online';
  meetingLink?: string;
  groupId: Group | string;
  scheduledBy: User | string;
  status: 'scheduled' | 'completed' | 'cancelled';
  cancellationReason?: string;
  attendance: Array<{
    student: User | string;
    present: boolean;
    markedAt?: string;
    markedBy?: string;
  }>;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  refId?: string;
  refModel?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Log {
  _id: string;
  userId: User | string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Interaction {
  _id: string;
  studentId: User | string;
  mentorId: User | string;
  groupId: Group | string;
  type: string;
  description: string;
  date: string;
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  _id: string;
  userId: string;
  semester: number;
  year: number;
  sgpa?: number;
  cgpa?: number;
  subjects?: Array<{
    name: string;
    code: string;
    credits: number;
    grade?: string;
    marks?: number;
  }>;
  backlogs?: number;
  achievements?: string;
  remarks?: string;
  marksheet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore?: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface DashboardStats {
  users?: {
    total: number;
    mentors: number;
    students: number;
    admins: number;
  };
  groups?: number;
  meetings?: {
    total: number;
    completed: number;
    pending: number;
  };
  posts?: number;
  totalMentees?: number;
  upcomingMeetings?: Meeting[];
  recentPosts?: Post[];
  recentActivity?: unknown[];
}
