import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { mentorAPI } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { formatDateTime, getFullName } from '../../lib/utils';
import type { Meeting, Post, User } from '../../types';

interface MentorDashboardData {
  groups: number;
  totalMentees: number;
  meetings: {
    total: number;
    completed: number;
  };
  upcomingMeetings: Meeting[];
  recentPosts: Post[];
  menteeList: User[];
}

export const MentorDashboard: React.FC = () => {
  const [data, setData] = useState<MentorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await mentorAPI.getDashboard();
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Mentor Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Welcome back! Here's an overview of your mentorship activities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.groups || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active mentor groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Mentees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalMentees || 0}</div>
            <p className="text-xs text-muted-foreground">
              Students under your guidance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.meetings?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.meetings?.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.meetings?.total
                ? Math.round((data.meetings.completed / data.meetings.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Meeting attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Meetings
                </CardTitle>
                <CardDescription>Your scheduled meetings</CardDescription>
              </div>
              <Link
                to="/mentor/meetings"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.upcomingMeetings?.length ? (
              <div className="space-y-3">
                {data.upcomingMeetings.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(meeting.dateTime)}
                      </p>
                    </div>
                    <Badge variant="secondary">{meeting.duration} min</Badge>
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

        {/* My Mentees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  My Mentees
                </CardTitle>
                <CardDescription>Students in your groups</CardDescription>
              </div>
              <Link
                to="/mentor/groups"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.menteeList?.length ? (
              <div className="space-y-3">
                {data.menteeList.slice(0, 5).map((mentee) => (
                  <div
                    key={mentee._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar
                      src={mentee.avatar}
                      firstName={mentee.profile.firstName}
                      lastName={mentee.profile.lastName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getFullName(mentee.profile.firstName, mentee.profile.lastName)}
                      </p>
                      <p className="text-xs text-muted-foreground">{mentee.usn}</p>
                    </div>
                    <Link
                      to={`/mentor/chat?userId=${mentee._id}`}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No mentees assigned yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Posts
                </CardTitle>
                <CardDescription>Latest announcements and updates</CardDescription>
              </div>
              <Link
                to="/mentor/posts"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentPosts?.length ? (
              <div className="space-y-3">
                {data.recentPosts.slice(0, 3).map((post) => (
                  <Link
                    key={post._id}
                    to={`/mentor/posts/${post._id}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                      {post.isPinned && <Badge variant="secondary">Pinned</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
