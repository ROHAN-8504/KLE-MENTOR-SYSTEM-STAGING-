import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Activity, Clock, User, FileText } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Badge } from '../../components/ui/Badge';

interface Log {
  _id: string;
  user?: {
    _id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  action?: string;
  eventType?: string;
  resource?: string;
  entityType?: string;
  resourceId?: string;
  entityId?: string;
  details?: string;
  description?: string;
  eventDetail?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
];

const resourceOptions = [
  { value: '', label: 'All Resources' },
  { value: 'user', label: 'User' },
  { value: 'group', label: 'Group' },
  { value: 'post', label: 'Post' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'chat', label: 'Chat' },
];

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getLogs({
        search: searchQuery,
        action: actionFilter,
        resource: resourceFilter,
        page,
        limit: 20,
      });
      setLogs(response.data.data.items || response.data.data.logs || []);
      setTotalPages(response.data.data.pagination?.totalPages || response.data.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, actionFilter, resourceFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getUserName = (log: Log) => {
    if (!log.user) return 'System';
    const user = log.user;
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'success';
      case 'update': return 'default';
      case 'delete': return 'destructive';
      case 'login': return 'secondary';
      case 'logout': return 'outline';
      default: return 'secondary';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource?.toLowerCase()) {
      case 'user': return <User className="h-4 w-4" />;
      case 'post': return <FileText className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getAction = (log: Log) => log.action || log.eventType || 'Unknown';
  const getResource = (log: Log) => log.resource || log.entityType || '';
  const getDetails = (log: Log) => log.details || log.description || log.eventDetail || '';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          View system activity and audit logs
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={actionOptions}
              className="w-full md:w-40"
            />
            <Select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              options={resourceOptions}
              className="w-full md:w-40"
            />
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setActionFilter('');
              setResourceFilter('');
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {getResourceIcon(getResource(log))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getUserName(log)}</span>
                      <Badge variant={getActionBadgeVariant(getAction(log))}>
                        {getAction(log)}
                      </Badge>
                      {getResource(log) && (
                        <Badge variant="outline">{getResource(log)}</Badge>
                      )}
                    </div>
                    {getDetails(log) && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {getDetails(log)}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </span>
                      {log.ipAddress && (
                        <span>IP: {log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
