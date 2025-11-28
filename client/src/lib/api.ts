/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

// Determine API URL - check env var first, then use production URL if on production domain
const getApiUrl = () => {
  // If env var is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're on the production domain, use production API
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://kle-mentor-system-staging.onrender.com/api/v1';
  }
  
  // Default to localhost for development
  return 'http://localhost:5000/api/v1';
};

const API_URL = getApiUrl();

console.log('API URL:', API_URL); // Debug log

// Extend Window interface for Clerk
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get token from Clerk
      const token = await window.Clerk?.session?.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/sign-in') && !window.location.pathname.includes('/sign-up')) {
        window.location.href = '/sign-in';
      }
    }
    
    return Promise.reject(new Error(message));
  }
);

// API functions
export const authAPI = {
  selectRole: (role: string, adminKey?: string) => api.post('/auth/select-role', { role, adminKey }),
};

export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  uploadAvatar: (formData: FormData) => api.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteAvatar: () => api.delete('/users/me/avatar'),
  getUserById: (id: string) => api.get(`/users/${id}`),
};

export const postAPI = {
  getPosts: (params?: any) => api.get('/posts', { params }),
  getPost: (id: string) => api.get(`/posts/${id}`),
  createPost: (data: any) => api.post('/posts', data),
  updatePost: (id: string, data: any) => api.put(`/posts/${id}`, data),
  deletePost: (id: string) => api.delete(`/posts/${id}`),
  getComments: (id: string) => api.get(`/posts/${id}/comments`),
  addComment: (id: string, content: string) => api.post(`/posts/${id}/comments`, { content }),
  deleteComment: (postId: string, commentId: string) => api.delete(`/posts/${postId}/comments/${commentId}`),
};

export const chatAPI = {
  getChats: () => api.get('/chats'),
  accessChat: (participantId: string) => api.post('/chats', { participantId }),
  getMessages: (chatId: string, params?: any) => api.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId: string, content: string) => api.post(`/chats/${chatId}/messages`, { content }),
  markAsRead: (chatId: string) => api.put(`/chats/${chatId}/read`),
};

export const meetingAPI = {
  getMeetings: (params?: any) => api.get('/meetings', { params }),
  getMeeting: (id: string) => api.get(`/meetings/${id}`),
  createMeeting: (data: any) => api.post('/meetings', data),
  updateMeeting: (id: string, data: any) => api.put(`/meetings/${id}`, data),
  cancelMeeting: (id: string, reason?: string) => api.post(`/meetings/${id}/cancel`, { reason }),
  markAttendance: (id: string, attendance: any[]) => api.post(`/meetings/${id}/attendance`, { attendance }),
  getStats: (params?: any) => api.get('/meetings/stats', { params }),
};

export const notificationAPI = {
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id: string, status: string) => api.put(`/admin/users/${id}/status`, { status }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  bulkUploadUsers: (users: any[]) => api.post('/admin/users/bulk', { users }),
  getGroups: (params?: any) => api.get('/admin/groups', { params }),
  createGroup: (data: any) => api.post('/admin/groups', data),
  updateGroup: (id: string, data: any) => api.put(`/admin/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/admin/groups/${id}`),
  addMenteesToGroup: (id: string, menteeIds: string[]) => api.post(`/admin/groups/${id}/mentees`, { menteeIds }),
  removeMenteeFromGroup: (groupId: string, menteeId: string) => api.delete(`/admin/groups/${groupId}/mentees/${menteeId}`),
  getLogs: (params?: any) => api.get('/admin/logs', { params }),
  generateReport: (params?: any) => api.get('/admin/reports', { params }),
  // Admin Management
  getAllAdmins: () => api.get('/admin/admins'),
  transferSuperAdmin: (newAdminId: string) => api.post('/admin/admins/transfer', { newAdminId }),
  removeAdmin: (adminId: string) => api.delete(`/admin/admins/${adminId}`),
  demoteAdmin: (adminId: string, newRole: string) => api.post('/admin/admins/demote', { adminId, newRole }),
  makeSuperAdmin: (adminId: string) => api.post('/admin/admins/make-super', { adminId }),
};

export const mentorAPI = {
  getDashboard: () => api.get('/mentor/dashboard'),
  getGroups: () => api.get('/mentor/groups'),
  getGroupDetails: (id: string) => api.get(`/mentor/groups/${id}`),
  getMenteeDetails: (id: string) => api.get(`/mentor/mentees/${id}`),
  getMenteeAcademics: (id: string) => api.get(`/mentor/mentees/${id}/academics`),
  getInteractions: (params?: any) => api.get('/mentor/interactions', { params }),
  recordInteraction: (data: any) => api.post('/mentor/interactions', data),
  updateInteraction: (id: string, data: any) => api.put(`/mentor/interactions/${id}`, data),
  deleteInteraction: (id: string) => api.delete(`/mentor/interactions/${id}`),
  getAttendanceReport: (params?: any) => api.get('/mentor/attendance', { params }),
};

export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getMentor: () => api.get('/student/mentor'),
  getGroup: () => api.get('/student/group'),
  getGroupMates: () => api.get('/student/group-mates'),
  getMeetings: (params?: any) => api.get('/student/meetings', { params }),
  getAttendance: () => api.get('/student/attendance'),
  getInteractions: (params?: any) => api.get('/student/interactions', { params }),
  getAcademicRecords: () => api.get('/student/academics'),
  addAcademicRecord: (data: any) => api.post('/student/academics', data),
  updateAcademicRecord: (id: string, data: any) => api.put(`/student/academics/${id}`, data),
  deleteAcademicRecord: (id: string) => api.delete(`/student/academics/${id}`),
  uploadMarksheet: (id: string, formData: FormData) => api.post(`/student/academics/${id}/marksheet`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
