import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, MessageSquare, BookOpen, TrendingUp, User } from 'lucide-react';
import { studentAPI } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { formatDateTime, getFullName } from '../../lib/utils';
import type { Meeting, Post, User as UserType } from '../../types';

interface StudentDashboardData {
  group: { _id: string; name: string } | null;
  mentor: UserType | null;
  upcomingMeetings: Meeting[];
  recentPosts: Post[];
  attendance: {
    total: number;
    attended: number;
    percentage: string;
  };
  message?: string;
}

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await studentAPI.getDashboard();
        setData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // Not assigned to any group yet
  if (data?.message || !data?.mentor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to the KLE Mentor System
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Mentor Assigned Yet</h2>
            <p className="text-muted-foreground text-center max-w-md">
              You haven't been assigned to a mentor group yet. Please wait for an administrator to assign you to a group.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's your mentorship overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Group</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{data.group?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Your mentor group
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.attendance?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total scheduled meetings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.attendance?.percentage || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {data.attendance?.attended || 0} meetings attended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcomingMeetings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled meetings
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Mentor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Mentor
            </CardTitle>
            <CardDescription>Your assigned mentor</CardDescription>
          </CardHeader>
          <CardContent>
            {data.mentor && (
              <div className="flex flex-col items-center text-center">
                <Avatar
                  src={data.mentor.avatar}
                  firstName={data.mentor.profile.firstName}
                  lastName={data.mentor.profile.lastName}
                  size="xl"
                  className="mb-4"
                />
                <h3 className="font-semibold text-lg">
                  {getFullName(data.mentor.profile.firstName, data.mentor.profile.lastName)}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {data.mentor.email}
                </p>
                <Link
                  to={`/student/chat?userId=${data.mentor._id}`}
                  className="w-full"
                >
                  <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    Message Mentor
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Meetings
                </CardTitle>
                <CardDescription>Scheduled meetings</CardDescription>
              </div>
              <Link
                to="/student/meetings"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingMeetings?.length ? (
              <div className="space-y-3">
                {data.upcomingMeetings.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting._id}
                    className="p-3 rounded-lg border"
                  >
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(meeting.dateTime)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{meeting.duration} min</Badge>
                      <Badge variant={meeting.meetingType === 'online' ? 'default' : 'outline'}>
                        {meeting.meetingType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming meetings
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Quick Links
            </CardTitle>
            <CardDescription>Navigate quickly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/student/academics"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Academic Records</p>
                  <p className="text-sm text-muted-foreground">View your grades</p>
                </div>
              </div>
            </Link>
            <Link
              to="/student/attendance"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Attendance</p>
                  <p className="text-sm text-muted-foreground">View attendance history</p>
                </div>
              </div>
            </Link>
            <Link
              to="/student/interactions"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Interactions</p>
                  <p className="text-sm text-muted-foreground">View mentor notes</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Announcements
              </CardTitle>
              <CardDescription>Latest posts from your mentor</CardDescription>
            </div>
            <Link
              to="/student/posts"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentPosts?.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.recentPosts.slice(0, 3).map((post) => (
                <Link
                  key={post._id}
                  to={`/student/posts/${post._id}`}
                  className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <h3 className="font-medium mb-2 line-clamp-1">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDateTime(post.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No announcements yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
