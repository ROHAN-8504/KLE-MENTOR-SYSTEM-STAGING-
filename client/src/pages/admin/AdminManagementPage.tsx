import { useState, useEffect } from 'react';
import { 
  Crown, Trash2, UserMinus, Shield, AlertTriangle, 
  RefreshCw, User, Mail, Calendar
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface Admin {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  isTestAccount: boolean;
  createdAt: string;
}

export const AdminManagementPage: React.FC = () => {
  const { refetch: refetchCurrentUser } = useCurrentUser();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [demoteRole, setDemoteRole] = useState('student');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllAdmins();
      setAdmins(response.data.data.admins);
      setCurrentUserIsSuperAdmin(response.data.data.currentUserIsSuperAdmin);
      setCurrentUserId(response.data.data.currentUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleTransferOwnership = async () => {
    if (!selectedAdmin) return;
    
    try {
      setActionLoading(true);
      await adminAPI.transferSuperAdmin(selectedAdmin._id);
      setSuccess(`Super admin ownership transferred to ${selectedAdmin.email}`);
      setShowTransferModal(false);
      fetchAdmins();
      refetchCurrentUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      setActionLoading(true);
      await adminAPI.removeAdmin(selectedAdmin._id);
      setSuccess(`Admin ${selectedAdmin.email} has been removed`);
      setShowRemoveModal(false);
      fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      setActionLoading(true);
      await adminAPI.demoteAdmin(selectedAdmin._id, demoteRole);
      setSuccess(`${selectedAdmin.email} has been demoted to ${demoteRole}`);
      setShowDemoteModal(false);
      fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to demote admin');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text="Loading admin management..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrator accounts and transfer ownership
          </p>
        </div>
        <Button variant="outline" onClick={fetchAdmins}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current User Status */}
      <Card className={currentUserIsSuperAdmin ? 'border-amber-500/50 bg-amber-500/5' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {currentUserIsSuperAdmin ? (
              <Crown className="h-8 w-8 text-amber-500" />
            ) : (
              <Shield className="h-8 w-8 text-blue-500" />
            )}
            <div>
              <p className="font-medium">
                {currentUserIsSuperAdmin ? 'You are the Super Admin' : 'You are an Admin'}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentUserIsSuperAdmin 
                  ? 'You have full control to manage other admins, transfer ownership, and remove accounts.'
                  : 'Contact the super admin to manage admin accounts.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 text-green-600 text-sm flex items-center gap-2">
          ✓ {success}
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Admin List */}
      <Card>
        <CardHeader>
          <CardTitle>Administrator Accounts</CardTitle>
          <CardDescription>
            {admins.length} admin account(s) in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin._id}
                className={`p-4 rounded-lg border ${
                  admin.isSuperAdmin 
                    ? 'border-amber-500/50 bg-amber-500/5' 
                    : admin.isTestAccount 
                      ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50' 
                      : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      admin.isSuperAdmin 
                        ? 'bg-amber-500/20' 
                        : 'bg-primary/10'
                    }`}>
                      {admin.isSuperAdmin ? (
                        <Crown className="h-5 w-5 text-amber-500" />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {admin.firstName} {admin.lastName}
                        </p>
                        {admin.isSuperAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600">
                            Super Admin
                          </span>
                        )}
                        {admin.isTestAccount && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-600">
                            Test Account
                          </span>
                        )}
                        {admin._id === currentUserId && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - Only for super admin and not for self or test accounts */}
                  {currentUserIsSuperAdmin && 
                   admin._id !== currentUserId && 
                   !admin.isTestAccount && 
                   !admin.isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowTransferModal(true);
                        }}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Transfer Ownership
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowDemoteModal(true);
                        }}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Demote
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowRemoveModal(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {admins.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No admin accounts found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Handover Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <p><strong>To transfer project ownership to a new admin:</strong></p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Have the new admin sign up using the <code className="px-1 py-0.5 rounded bg-muted">ADMIN_SECRET_KEY</code></li>
              <li>Once they appear in the list above, click <strong>"Transfer Ownership"</strong></li>
              <li>The new admin becomes Super Admin and can then remove your account</li>
              <li>After handover, change the <code className="px-1 py-0.5 rounded bg-muted">ADMIN_SECRET_KEY</code> in the server environment</li>
            </ol>
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-600 dark:text-amber-400">
                <strong>⚠️ Important:</strong> Test accounts (created by seed scripts) cannot be made super admin or used for login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Super Admin Ownership"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-600 dark:text-amber-400">
              <strong>Warning:</strong> This action will transfer your super admin privileges to{' '}
              <strong>{selectedAdmin?.email}</strong>. You will become a regular admin and they will have full control.
            </p>
          </div>
          <p>Are you sure you want to continue?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferOwnership} 
              loading={actionLoading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              Transfer Ownership
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Admin Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove Admin"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to remove <strong>{selectedAdmin?.email}</strong> as an admin?
            This will permanently delete their account.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveAdmin} 
              loading={actionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* Demote Admin Modal */}
      <Modal
        isOpen={showDemoteModal}
        onClose={() => setShowDemoteModal(false)}
        title="Demote Admin"
      >
        <div className="space-y-4">
          <p>
            Demote <strong>{selectedAdmin?.email}</strong> to a different role:
          </p>
          <Select
            value={demoteRole}
            onChange={(e) => setDemoteRole(e.target.value)}
            options={[
              { value: 'student', label: 'Student' },
              { value: 'mentor', label: 'Mentor' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDemoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleDemoteAdmin} loading={actionLoading}>
              <UserMinus className="h-4 w-4 mr-2" />
              Demote to {demoteRole}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminManagementPage;
