import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, FileText, UserCircle, TrendingUp, Activity } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import type { DashboardStats } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminAPI.getDashboard();
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users?.total || 0,
      description: `${stats?.users?.mentors || 0} mentors, ${stats?.users?.students || 0} students`,
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Groups',
      value: stats?.groups || 0,
      description: 'Active mentor groups',
      icon: UserCircle,
      href: '/admin/groups',
      color: 'bg-green-500',
    },
    {
      title: 'Meetings',
      value: stats?.meetings?.total || 0,
      description: `${stats?.meetings?.completed || 0} completed, ${stats?.meetings?.pending || 0} pending`,
      icon: Calendar,
      href: '/admin/meetings',
      color: 'bg-purple-500',
    },
    {
      title: 'Posts',
      value: stats?.posts || 0,
      description: 'Published announcements',
      icon: FileText,
      href: '/admin/posts',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of the mentor system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/admin/users?action=create"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Add New User</div>
              <div className="text-sm text-muted-foreground">
                Create mentor or student accounts
              </div>
            </Link>
            <Link
              to="/admin/groups?action=create"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Create Group</div>
              <div className="text-sm text-muted-foreground">
                Assign mentors to student groups
              </div>
            </Link>
            <Link
              to="/admin/reports"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Generate Reports</div>
              <div className="text-sm text-muted-foreground">
                View analytics and export data
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentActivity as unknown[])?.slice(0, 5).map((activity: unknown, index: number) => {
                const act = activity as { description?: string; createdAt?: string };
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{act?.description || 'Activity'}</p>
                      <p className="text-xs text-muted-foreground">
                        {act?.createdAt
                          ? new Date(act.createdAt).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                  </div>
                );
              }) || (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
