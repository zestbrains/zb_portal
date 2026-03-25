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
import { Plus, Edit, Trash2, UserCheck, UserX, Eye, X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

export default function AdminEmployees({ user, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [formData, setFormData] = useState({
    employee_id: '', name: '', email: '', phone: '', department_ids: [],
    experience: '', password: '', joining_date: '', birth_date: '', team_leader_ids: [],
    bank_id: '', pt: '', esic: '', epf: '', cpf: '', salary: ''
  });
  const [teamLeaderSearch, setTeamLeaderSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchBanks();
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

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      // Filter only active banks
      const activeBanks = response.data.filter(bank => bank.is_active);
      setBanks(activeBanks);
    } catch (error) {
      console.error('Error fetching banks');
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
      experience: '', password: '', joining_date: '', birth_date: '', team_leader_ids: [],
      bank_id: '', pt: '', esic: '', epf: '', cpf: '', salary: ''
    });
    setTeamLeaderSearch('');
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
      team_leader_ids: emp.team_leader_ids || [],
      bank_id: emp.bank_id || '',
      pt: emp.pt || '',
      esic: emp.esic || '',
      epf: emp.epf || '',
      cpf: emp.cpf || '',
      salary: emp.salary || ''
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

  // Get available team leaders (all active employees except the current employee being edited)
  const getAvailableTeamLeaders = () => {
    return employees.filter(e => 
      e.status === 'active' && 
      (!editingEmp || e.employee_id !== editingEmp.employee_id)
    );
  };

  const filteredTeamLeaders = getAvailableTeamLeaders().filter(emp =>
    emp.name.toLowerCase().includes(teamLeaderSearch.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(teamLeaderSearch.toLowerCase())
  );

  const addTeamLeader = (empId) => {
    if (!formData.team_leader_ids?.includes(empId)) {
      setFormData({
        ...formData,
        team_leader_ids: [...(formData.team_leader_ids || []), empId]
      });
      setTeamLeaderSearch('');
    }
  };

  const removeTeamLeader = (empId) => {
    setFormData({
      ...formData,
      team_leader_ids: (formData.team_leader_ids || []).filter(id => id !== empId)
    });
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
    <div className="overflow-x-auto">
      <table className="w-full" data-testid="employees-table">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Employee ID</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Department(s)</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Experience</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Joining Date</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((emp) => (
            <tr key={emp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors" data-testid={`employee-row-${emp.employee_id}`}>
              <td className="py-3 px-4 font-mono text-sm text-slate-600">{emp.employee_id}</td>
              <td className="py-3 px-4 font-medium text-sm text-slate-800">{emp.name}</td>
              <td className="py-3 px-4 text-sm text-slate-500">{getDepartmentNames(emp)}</td>
              <td className="py-3 px-4 text-sm text-slate-500">{emp.experience || 'N/A'}</td>
              <td className="py-3 px-4 text-sm text-slate-500">{new Date(emp.joining_date).toLocaleDateString('en-IN')}</td>
              <td className="py-3 px-4">
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleViewEmployee(emp)} className="h-7 text-xs border-slate-200" data-testid={`view-employee-${emp.employee_id}`}>View</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(emp)} className="h-7 w-7 p-0 border-slate-200" data-testid={`edit-employee-${emp.employee_id}`}><Edit size={12} /></Button>
                  <Button size="sm" variant={isExEmployee ? "default" : "outline"} className={isExEmployee ? "bg-green-600 hover:bg-green-700 h-7 w-7 p-0" : "h-7 w-7 p-0 border-slate-200"} onClick={() => handleToggleStatus(emp)} title={isExEmployee ? "Reactivate" : "Mark Ex-Employee"} data-testid={`toggle-employee-${emp.employee_id}`}>{isExEmployee ? <UserCheck size={12} /> : <UserX size={12} />}</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(emp.id)} className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" data-testid={`delete-employee-${emp.employee_id}`}><Trash2 size={12} /></Button>
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
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="employees-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Employees</h1>
            <p className="text-sm text-slate-500 mt-1">Manage company employees</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 border-slate-200"
              data-testid="employee-search-input"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} className="bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto" data-testid="add-employee-button">
                  <Plus size={16} className="mr-1.5" />
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
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.department_ids?.includes(dept.id) || false}
                            onChange={() => handleDepartmentToggle(dept.id)}
                            className="rounded border-slate-200"
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
                  
                  {/* Bank and Statutory Fields */}
                  <div className="sm:col-span-2">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Bank & Statutory Details (Optional)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bank_id">Select Bank</Label>
                          <select
                            id="bank_id"
                            value={formData.bank_id || ''}
                            onChange={(e) => setFormData({ ...formData, bank_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="">-- Select Bank --</option>
                            {banks.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="pt">PT</Label>
                          <Input
                            id="pt"
                            type="text"
                            placeholder="Enter PT"
                            value={formData.pt || ''}
                            onChange={(e) => setFormData({ ...formData, pt: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="esic">ESIC</Label>
                          <Input
                            id="esic"
                            type="text"
                            placeholder="Enter ESIC"
                            value={formData.esic || ''}
                            onChange={(e) => setFormData({ ...formData, esic: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="epf">EPF</Label>
                          <Input
                            id="epf"
                            type="text"
                            placeholder="Enter EPF"
                            value={formData.epf || ''}
                            onChange={(e) => setFormData({ ...formData, epf: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            type="text"
                            placeholder="Enter CPF"
                            value={formData.cpf || ''}
                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="salary">Salary</Label>
                          <Input
                            id="salary"
                            type="text"
                            placeholder="Enter Salary"
                            value={formData.salary || ''}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Assign Team Leaders</Label>
                    <Input 
                      placeholder="Search team leader..." 
                      value={teamLeaderSearch} 
                      onChange={(e) => setTeamLeaderSearch(e.target.value)} 
                    />
                    {teamLeaderSearch && filteredTeamLeaders.length > 0 && (
                      <div className="border rounded-md max-h-32 sm:max-h-40 overflow-y-auto mt-2">
                        {filteredTeamLeaders.slice(0, 10).map(emp => (
                          <div 
                            key={emp.employee_id} 
                            className="p-2 hover:bg-slate-100 cursor-pointer text-sm flex items-center justify-between" 
                            onClick={() => addTeamLeader(emp.employee_id)}
                          >
                            <span>{emp.name} ({emp.employee_id})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(formData.team_leader_ids || []).map(empId => {
                        const emp = employees.find(e => e.employee_id === empId);
                        return (
                          <Badge key={empId} variant="secondary" className="flex items-center gap-1 text-xs">
                            {emp ? emp.name : empId}
                            <X size={12} className="cursor-pointer" onClick={() => removeTeamLeader(empId)} />
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Type to search and select multiple team leaders who will receive leave approval notifications</p>
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

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading employees...</div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-slate-200 px-4 pt-3">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="active" data-testid="active-employees-tab" className="text-xs">Active ({activeEmployees.length})</TabsTrigger>
                    <TabsTrigger value="ex-employee" data-testid="ex-employees-tab" className="text-xs">Ex-Employees ({exEmployees.length})</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="active" className="m-0">
                  {filteredActiveEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No active employees found.</div>
                  ) : (
                    <EmployeeTable data={filteredActiveEmployees} isExEmployee={false} />
                  )}
                </TabsContent>
                <TabsContent value="ex-employee" className="m-0">
                  {filteredExEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No ex-employees found.</div>
                  ) : (
                    <EmployeeTable data={filteredExEmployees} isExEmployee={true} />
                  )}
                </TabsContent>
              </Tabs>
            )}
        </div>

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
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-slate-700">
                        {viewingEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{viewingEmployee.name}</h3>
                    <p className="text-slate-400 text-sm">{viewingEmployee.employee_id}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium truncate ml-2 max-w-[60%]">{viewingEmployee.email}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium">{viewingEmployee.phone}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Department(s)</span>
                    <span className="font-medium text-right max-w-[60%]">{getDepartmentNames(viewingEmployee)}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Experience</span>
                    <span className="font-medium">{viewingEmployee.experience || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Joining Date</span>
                    <span className="font-medium">{new Date(viewingEmployee.joining_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Birth Date</span>
                    <span className="font-medium">{viewingEmployee.birth_date ? new Date(viewingEmployee.birth_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 sm:p-3 bg-white border rounded text-sm">
                    <span className="text-slate-500">Status</span>
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
