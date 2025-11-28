import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { mentorAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import type { Group, User } from '../../types';

export const MentorGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await mentorAPI.getGroups();
        setGroups(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const getUserDisplayName = (user: User | string) => {
    if (typeof user === 'string') return user;
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading groups..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Groups</h1>
        <p className="text-muted-foreground mt-1">
          Manage your mentoring groups and mentees
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No groups assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to any mentoring groups yet.
              Contact an administrator to get assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const mentees = (group.mentees || []).filter(m => typeof m !== 'string') as User[];
            
            return (
              <Card key={group._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge>{mentees.length} mentees</Badge>
                  </div>
                  <CardDescription>{group.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mentees Preview */}
                  <div className="space-y-3">
                    {mentees.slice(0, 3).map((mentee) => (
                      <Link
                        key={mentee._id}
                        to={`/mentor/mentees/${mentee._id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar
                          src={mentee.avatar}
                          alt={getUserDisplayName(mentee)}
                          fallback={getUserDisplayName(mentee).charAt(0)}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {getUserDisplayName(mentee)}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {mentee.usn || mentee.email}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                    
                    {mentees.length > 3 && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{mentees.length - 3} more mentees
                      </div>
                    )}
                    
                    {mentees.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No mentees in this group yet
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/mentor/groups/${group._id}`}
                    className="mt-4 block"
                  >
                    <Button variant="outline" className="w-full">
                      View All Mentees
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
