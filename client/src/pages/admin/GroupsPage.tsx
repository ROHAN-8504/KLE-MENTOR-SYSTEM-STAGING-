import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreVertical, Users, UserPlus, Trash2, Edit, X } from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { Textarea } from '../../components/ui/Textarea';
import type { Group, User } from '../../types';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Form states
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', mentorId: '' });
  const [selectedMentees, setSelectedMentees] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getGroups({ search: searchQuery });
      setGroups(response.data.data.items || response.data.data.groups || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await adminAPI.getUsers({ limit: 1000 });
      setAllUsers(response.data.data.items || response.data.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, [fetchGroups, fetchUsers]);

  const getUserDisplayName = (user: User | string) => {
    if (typeof user === 'string') return user;
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const mentors = allUsers.filter(u => u.role === 'mentor');
  const students = allUsers.filter(u => u.role === 'student');

  const handleCreateGroup = async () => {
    if (!formData.name || !formData.mentorId) return;
    setActionLoading(true);
    try {
      await adminAPI.createGroup({
        name: formData.name,
        description: formData.description,
        mentor: formData.mentorId,
      });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', mentorId: '' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formData.name) return;
    setActionLoading(true);
    try {
      await adminAPI.updateGroup(selectedGroup._id, {
        name: formData.name,
        description: formData.description,
        mentor: formData.mentorId,
      });
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ name: '', description: '', mentorId: '' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    setActionLoading(true);
    try {
      await adminAPI.deleteGroup(selectedGroup._id);
      setShowDeleteModal(false);
      setSelectedGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignMentees = async () => {
    if (!selectedGroup || selectedMentees.length === 0) return;
    setActionLoading(true);
    try {
      await adminAPI.addMenteesToGroup(selectedGroup._id, selectedMentees);
      setShowAssignModal(false);
      setSelectedGroup(null);
      setSelectedMentees([]);
      fetchGroups();
    } catch (error) {
      console.error('Failed to assign mentees:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMentee = async (groupId: string, menteeId: string) => {
    try {
      await adminAPI.removeMenteeFromGroup(groupId, menteeId);
      fetchGroups();
    } catch (error) {
      console.error('Failed to remove mentee:', error);
    }
  };

  const mentorOptions = [
    { value: '', label: 'Select Mentor' },
    ...mentors.map(m => ({ value: m._id, label: getUserDisplayName(m) })),
  ];

  // Get students not in any group
  const assignedStudentIds = groups.flatMap(g => 
    (g.mentees || []).map(m => typeof m === 'string' ? m : m._id)
  );
  const unassignedStudents = students.filter(s => !assignedStudentIds.includes(s._id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Group Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage mentor groups
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loading size="lg" text="Loading groups..." />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No groups found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to assign mentees to mentors
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const mentor = typeof group.mentor === 'string' ? null : group.mentor;
            const mentees = (group.mentees || []).filter(m => typeof m !== 'string') as User[];
            
            return (
              <Card key={group._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription>{group.description || 'No description'}</CardDescription>
                  </div>
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    }
                  >
                    <DropdownItem
                      onClick={() => {
                        setSelectedGroup(group);
                        setFormData({
                          name: group.name,
                          description: group.description || '',
                          mentorId: typeof group.mentor === 'string' ? group.mentor : group.mentor?._id || '',
                        });
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Group
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedMentees([]);
                        setShowAssignModal(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Mentees
                    </DropdownItem>
                    <DropdownItem
                      destructive
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </DropdownItem>
                  </Dropdown>
                </CardHeader>
                <CardContent>
                  {/* Mentor */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Mentor</div>
                    {mentor ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={mentor.avatar}
                          alt={getUserDisplayName(mentor)}
                          fallback={getUserDisplayName(mentor).charAt(0)}
                          size="sm"
                        />
                        <span className="text-sm">{getUserDisplayName(mentor)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No mentor assigned</span>
                    )}
                  </div>

                  {/* Mentees */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Mentees ({mentees.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setSelectedMentees([]);
                          setShowAssignModal(true);
                        }}
                      >
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                    {mentees.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {mentees.map((mentee) => (
                          <div
                            key={mentee._id}
                            className="flex items-center justify-between p-2 rounded-md bg-accent/50"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={mentee.avatar}
                                alt={getUserDisplayName(mentee)}
                                fallback={getUserDisplayName(mentee).charAt(0)}
                                size="sm"
                              />
                              <div>
                                <div className="text-sm font-medium">
                                  {getUserDisplayName(mentee)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {mentee.usn || mentee.email}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMentee(group._id, mentee._id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No mentees assigned
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ name: '', description: '', mentorId: '' });
        }}
        title="Create New Group"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter group description"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Assign Mentor *</label>
            <Select
              value={formData.mentorId}
              onChange={(e) => setFormData(prev => ({ ...prev, mentorId: e.target.value }))}
              options={mentorOptions}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={actionLoading || !formData.name || !formData.mentorId}
            >
              {actionLoading ? <Loading size="sm" /> : 'Create Group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedGroup(null);
          setFormData({ name: '', description: '', mentorId: '' });
        }}
        title="Edit Group"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter group description"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Assign Mentor</label>
            <Select
              value={formData.mentorId}
              onChange={(e) => setFormData(prev => ({ ...prev, mentorId: e.target.value }))}
              options={mentorOptions}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={actionLoading || !formData.name}
            >
              {actionLoading ? <Loading size="sm" /> : 'Update Group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGroup(null);
        }}
        title="Delete Group"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete <strong>{selectedGroup?.name}</strong>?
            This will remove all mentee assignments. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={actionLoading}
            >
              {actionLoading ? <Loading size="sm" /> : 'Delete Group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Mentees Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedGroup(null);
          setSelectedMentees([]);
        }}
        title={`Assign Mentees to ${selectedGroup?.name || 'Group'}`}
      >
        <div className="space-y-4">
          {unassignedStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              All students are already assigned to groups
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Select students to assign to this group ({unassignedStudents.length} available)
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                {unassignedStudents.map((student) => (
                  <label
                    key={student._id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMentees.includes(student._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMentees(prev => [...prev, student._id]);
                        } else {
                          setSelectedMentees(prev => prev.filter(id => id !== student._id));
                        }
                      }}
                      className="rounded"
                    />
                    <Avatar
                      src={student.avatar}
                      alt={getUserDisplayName(student)}
                      fallback={getUserDisplayName(student).charAt(0)}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium">{getUserDisplayName(student)}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.usn || student.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedMentees.length > 0 && (
                <Badge>{selectedMentees.length} selected</Badge>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignMentees}
              disabled={actionLoading || selectedMentees.length === 0}
            >
              {actionLoading ? <Loading size="sm" /> : 'Assign Mentees'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
