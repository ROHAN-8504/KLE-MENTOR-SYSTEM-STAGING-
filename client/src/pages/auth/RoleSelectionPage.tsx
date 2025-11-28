import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Shield, Key } from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';

export const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectRole, loading, clerkUser } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<'mentor' | 'student' | 'admin' | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selectedRole) return;
    setError('');

    // For admin role, pass the admin key
    const success = await selectRole(selectedRole, selectedRole === 'admin' ? adminKey : undefined);
    if (success) {
      navigate(`/${selectedRole}/dashboard`);
    } else if (selectedRole === 'admin') {
      setError('Invalid admin key. Please try again.');
    }
  };

  const roles = [
    {
      id: 'mentor' as const,
      title: 'Mentor',
      description: 'Guide and support students in their academic journey',
      icon: Users,
      features: [
        'Manage mentee groups',
        'Schedule meetings',
        'Track student progress',
        'Record interactions',
      ],
    },
    {
      id: 'student' as const,
      title: 'Student',
      description: 'Connect with your mentor and track your academic progress',
      icon: GraduationCap,
      features: [
        'View assigned mentor',
        'Attend meetings',
        'Track academics',
        'Chat with mentor',
      ],
    },
    {
      id: 'admin' as const,
      title: 'Admin',
      description: 'Manage the entire mentor system and users',
      icon: Shield,
      features: [
        'Manage all users',
        'Create mentor groups',
        'View system reports',
        'Access activity logs',
      ],
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6 md:mb-8">
          <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3 md:mb-4">
            <span className="text-primary-foreground font-bold text-2xl md:text-3xl">K</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome, {clerkUser?.firstName || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-lg">
            Please select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                selectedRole === role.id && 'ring-2 ring-primary shadow-lg',
              )}
              onClick={() => {
                setSelectedRole(role.id);
                setError('');
              }}
            >
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div
                    className={cn(
                      'h-10 w-10 md:h-12 md:w-12 rounded-lg flex items-center justify-center shrink-0',
                      selectedRole === role.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    <role.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base md:text-lg">{role.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm line-clamp-2">{role.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                <ul className="space-y-1.5 md:space-y-2">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs md:text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Key Input */}
        {selectedRole === 'admin' && (
          <div className="mb-6 md:mb-8 max-w-md mx-auto px-2">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Admin Secret Key</label>
            </div>
            <Input
              type="password"
              placeholder="Enter admin secret key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Contact the system administrator to get the admin key
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 md:mb-6 max-w-md mx-auto">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        <div className="flex justify-center px-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedRole || (selectedRole === 'admin' && !adminKey)}
            loading={loading}
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            Continue as {selectedRole ? roles.find(r => r.id === selectedRole)?.title : '...'}
          </Button>
        </div>
      </div>
    </div>
  );
};
