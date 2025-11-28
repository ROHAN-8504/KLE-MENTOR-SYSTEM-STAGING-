import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Loading } from './components/ui/Loading';

// Auth pages
import { RoleSelectionPage } from './pages/auth/RoleSelectionPage';

// Dashboard pages
import { AdminDashboard, UsersPage, GroupsPage, LogsPage, ReportsPage, AdminManagementPage } from './pages/admin';
import { MentorDashboard, MentorGroupsPage, MenteeDetailsPage, InteractionsPage } from './pages/mentor';
import { StudentDashboard, AcademicsPage, MyMentorPage, AttendancePage, StudentInteractionsPage } from './pages/student';

// Feature pages
import { PostsPage } from './pages/posts/PostsPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { ChatPage } from './pages/chat/ChatPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

import { useCurrentUser } from './hooks/useCurrentUser';

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
