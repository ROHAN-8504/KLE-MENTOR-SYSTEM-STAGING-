import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Loading } from './components/ui/Loading';

// Auth pages (not lazy - needed immediately)
import { RoleSelectionPage } from './pages/auth/RoleSelectionPage';

// Lazy load all dashboard pages for better initial load performance
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const GroupsPage = lazy(() => import('./pages/admin/GroupsPage').then(m => ({ default: m.GroupsPage })));
const LogsPage = lazy(() => import('./pages/admin/LogsPage').then(m => ({ default: m.LogsPage })));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AdminManagementPage = lazy(() => import('./pages/admin/AdminManagementPage').then(m => ({ default: m.AdminManagementPage })));

const MentorDashboard = lazy(() => import('./pages/mentor/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const MentorGroupsPage = lazy(() => import('./pages/mentor/MentorGroupsPage').then(m => ({ default: m.MentorGroupsPage })));
const MenteeDetailsPage = lazy(() => import('./pages/mentor/MenteeDetailsPage').then(m => ({ default: m.MenteeDetailsPage })));
const InteractionsPage = lazy(() => import('./pages/mentor/InteractionsPage').then(m => ({ default: m.InteractionsPage })));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const AcademicsPage = lazy(() => import('./pages/student/AcademicsPage').then(m => ({ default: m.AcademicsPage })));
const MyMentorPage = lazy(() => import('./pages/student/MyMentorPage').then(m => ({ default: m.MyMentorPage })));
const AttendancePage = lazy(() => import('./pages/student/AttendancePage').then(m => ({ default: m.AttendancePage })));
const StudentInteractionsPage = lazy(() => import('./pages/student/StudentInteractionsPage').then(m => ({ default: m.StudentInteractionsPage })));

// Feature pages
const PostsPage = lazy(() => import('./pages/posts/PostsPage').then(m => ({ default: m.PostsPage })));
const MeetingsPage = lazy(() => import('./pages/meetings/MeetingsPage').then(m => ({ default: m.MeetingsPage })));
const ChatPage = lazy(() => import('./pages/chat/ChatPage').then(m => ({ default: m.ChatPage })));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

import { useCurrentUser } from './hooks/useCurrentUser';

// Page loading fallback
const PageLoader = () => (
  <div className="flex h-full min-h-[400px] items-center justify-center">
    <Loading size="lg" text="Loading page..." />
  </div>
);

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, loading } = useCurrentUser();

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // If user hasn't selected a role yet
  if (user && !user.role) {
    return <Navigate to="/select-role" replace />;
  }

  // Check role access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    const dashboardPath = `/${user.role}/dashboard`;
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

// Auth pages wrapper
const AuthPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/select-role" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/10">
      <div className="w-full max-w-md p-4">
        {children}
      </div>
    </div>
  );
};

// Role selection wrapper
const RoleSelectWrapper: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, loading } = useCurrentUser();
  
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // If user already has a role, redirect to their dashboard
  if (user && user.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <RoleSelectionPage />;
};

// Dashboard redirect based on role
const DashboardRedirect: React.FC = () => {
  const { user, loading } = useCurrentUser();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (!user.role) {
    return <Navigate to="/select-role" replace />;
  }

  return <Navigate to={`/${user.role}/dashboard`} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public/Auth Routes */}
        <Route
          path="/sign-in/*"
          element={
            <AuthPage>
              <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
            </AuthPage>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <AuthPage>
              <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
            </AuthPage>
          }
        />
        <Route path="/select-role" element={<RoleSelectWrapper />} />

        {/* Dashboard Redirect */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="admin-management" element={<AdminManagementPage />} />
                    <Route path="posts" element={<PostsPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Mentor Routes */}
        <Route
          path="/mentor/*"
          element={
            <ProtectedRoute allowedRoles={['mentor']}>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="dashboard" element={<MentorDashboard />} />
                    <Route path="groups" element={<MentorGroupsPage />} />
                    <Route path="groups/:id" element={<MentorGroupsPage />} />
                    <Route path="mentees/:id" element={<MenteeDetailsPage />} />
                    <Route path="interactions" element={<InteractionsPage />} />
                    <Route path="posts" element={<PostsPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<Navigate to="/mentor/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="academics" element={<AcademicsPage />} />
                    <Route path="mentor" element={<MyMentorPage />} />
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="interactions" element={<StudentInteractionsPage />} />
                    <Route path="posts" element={<PostsPage />} />
                    <Route path="meetings" element={<MeetingsPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
