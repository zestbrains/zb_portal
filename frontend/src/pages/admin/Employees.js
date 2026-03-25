import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, UserCheck, UserX, Eye } from 'lucide-react';

export default function AdminEmployees({ user, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [formData, setFormData] = useState({
    employee_id: '', name: '', email: '', phone: '', department_ids: [],
    experience: '', password: '', joining_date: '', birth_date: '', team_leader_ids: []
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        const updateData = { ...formData };
        delete updateData.username;
        // Only include password if it has a value (trimmed)
        if (!updateData.password || !updateData.password.trim()) {
          delete updateData.password;
        } else {
          updateData.password = updateData.password.trim();
        }
        await api.put(`/employees/${editingEmp.id}`, updateData);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', formData);
        toast.success('Employee created successfully');
      }
      setDialogOpen(false);
      setEditingEmp(null);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '', name: '', email: '', phone: '', department_ids: [],
      experience: '', password: '', joining_date: '', birth_date: '', team_leader_ids: []
    });
  };

  const handleEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department_ids: emp.department_ids || (emp.department_id ? [emp.department_id] : []),
      experience: emp.experience,
      password: '',
      joining_date: emp.joining_date,
      birth_date: emp.birth_date || '',
      team_leader_ids: emp.team_leader_ids || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/employees/${id}`);
        toast.success('Employee deleted');
        fetchEmployees();
      } catch (error) {
        toast.error('Error deleting employee');
      }
    }
  };

  const handleToggleStatus = async (emp) => {
    const newStatus = emp.status === 'active' ? 'ex-employee' : 'active';
    const confirmMsg = emp.status === 'active' 
      ? 'Mark this employee as ex-employee?' 
      : 'Reactivate this employee?';
    
    if (window.confirm(confirmMsg)) {
      try {
        await api.put(`/employees/${emp.id}/status?status=${newStatus}`);
        toast.success(newStatus === 'active' ? 'Employee reactivated' : 'Employee marked as ex-employee');
        fetchEmployees();
      } catch (error) {
        toast.error('Error updating status');
      }
    }
  };

  const openNewDialog = () => {
    setEditingEmp(null);
    resetForm();
    setDialogOpen(true);
  };

  const getDepartmentNames = (emp) => {
    const deptIds = emp.department_ids || (emp.department_id ? [emp.department_id] : []);
    return deptIds
      .map(id => departments.find(d => d.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'N/A';
  };

  const handleDepartmentToggle = (deptId) => {
    const currentDepts = formData.department_ids || [];
    if (currentDepts.includes(deptId)) {
      setFormData({
        ...formData,
        department_ids: currentDepts.filter(id => id !== deptId)
      });
    } else {
      setFormData({
        ...formData,
        department_ids: [...currentDepts, deptId]
      });
    }
  };

  const handleTeamLeaderToggle = (empId) => {
    const currentLeaders = formData.team_leader_ids || [];
    if (currentLeaders.includes(empId)) {
      setFormData({
        ...formData,
        team_leader_ids: currentLeaders.filter(id => id !== empId)
      });
    } else {
      setFormData({
        ...formData,
        team_leader_ids: [...currentLeaders, empId]
      });
    }
  };

  // Get available team leaders (all active employees except the current employee being edited)
  const getAvailableTeamLeaders = () => {
    return employees.filter(e => 
      e.status === 'active' && 
      (!editingEmp || e.employee_id !== editingEmp.employee_id)
    );
  };

  const handleViewEmployee = (emp) => {
    setViewingEmployee(emp);
    setViewDialogOpen(true);
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const exEmployees = employees.filter(e => e.status === 'ex-employee');

  const filterEmployees = (empList) => {
    if (!searchQuery) return empList;
    const query = searchQuery.toLowerCase();
    return empList.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.employee_id.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.phone.includes(query)
    );
  };

  const filteredActiveEmployees = filterEmployees(activeEmployees);
  const filteredExEmployees = filterEmployees(exEmployees);

  const EmployeeTable = ({ data, isExEmployee = false }) => (
    <div className="table-container">
      <table data-testid="employees-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Department(s)</th>
            <th>Experience</th>
            <th>Joining Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((emp) => (
            <tr key={emp.id} data-testid={`employee-row-${emp.employee_id}`}>
              <td className="font-semibold">{emp.employee_id}</td>
              <td>{emp.name}</td>
              <td>
                <span className="text-sm">{getDepartmentNames(emp)}</span>
              </td>
              <td>{emp.experience || 'N/A'}</td>
              <td>{new Date(emp.joining_date).toLocaleDateString('en-IN')}</td>
              <td>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewEmployee(emp)} data-testid={`view-employee-${emp.employee_id}`}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(emp)} data-testid={`edit-employee-${emp.employee_id}`}>
                    <Edit size={16} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={isExEmployee ? "default" : "outline"}
                    className={isExEmployee ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => handleToggleStatus(emp)} 
                    title={isExEmployee ? "Reactivate Employee" : "Mark as Ex-Employee"}
                    data-testid={`toggle-employee-${emp.employee_id}`}
                  >
                    {isExEmployee ? <UserCheck size={16} /> : <UserX size={16} />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(emp.id)} data-testid={`delete-employee-${emp.employee_id}`}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="employees-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Employees</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage company employees</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
              data-testid="employee-search-input"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto" data-testid="add-employee-button">
                  <Plus size={18} className="mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl lg:max-w-2xl" data-testid="employee-dialog">
              <DialogHeader>
                <DialogTitle>{editingEmp ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      required
                      data-testid="employee-id-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="employee-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="employee-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      data-testid="employee-phone-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Departments (Select multiple)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                      {departments.filter(d => d.is_active).map((dept) => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.department_ids?.includes(dept.id) || false}
                            onChange={() => handleDepartmentToggle(dept.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs sm:text-sm">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                    {formData.department_ids?.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Please select at least one department</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="experience">Experience</Label>
                    <Input
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      placeholder="e.g., 2 years"
                      required
                      data-testid="employee-experience-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Birth Date</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      data-testid="employee-birth-date-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input
                      id="joining_date"
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      required={!editingEmp}
                      data-testid="employee-joining-date-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">{editingEmp ? 'New Password (optional)' : 'Password'}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingEmp}
                      data-testid="employee-password-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Assigned Team Leaders (Select multiple)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-3 border rounded-lg max-h-40 overflow-y-auto bg-blue-50/30">
                      {getAvailableTeamLeaders().length === 0 ? (
                        <p className="text-sm text-gray-500 col-span-full">No team leaders available</p>
                      ) : (
                        getAvailableTeamLeaders().map((emp) => (
                          <label key={emp.employee_id} className="flex items-center gap-2 cursor-pointer hover:bg-blue-100/50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={formData.team_leader_ids?.includes(emp.employee_id) || false}
                              onChange={() => handleTeamLeaderToggle(emp.employee_id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs sm:text-sm truncate" title={`${emp.name} (${emp.employee_id})`}>
                              {emp.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Team leaders can view projects and work entries of their team members</p>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={formData.department_ids?.length === 0}
                  data-testid="save-employee-button"
                >
                  {editingEmp ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading employees...</div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="active" data-testid="active-employees-tab">Active Employees ({activeEmployees.length})</TabsTrigger>
                    <TabsTrigger value="ex-employee" data-testid="ex-employees-tab">Ex-Employees ({exEmployees.length})</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="active" className="m-0">
                  {filteredActiveEmployees.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No active employees found.</div>
                  ) : (
                    <EmployeeTable data={filteredActiveEmployees} isExEmployee={false} />
                  )}
                </TabsContent>
                <TabsContent value="ex-employee" className="m-0">
                  {filteredExEmployees.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No ex-employees found.</div>
                  ) : (
                    <EmployeeTable data={filteredExEmployees} isExEmployee={true} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* View Employee Dialog */}
        {viewingEmployee && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye size={20} />
                  Employee Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl sm:text-2xl font-bold text-indigo-600">
                        {viewingEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold">{viewingEmployee.name}</h3>
                    <p className="text-gray-500 text-sm">{viewingEmployee.employee_id}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Email</span>
                    <span className="font-medium truncate ml-2 max-w-[60%]">{viewingEmployee.email}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-medium">{viewingEmployee.phone}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Department(s)</span>
                    <span className="font-medium text-right max-w-[60%]">{getDepartmentNames(viewingEmployee)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Experience</span>
                    <span className="font-medium">{viewingEmployee.experience || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Joining Date</span>
                    <span className="font-medium">{new Date(viewingEmployee.joining_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Birth Date</span>
                    <span className="font-medium">{viewingEmployee.birth_date ? new Date(viewingEmployee.birth_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      viewingEmployee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {viewingEmployee.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="w-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
