import { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, MessageSquare, Users } from 'lucide-react';
import { studentAPI, chatAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Avatar } from '../../components/ui/Avatar';
import type { User as UserType, Group } from '../../types';

interface MentorInfo extends UserType {
  group?: Group;
}

export const MyMentorPage: React.FC = () => {
  const [mentor, setMentor] = useState<MentorInfo | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMates, setGroupMates] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mentorRes, groupMatesRes] = await Promise.all([
          studentAPI.getMentor().catch(() => ({ data: { data: null } })),
          studentAPI.getGroupMates().catch(() => ({ data: { data: [] } })),
        ]);
        // API returns { mentor, group } - extract mentor and group
        const mentorData = mentorRes.data.data;
        setMentor(mentorData?.mentor || mentorData);
        setGroup(mentorData?.group || null);
        setGroupMates(groupMatesRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch mentor info:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getUserDisplayName = (user: UserType | null) => {
    if (!user) return 'Unknown';
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const handleStartChat = async () => {
    if (!mentor?._id) return;
    try {
      await chatAPI.accessChat(mentor._id);
      window.location.href = '/student/chat';
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading mentor information..." />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Mentor</h1>
          <p className="text-muted-foreground mt-1">
            View your assigned mentor's details
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No mentor assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to a mentor yet. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Mentor</h1>
        <p className="text-muted-foreground mt-1">
          Your assigned mentor and group information
        </p>
      </div>

      {/* Mentor Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Mentor Profile</CardTitle>
          {group && <CardDescription>Group: {group.name}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar
              src={mentor.avatar}
              alt={getUserDisplayName(mentor)}
              fallback={getUserDisplayName(mentor).charAt(0)}
              size="xl"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{getUserDisplayName(mentor)}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{mentor.email}</span>
                </div>
                {mentor.profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{mentor.profile.phone}</span>
                  </div>
                )}
                {mentor.profile?.department && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{mentor.profile.department}</span>
                  </div>
                )}
              </div>

              {mentor.profile?.bio && (
                <div className="mt-4 p-4 bg-accent rounded-lg">
                  <p className="text-sm">{mentor.profile.bio}</p>
                </div>
              )}

              <div className="mt-4">
                <Button onClick={handleStartChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Mentor
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group Mates */}
      {groupMates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Members
            </CardTitle>
            <CardDescription>
              {groupMates.length} other students in your group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupMates.map((mate) => (
                <div
                  key={mate._id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Avatar
                    src={mate.avatar}
                    alt={getUserDisplayName(mate)}
                    fallback={getUserDisplayName(mate).charAt(0)}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{getUserDisplayName(mate)}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {mate.usn || mate.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
