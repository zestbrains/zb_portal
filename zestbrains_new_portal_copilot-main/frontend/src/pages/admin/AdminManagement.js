import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Users, Trash2, Shield, ShieldCheck } from 'lucide-react';

export default function AdminManagement({ user, onLogout }) {
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setAdminUsers(response.data);
    } catch (error) {
      toast.error('Error fetching admin users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      toast.success(`${formData.role.toUpperCase()} user created successfully`);
      setDialogOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'admin' });
      fetchAdminUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating user');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchAdminUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting user');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') {
      return <ShieldCheck size={16} className="text-purple-600" />;
    }
    return <Shield size={16} className="text-blue-600" />;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="admin-management-page">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Management</h1>
            <p className="text-gray-600">Create and manage Admin & HR users</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="create-admin-btn">
            <UserPlus size={18} className="mr-2" />
            Create New User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users size={24} />
                <div>
                  <p className="text-sm opacity-80">Total Users</p>
                  <p className="text-2xl font-bold">{adminUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={24} />
                <div>
                  <p className="text-sm opacity-80">Admins</p>
                  <p className="text-2xl font-bold">{adminUsers.filter(u => u.role === 'admin').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield size={24} />
                <div>
                  <p className="text-sm opacity-80">HR Users</p>
                  <p className="text-2xl font-bold">{adminUsers.filter(u => u.role === 'hr').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Admin & HR Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : adminUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No admin users found</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Employee ID</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((adminUser) => (
                      <tr key={adminUser.id}>
                        <td className="font-semibold">{adminUser.username}</td>
                        <td>{adminUser.email}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadge(adminUser.role)}`}>
                            {getRoleIcon(adminUser.role)}
                            {adminUser.role.toUpperCase()}
                          </span>
                        </td>
                        <td>{adminUser.employee_id || '-'}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${adminUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {adminUser.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm">
                          {adminUser.created_at ? new Date(adminUser.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td>
                          {adminUser.username !== user.username ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(adminUser.id, adminUser.username)}
                              data-testid={`delete-user-${adminUser.id}`}
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">Current User</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus size={20} />
                Create New Admin/HR User
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  required
                  data-testid="new-admin-username"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  required
                  data-testid="new-admin-email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required
                  minLength={6}
                  data-testid="new-admin-password"
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger data-testid="new-admin-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" data-testid="submit-create-admin">
                <UserPlus size={18} className="mr-2" />
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
