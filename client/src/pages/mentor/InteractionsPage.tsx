import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, AlertCircle } from 'lucide-react';
import { mentorAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import type { Interaction, User } from '../../types';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'one-on-one', label: 'One-on-One Meeting' },
  { value: 'group-meeting', label: 'Group Meeting' },
  { value: 'email', label: 'Email Communication' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'academic-review', label: 'Academic Review' },
  { value: 'counseling', label: 'Counseling Session' },
  { value: 'other', label: 'Other' },
];

const interactionTypeOptions = [
  { value: '', label: 'Select Type' },
  ...typeOptions.slice(1),
];

export const InteractionsPage: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [editForm, setEditForm] = useState({
    type: '',
    description: '',
    outcome: '',
    followUpRequired: false,
    followUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mentorAPI.getInteractions({
        search: searchQuery,
        type: typeFilter,
        followUpRequired: followUpFilter === 'true' ? true : followUpFilter === 'false' ? false : undefined,
        page,
        limit: 15,
      });
      setInteractions(response.data.data.items || response.data.data.interactions || []);
      setTotalPages(response.data.data.pagination?.totalPages || response.data.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch interactions:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, followUpFilter, page]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const getUserDisplayName = (user: User | string | undefined) => {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return user;
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const handleEditInteraction = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setEditForm({
      type: interaction.type,
      description: interaction.description,
      outcome: interaction.outcome || '',
      followUpRequired: interaction.followUpRequired || false,
      followUpDate: interaction.followUpDate ? new Date(interaction.followUpDate).toISOString().split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const handleUpdateInteraction = async () => {
    if (!selectedInteraction) return;
    setSaving(true);
    try {
      await mentorAPI.updateInteraction(selectedInteraction._id, {
        type: editForm.type,
        description: editForm.description,
        outcome: editForm.outcome,
        followUpRequired: editForm.followUpRequired,
        followUpDate: editForm.followUpDate || undefined,
      });
      setShowEditModal(false);
      setSelectedInteraction(null);
      fetchInteractions();
    } catch (error) {
      console.error('Failed to update interaction:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interaction?')) return;
    try {
      await mentorAPI.deleteInteraction(id);
      fetchInteractions();
    } catch (error) {
      console.error('Failed to delete interaction:', error);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'one-on-one': return 'default';
      case 'group-meeting': return 'secondary';
      case 'academic-review': return 'success';
      case 'counseling': return 'warning';
      default: return 'outline';
    }
  };

  const followUpOptions = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Follow-up Required' },
    { value: 'false', label: 'No Follow-up' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interactions</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage mentee interactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search interactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={typeOptions}
              className="w-full md:w-48"
            />
            <Select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              options={followUpOptions}
              className="w-full md:w-40"
            />
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setFollowUpFilter('');
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Interaction Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" />
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No interactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => {
                const student = typeof interaction.studentId !== 'string' ? interaction.studentId as User : null;
                
                return (
                  <div
                    key={interaction._id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    {student && (
                      <Avatar
                        src={student.avatar}
                        alt={getUserDisplayName(student)}
                        fallback={getUserDisplayName(student).charAt(0)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">
                          {getUserDisplayName(student || interaction.studentId)}
                        </span>
                        <Badge variant={getTypeBadgeVariant(interaction.type)}>
                          {interaction.type.replace('-', ' ')}
                        </Badge>
                        {interaction.followUpRequired && (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Follow-up
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {interaction.description}
                      </p>
                      {interaction.outcome && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Outcome:</span> {interaction.outcome}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(interaction.date).toLocaleDateString()}
                        </span>
                        {interaction.followUpDate && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Follow-up: {new Date(interaction.followUpDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditInteraction(interaction)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteInteraction(interaction._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}

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

      {/* Edit Interaction Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInteraction(null);
        }}
        title="Edit Interaction"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Interaction Type *</label>
            <Select
              value={editForm.type}
              onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
              options={interactionTypeOptions}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the interaction..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Outcome/Notes</label>
            <Textarea
              value={editForm.outcome}
              onChange={(e) => setEditForm(prev => ({ ...prev, outcome: e.target.value }))}
              placeholder="What was the outcome?"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editFollowUp"
              checked={editForm.followUpRequired}
              onChange={(e) => setEditForm(prev => ({ ...prev, followUpRequired: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="editFollowUp" className="text-sm">Follow-up required</label>
          </div>
          {editForm.followUpRequired && (
            <div>
              <label className="text-sm font-medium">Follow-up Date</label>
              <input
                type="date"
                value={editForm.followUpDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInteraction}
              disabled={saving || !editForm.type || !editForm.description}
            >
              {saving ? <Loading size="sm" /> : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
