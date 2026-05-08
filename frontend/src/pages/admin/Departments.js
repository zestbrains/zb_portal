import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Power, PowerOff, Building2 } from 'lucide-react';

export default function AdminDepartments({ user, onLogout }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      toast.error('Error fetching departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, formData);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', formData);
        toast.success('Department created successfully');
      }
      setDialogOpen(false);
      setEditingDept(null);
      setFormData({ name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await api.delete(`/departments/${id}`);
        toast.success('Department deleted');
        fetchDepartments();
      } catch (error) {
        toast.error('Error deleting department');
      }
    }
  };

  const handleToggleStatus = async (dept) => {
    try {
      await api.put(`/departments/${dept.id}/status?is_active=${!dept.is_active}`);
      toast.success('Status updated');
      fetchDepartments();
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const openNewDialog = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const activeDepts = departments.filter(d => d.is_active).length;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10" data-testid="departments-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Departments</h1>
            <p className="text-sm text-slate-500 mt-1">Manage company departments</p>
          </div>
          <Button onClick={openNewDialog} className="bg-slate-900 hover:bg-slate-800 text-xs" size="sm" data-testid="add-department-button">
            <Plus size={14} className="mr-1" />
            Add Department
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"><Building2 size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p><p className="text-2xl font-bold text-slate-900">{departments.length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600"><Power size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-green-600">{activeDepts}</p></div>
            </div>
          </div>
        </div>

        {/* Departments Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">All Departments</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading departments...</div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No departments found</p>
              <p className="text-xs text-slate-300 mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="departments-table">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Description</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Created At</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors" data-testid={`department-row-${dept.id}`}>
                      <td className="py-3 px-4 font-medium text-sm text-slate-800">{dept.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{dept.description || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${dept.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">{new Date(dept.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(dept)}
                            className="h-7 w-7 p-0 border-slate-200"
                            data-testid={`edit-department-${dept.id}`}
                          >
                            <Edit size={12} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(dept)}
                            className={`h-7 w-7 p-0 border-slate-200 ${dept.is_active ? 'text-amber-500' : 'text-green-500'}`}
                            data-testid={`toggle-department-${dept.id}`}
                          >
                            {dept.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(dept.id)}
                            className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
                            data-testid={`delete-department-${dept.id}`}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Department Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="department-dialog">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="department-name-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="department-description-input"
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" data-testid="save-department-button">
                {editingDept ? 'Update' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
