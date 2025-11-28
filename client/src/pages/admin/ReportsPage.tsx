import { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, FileText, Download, TrendingUp, PieChart } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';

interface ReportData {
  users: {
    total: number;
    mentors: number;
    students: number;
    admins: number;
    newThisMonth: number;
  };
  groups: {
    total: number;
    averageMentees: number;
  };
  meetings: {
    total: number;
    completed: number;
    cancelled: number;
    averageAttendance: number;
  };
  posts: {
    total: number;
    thisMonth: number;
  };
  interactions: {
    total: number;
    thisMonth: number;
  };
}

const periodOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await adminAPI.generateReport({ period });
        setReportData(response.data.data);
      } catch (error) {
        console.error('Failed to fetch report:', error);
        // Set default data if API fails
        setReportData({
          users: { total: 0, mentors: 0, students: 0, admins: 0, newThisMonth: 0 },
          groups: { total: 0, averageMentees: 0 },
          meetings: { total: 0, completed: 0, cancelled: 0, averageAttendance: 0 },
          posts: { total: 0, thisMonth: 0 },
          interactions: { total: 0, thisMonth: 0 },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [period]);

  const handleExport = (format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting report in ${format} format`);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Generating report..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            System statistics and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={periodOptions}
            className="w-40"
          />
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{reportData?.users.newThisMonth || 0} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.meetings.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {reportData?.meetings.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Posts Published</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.posts.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {reportData?.posts.thisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData?.meetings.averageAttendance?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Meeting attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              User Distribution
            </CardTitle>
            <CardDescription>Breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Students</span>
                </div>
                <span className="font-medium">{reportData?.users.students || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${reportData?.users.total
                      ? ((reportData.users.students / reportData.users.total) * 100)
                      : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Mentors</span>
                </div>
                <span className="font-medium">{reportData?.users.mentors || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${reportData?.users.total
                      ? ((reportData.users.mentors / reportData.users.total) * 100)
                      : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span>Admins</span>
                </div>
                <span className="font-medium">{reportData?.users.admins || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${reportData?.users.total
                      ? ((reportData.users.admins / reportData.users.total) * 100)
                      : 0}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Meeting Statistics
            </CardTitle>
            <CardDescription>Meeting completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Completed</span>
                </div>
                <span className="font-medium">{reportData?.meetings.completed || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${reportData?.meetings.total
                      ? ((reportData.meetings.completed / reportData.meetings.total) * 100)
                      : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Cancelled</span>
                </div>
                <span className="font-medium">{reportData?.meetings.cancelled || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${reportData?.meetings.total
                      ? ((reportData.meetings.cancelled / reportData.meetings.total) * 100)
                      : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Scheduled</span>
                </div>
                <span className="font-medium">
                  {(reportData?.meetings.total || 0) - 
                   (reportData?.meetings.completed || 0) - 
                   (reportData?.meetings.cancelled || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Statistics
            </CardTitle>
            <CardDescription>Mentoring group metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent rounded-lg">
                <div className="text-3xl font-bold">{reportData?.groups.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Groups</div>
              </div>
              <div className="text-center p-4 bg-accent rounded-lg">
                <div className="text-3xl font-bold">
                  {reportData?.groups.averageMentees?.toFixed(1) || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg Mentees/Group</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interaction Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Interaction Tracking
            </CardTitle>
            <CardDescription>Mentor-mentee interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent rounded-lg">
                <div className="text-3xl font-bold">{reportData?.interactions.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Interactions</div>
              </div>
              <div className="text-center p-4 bg-accent rounded-lg">
                <div className="text-3xl font-bold">{reportData?.interactions.thisMonth || 0}</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
