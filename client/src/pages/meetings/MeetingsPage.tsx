import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, MapPin, Video, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { meetingAPI, mentorAPI } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { Meeting, Group } from '../../types';

export const MeetingsPage: React.FC = () => {
  const { user } = useCurrentUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    dateTime: '',
    duration: 30,
    meetingType: 'online' as 'online' | 'offline',
    location: '',
    meetLink: '',
    groupId: '',
  });

  // Calculate minimum datetime (now + 5 minutes to allow some buffer)
  // Recalculates when modal opens to get fresh time
  const minDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal]); // Recalculate when modal opens

  // Calculate maximum datetime (1 year from now)
  const maxDateTime = useMemo(() => {
    const max = new Date();
    max.setFullYear(max.getFullYear() + 1);
    return max.toISOString().slice(0, 16);
  }, []);

  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const canCreate = isMentor || isAdmin;

  const fetchGroups = useCallback(async () => {
    if (!canCreate) return;
    try {
      const response = await mentorAPI.getGroups();
      const groupsData = response.data.data || [];
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, [canCreate]);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await meetingAPI.getMeetings(params);
      const data = response.data.data;
      // Handle different response structures
      const meetingsArray = Array.isArray(data) ? data : (data?.meetings || data?.items || []);
      setMeetings(meetingsArray);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMeetings();
    fetchGroups();
  }, [fetchMeetings, fetchGroups]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate required fields
    if (!newMeeting.title.trim()) {
      setFormError('Meeting title is required');
      return;
    }
    
    if (!newMeeting.groupId) {
      setFormError('Please select a group');
      return;
    }

    if (!newMeeting.dateTime) {
      setFormError('Please select a date and time');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(newMeeting.dateTime);
    const now = new Date();
    
    if (selectedDate <= now) {
      setFormError('Meeting date and time must be in the future');
      return;
    }

    // Validate date is not too far in the future (1 year max)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    if (selectedDate > maxDate) {
      setFormError('Meeting cannot be scheduled more than 1 year in advance');
      return;
    }

    // Validate meeting link for online meetings
    if (newMeeting.meetingType === 'online' && newMeeting.meetLink) {
      try {
        new URL(newMeeting.meetLink);
      } catch {
        setFormError('Please enter a valid meeting link URL');
        return;
      }
    }

    // Validate location for offline meetings
    if (newMeeting.meetingType === 'offline' && !newMeeting.location.trim()) {
      setFormError('Please enter a location for in-person meetings');
      return;
    }

    try {
      setCreating(true);
      await meetingAPI.createMeeting({
        title: newMeeting.title,
        description: newMeeting.description,
        dateTime: newMeeting.dateTime,
        duration: newMeeting.duration,
        meetingType: newMeeting.meetingType,
        venue: newMeeting.location,
        meetingLink: newMeeting.meetLink,
        groupId: newMeeting.groupId,
      });
      setShowCreateModal(false);
      setNewMeeting({
        title: '',
        description: '',
        dateTime: '',
        duration: 30,
        meetingType: 'online',
        location: '',
        meetLink: '',
        groupId: groups.length > 0 ? groups[0]._id : '',
      });
      fetchMeetings();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredMeetings = Array.isArray(meetings) 
    ? meetings.filter(meeting =>
        meeting.title.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Group meetings by date
  const groupedMeetings: Record<string, Meeting[]> = {};
  filteredMeetings.forEach(meeting => {
    const date = new Date(meeting.dateTime).toLocaleDateString();
    if (!groupedMeetings[date]) groupedMeetings[date] = [];
    groupedMeetings[date].push(meeting);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground mt-1">
            {canCreate ? 'Schedule and manage meetings with your mentees' : 'View scheduled meetings with your mentor'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => {
            // Auto-select first group when opening modal
            if (groups.length > 0 && !newMeeting.groupId) {
              setNewMeeting(prev => ({ ...prev, groupId: groups[0]._id }));
            }
            setShowCreateModal(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading meetings..." />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Meetings Scheduled</h2>
            <p className="text-muted-foreground text-center">
              {canCreate
                ? 'Schedule your first meeting with your mentees.'
                : 'No meetings have been scheduled yet.'}
            </p>
            {canCreate && (
              <Button onClick={() => {
                if (groups.length > 0 && !newMeeting.groupId) {
                  setNewMeeting(prev => ({ ...prev, groupId: groups[0]._id }));
                }
                setShowCreateModal(true);
              }} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMeetings).map(([date, dayMeetings]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
              <div className="space-y-3">
                {dayMeetings.map(meeting => (
                  <MeetingCard key={meeting._id} meeting={meeting} canEdit={canCreate} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError(null);
        }}
        title="Schedule New Meeting"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          {/* Error Display */}
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{formError}</span>
            </div>
          )}
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Group</label>
              <Select
                value={newMeeting.groupId}
                onChange={(e) => setNewMeeting({ ...newMeeting, groupId: e.target.value })}
                options={groups.map(g => ({ value: g._id, label: g.name }))}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <Input
              placeholder="Meeting title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <Textarea
              placeholder="Meeting description (optional)"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date & Time</label>
              <Input
                type="datetime-local"
                value={newMeeting.dateTime}
                min={minDateTime}
                max={maxDateTime}
                onChange={(e) => {
                  setFormError(null);
                  setNewMeeting({ ...newMeeting, dateTime: e.target.value });
                }}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select a future date and time
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (minutes)</label>
              <Select
                value={String(newMeeting.duration)}
                onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number(e.target.value) })}
                options={[
                  { value: '15', label: '15 min' },
                  { value: '30', label: '30 min' },
                  { value: '45', label: '45 min' },
                  { value: '60', label: '60 min' },
                  { value: '90', label: '90 min' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Meeting Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="meetingType"
                  checked={newMeeting.meetingType === 'online'}
                  onChange={() => setNewMeeting({ ...newMeeting, meetingType: 'online' })}
                  className="text-primary"
                />
                <Video className="h-4 w-4" />
                <span>Online</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="meetingType"
                  checked={newMeeting.meetingType === 'offline'}
                  onChange={() => setNewMeeting({ ...newMeeting, meetingType: 'offline' })}
                  className="text-primary"
                />
                <MapPin className="h-4 w-4" />
                <span>In Person</span>
              </label>
            </div>
          </div>
          {newMeeting.meetingType === 'online' ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">Meeting Link</label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={newMeeting.meetLink}
                onChange={(e) => setNewMeeting({ ...newMeeting, meetLink: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">Location</label>
              <Input
                placeholder="Enter meeting location"
                value={newMeeting.location}
                onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Schedule Meeting
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const MeetingCard: React.FC<{ meeting: Meeting; canEdit: boolean }> = ({ meeting, canEdit }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Link to={canEdit ? `meetings/${meeting._id}` : '#'}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{meeting.title}</h3>
                {getStatusBadge(meeting.status)}
              </div>
              {meeting.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {meeting.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(meeting.dateTime)} · {meeting.duration} min
                </div>
                <div className="flex items-center gap-1">
                  {meeting.meetingType === 'online' ? (
                    <>
                      <Video className="h-4 w-4" />
                      Online
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      {meeting.venue || 'In Person'}
                    </>
                  )}
                </div>
                {meeting.attendance && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {meeting.attendance.length} attendees
                  </div>
                )}
              </div>
            </div>
            {meeting.meetingType === 'online' && meeting.meetingLink && meeting.status === 'scheduled' && (
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                Join
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default MeetingsPage;
