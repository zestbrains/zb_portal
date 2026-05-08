import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
    if (role === 'admin') return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <ShieldCheck size={14} className="text-purple-600" />;
    return <Shield size={14} className="text-blue-600" />;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10" data-testid="admin-management-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Admin Management</h1>
            <p className="text-sm text-slate-500 mt-1">Create and manage Admin & HR users</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-xs" size="sm" data-testid="create-admin-btn">
            <UserPlus size={14} className="mr-1" />
            Create New User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"><Users size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Users</p><p className="text-2xl font-bold text-slate-900">{adminUsers.length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600"><ShieldCheck size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admins</p><p className="text-2xl font-bold text-purple-600">{adminUsers.filter(u => u.role === 'admin').length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600"><Shield size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">HR Users</p><p className="text-2xl font-bold text-blue-600">{adminUsers.filter(u => u.role === 'hr').length}</p></div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Admin & HR Users</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : adminUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No admin users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Username</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Email</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Role</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Employee ID</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Created At</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((adminUser) => (
                    <tr key={adminUser.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-sm text-slate-800">{adminUser.username}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{adminUser.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(adminUser.role)}`}>
                          {getRoleIcon(adminUser.role)}
                          {adminUser.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{adminUser.employee_id || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${adminUser.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          {adminUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {adminUser.created_at ? new Date(adminUser.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {adminUser.username !== user.username ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(adminUser.id, adminUser.username)}
                            className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
                            data-testid={`delete-user-${adminUser.id}`}
                          >
                            <Trash2 size={12} />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Current User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
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
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" data-testid="submit-create-admin">
                <UserPlus size={16} className="mr-2" />
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
