import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Phone, Mail, Users, Calendar, Clock } from 'lucide-react';
import { studentAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime } from '../../lib/utils';
import type { Interaction } from '../../types';

const getInteractionIcon = (type: string) => {
  switch (type) {
    case 'one-on-one':
      return <MessageSquare className="h-5 w-5" />;
    case 'group-meeting':
      return <Users className="h-5 w-5" />;
    case 'email':
      return <Mail className="h-5 w-5" />;
    case 'phone':
      return <Phone className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
};

const getInteractionLabel = (type: string) => {
  const labels: Record<string, string> = {
    'one-on-one': 'One-on-One Meeting',
    'group-meeting': 'Group Meeting',
    'email': 'Email Communication',
    'phone': 'Phone Call',
    'academic-review': 'Academic Review',
    'counseling': 'Counseling Session',
    'other': 'Other',
  };
  return labels[type] || type;
};

export const StudentInteractionsPage: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const response = await studentAPI.getInteractions();
        // Handle both direct array and paginated response
        const data = response.data.data;
        setInteractions(Array.isArray(data) ? data : data?.items || []);
      } catch (error) {
        console.error('Failed to fetch interactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInteractions();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading interactions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mentor Interactions</h1>
        <p className="text-muted-foreground mt-1">
          View your interaction history with your mentor
        </p>
      </div>

      {interactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Interactions Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your mentor hasn't recorded any interactions yet. Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <Card key={interaction._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getInteractionIcon(interaction.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {getInteractionLabel(interaction.type)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(interaction.date)}
                      </CardDescription>
                    </div>
                  </div>
                  {interaction.followUpRequired && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Follow-up Required
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </h4>
                  <p className="text-sm">{interaction.description}</p>
                </div>

                {interaction.outcome && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Outcome
                    </h4>
                    <p className="text-sm">{interaction.outcome}</p>
                  </div>
                )}

                {interaction.followUpDate && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Follow-up Date
                    </h4>
                    <p className="text-sm">{formatDateTime(interaction.followUpDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentInteractionsPage;
