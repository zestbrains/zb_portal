import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

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

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="departments-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Departments</h1>
            <p className="text-gray-600">Manage company departments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-department-button">
                <Plus size={18} className="mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="department-dialog">
              <DialogHeader>
                <DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
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
                <Button type="submit" className="w-full" data-testid="save-department-button">
                  {editingDept ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No departments found. Create one to get started.</div>
            ) : (
              <div className="table-container">
                <table data-testid="departments-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.id} data-testid={`department-row-${dept.id}`}>
                        <td className="font-semibold">{dept.name}</td>
                        <td>{dept.description || '-'}</td>
                        <td>
                          <span className={`badge ${dept.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {dept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{new Date(dept.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(dept)}
                              data-testid={`edit-department-${dept.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(dept)}
                              data-testid={`toggle-department-${dept.id}`}
                            >
                              {dept.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(dept.id)}
                              data-testid={`delete-department-${dept.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
