import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';
import { mentorAPI, chatAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import type { User, Semester, Interaction } from '../../types';

interface MenteeDetails extends User {
  group?: {
    _id: string;
    name: string;
  };
}

const interactionTypeOptions = [
  { value: '', label: 'Select Type' },
  { value: 'one-on-one', label: 'One-on-One Meeting' },
  { value: 'group-meeting', label: 'Group Meeting' },
  { value: 'email', label: 'Email Communication' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'academic-review', label: 'Academic Review' },
  { value: 'counseling', label: 'Counseling Session' },
  { value: 'other', label: 'Other' },
];

export const MenteeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mentee, setMentee] = useState<MenteeDetails | null>(null);
  const [academics, setAcademics] = useState<Semester[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: '',
    description: '',
    outcome: '',
    followUpRequired: false,
    followUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [menteeRes, interactionsRes] = await Promise.all([
          mentorAPI.getMenteeDetails(id),
          mentorAPI.getInteractions({ studentId: id }),
        ]);
        // API returns { mentee, interactions, academicRecords, group }
        const menteeData = menteeRes.data.data;
        setMentee(menteeData.mentee || menteeData);
        setAcademics(menteeData.academicRecords || []);
        // Interactions from mentee endpoint + separate call
        const interactionsData = interactionsRes.data.data;
        setInteractions(interactionsData?.items || interactionsData || []);
      } catch (error) {
        console.error('Failed to fetch mentee details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getUserDisplayName = (user: User | MenteeDetails | null) => {
    if (!user) return 'Unknown';
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const handleStartChat = async () => {
    if (!id) return;
    try {
      await chatAPI.accessChat(id);
      window.location.href = '/mentor/chat';
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const handleAddInteraction = async () => {
    if (!id || !interactionForm.type || !interactionForm.description) return;
    setSaving(true);
    try {
      await mentorAPI.recordInteraction({
        studentId: id,
        type: interactionForm.type,
        description: interactionForm.description,
        outcome: interactionForm.outcome,
        followUpRequired: interactionForm.followUpRequired,
        followUpDate: interactionForm.followUpDate || undefined,
        date: new Date().toISOString(),
      });
      // Refresh interactions
      const res = await mentorAPI.getInteractions({ studentId: id });
      setInteractions(res.data.data || []);
      setShowInteractionModal(false);
      setInteractionForm({
        type: '',
        description: '',
        outcome: '',
        followUpRequired: false,
        followUpDate: '',
      });
    } catch (error) {
      console.error('Failed to add interaction:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateCGPA = () => {
    if (academics.length === 0) return 'N/A';
    const lastSemester = academics.sort((a, b) => b.semester - a.semester)[0];
    return lastSemester.cgpa?.toFixed(2) || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading mentee details..." />
      </div>
    );
  }

  if (!mentee) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Mentee not found</h2>
        <Link to="/mentor/groups">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/mentor/groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Mentee Profile</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar
              src={mentee.avatar}
              alt={getUserDisplayName(mentee)}
              fallback={getUserDisplayName(mentee).charAt(0)}
              size="xl"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{getUserDisplayName(mentee)}</h2>
              <p className="text-muted-foreground">{mentee.usn}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{mentee.email}</span>
                </div>
                {mentee.profile?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{mentee.profile.phone}</span>
                  </div>
                )}
                {mentee.profile?.department && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{mentee.profile.department}</span>
                  </div>
                )}
                {mentee.profile?.semester && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Semester {mentee.profile.semester}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleStartChat}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
                <Button variant="outline" onClick={() => setShowInteractionModal(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Record Interaction
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Academic Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Academic Records
            </CardTitle>
            <CardDescription>
              Current CGPA: <span className="font-semibold">{calculateCGPA()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {academics.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No academic records available
              </p>
            ) : (
              <div className="space-y-3">
                {academics.sort((a, b) => b.semester - a.semester).map((sem) => (
                  <div
                    key={sem._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium">Semester {sem.semester}</div>
                      <div className="text-sm text-muted-foreground">{sem.year}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">SGPA: {sem.sgpa?.toFixed(2) || 'N/A'}</div>
                      {sem.backlogs !== undefined && sem.backlogs > 0 && (
                        <Badge variant="destructive" className="mt-1">
                          {sem.backlogs} Backlogs
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Interactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Interactions
            </CardTitle>
            <CardDescription>
              {interactions.length} total interactions recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {interactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No interactions recorded yet
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {interactions.slice(0, 5).map((interaction) => (
                  <div
                    key={interaction._id}
                    className="p-3 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge>{interaction.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(interaction.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {interaction.description}
                    </p>
                    {interaction.followUpRequired && (
                      <Badge variant="warning" className="mt-2">
                        Follow-up required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link to="/mentor/interactions" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Interactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Record Interaction Modal */}
      <Modal
        isOpen={showInteractionModal}
        onClose={() => setShowInteractionModal(false)}
        title="Record Interaction"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Interaction Type *</label>
            <Select
              value={interactionForm.type}
              onChange={(e) => setInteractionForm(prev => ({ ...prev, type: e.target.value }))}
              options={interactionTypeOptions}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={interactionForm.description}
              onChange={(e) => setInteractionForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the interaction..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Outcome/Notes</label>
            <Textarea
              value={interactionForm.outcome}
              onChange={(e) => setInteractionForm(prev => ({ ...prev, outcome: e.target.value }))}
              placeholder="What was the outcome?"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="followUp"
              checked={interactionForm.followUpRequired}
              onChange={(e) => setInteractionForm(prev => ({ ...prev, followUpRequired: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="followUp" className="text-sm">Follow-up required</label>
          </div>
          {interactionForm.followUpRequired && (
            <div>
              <label className="text-sm font-medium">Follow-up Date</label>
              <input
                type="date"
                value={interactionForm.followUpDate}
                onChange={(e) => setInteractionForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInteractionModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddInteraction}
              disabled={saving || !interactionForm.type || !interactionForm.description}
            >
              {saving ? <Loading size="sm" /> : 'Save Interaction'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
