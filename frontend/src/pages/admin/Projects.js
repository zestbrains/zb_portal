import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Upload, Download, X, AlertTriangle, Clock, FolderKanban, Send } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

export default function AdminProjects({ user, onLogout }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectSummary, setProjectSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);
  const [projectHistory, setProjectHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filters, setFilters] = useState({
    projectName: '',
    clientName: '',
    status: '',
    search: ''
  });
  const [formData, setFormData] = useState({
    name: '', type: 'Development', project_code: '', start_date: '',
    end_date: '', completed_hours: '0', status: 'ongoing',
    client_username: '', scope_of_work: '', timesheet_link: '',
    poc: [], scope: '', platform: ''
  });
  const [pocSearch, setPocSearch] = useState('');
  const [selectedPoc, setSelectedPoc] = useState([]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchProjectSummary();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      toast.error('Error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Fetch all employees (both active and ex-employees) for project assignment
      const response = await api.get('/employees?status=all');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees');
    }
  };

  const fetchProjectSummary = async () => {
    try {
      const response = await api.get('/work-entries/summary');
      // Create a map of project_code -> employee_hours
      const summaryMap = {};
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(item => {
          summaryMap[item.project_code] = item.employee_hours;
        });
      }
      setProjectSummary(summaryMap);
    } catch (error) {
      console.error('Error fetching project summary');
    }
  };

  const getEmployeeHours = (projectCode) => {
    // Get employee hours from the summary endpoint data
    return projectSummary[projectCode] || {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        completed_hours: parseFloat(formData.completed_hours),
        assigned_employees: selectedEmployees,
        poc: selectedPoc
      };
      
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, submitData);
        toast.success('Project updated successfully');
      } else {
        await api.post('/projects', submitData);
        toast.success('Project created successfully');
      }
      setDialogOpen(false);
      setEditingProject(null);
      resetForm();
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'Development', project_code: '', start_date: '',
      end_date: '', completed_hours: '0', status: 'ongoing',
      client_username: '', scope_of_work: '', timesheet_link: '',
      poc: [], scope: '', platform: ''
    });
    setSelectedEmployees([]);
    setEmployeeSearch('');
    setSelectedPoc([]);
    setPocSearch('');
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      type: project.type,
      project_code: project.project_code,
      start_date: project.start_date,
      end_date: project.end_date,
      completed_hours: project.completed_hours?.toString() || '0',
      status: project.status,
      client_username: project.client_username || '',
      scope_of_work: project.scope_of_work || '',
      timesheet_link: project.timesheet_link || '',
      poc: project.poc || [],
      scope: project.scope || '',
      platform: project.platform || ''
    });
    setSelectedEmployees(project.assigned_employees || []);
    setSelectedPoc(project.poc || []);
    setDialogOpen(true);
  };

  const handleView = async (project) => {
    setViewingProject(project);
    setProjectHistory(null);
    setHistoryLoading(true);
    setViewDialogOpen(true);
    
    // Fetch project history
    try {
      const response = await api.get(`/projects/${project.id}/history`);
      setProjectHistory(response.data);
    } catch (error) {
      console.error('Error fetching project history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await api.delete(`/projects/${id}`);
        toast.success('Project deleted');
        fetchProjects();
      } catch (error) {
        toast.error('Error deleting project');
      }
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await api.delete('/projects');
      toast.success(response.data.message);
      setDeleteAllDialogOpen(false);
      fetchProjects();
    } catch (error) {
      toast.error('Error deleting all projects');
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/projects/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      fetchProjects();
    } catch (error) {
      toast.error('Error importing projects');
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `name,type,project_code,start_date,end_date,completed_hours,assigned_employees,status,client_username,scope_of_work,timesheet_link
Website Redesign,Development,zb_new_701,2026-01-01,2026-03-31,0,EMP001,ongoing,client1,Complete website redesign,https://docs.google.com/spreadsheets`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_import_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openNewDialog = () => {
    setEditingProject(null);
    resetForm();
    setDialogOpen(true);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const addEmployee = (empId) => {
    if (!selectedEmployees.includes(empId)) {
      setSelectedEmployees([...selectedEmployees, empId]);
      setEmployeeSearch('');
    }
  };

  const removeEmployee = (empId) => {
    setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
  };

  const filteredPocEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(pocSearch.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(pocSearch.toLowerCase())
  );

  const addPoc = (empId) => {
    if (!selectedPoc.includes(empId)) {
      setSelectedPoc([...selectedPoc, empId]);
      setPocSearch('');
    }
  };

  const removePoc = (empId) => {
    setSelectedPoc(selectedPoc.filter(id => id !== empId));
  };

  const handleSendMail = async (projId) => {
    try {
      await api.post(`/projects/${projId}/send-mail`);
      toast.success('Project notification email sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const getFilteredProjects = () => {
    return projects.filter(proj => {
      // By default, hide Hold, Cancel, Completed projects unless filtered
      if (!filters.status || filters.status === '' || filters.status === 'active_only') {
        if (['hold', 'cancelled', 'completed'].includes(proj.status)) return false;
      } else if (filters.status !== 'all' && proj.status !== filters.status) {
        return false;
      }
      if (filters.projectName && !proj.name.toLowerCase().includes(filters.projectName.toLowerCase())) return false;
      if (filters.clientName && !proj.client_username.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return proj.name.toLowerCase().includes(search) ||
               proj.project_code?.toLowerCase().includes(search) ||
               proj.client_username?.toLowerCase().includes(search);
      }
      return true;
    });
  };

  const filteredProjects = getFilteredProjects();

  const getStatusColor = (status) => {
    const colors = {
      'ongoing': 'bg-blue-100 text-blue-700 border-blue-200',
      'late': 'bg-red-500 text-white border-red-500',
      'atrisk': 'bg-amber-100 text-amber-700 border-amber-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'hold': 'bg-slate-100 text-slate-600 border-slate-200',
      'cancel': 'bg-red-100 text-red-700 border-red-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="projects-page">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500 mt-1">Manage company projects <span className="font-semibold text-blue-600">{getFilteredProjects().length} projects</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'admin' && (
              <Button onClick={() => setDeleteAllDialogOpen(true)} variant="outline" size="sm" className="text-xs border-red-200 text-red-600 hover:bg-red-50" data-testid="delete-all-projects-btn">
                <Trash2 size={14} className="mr-1" /> Delete All
              </Button>
            )}
            <Button onClick={downloadSampleCSV} variant="outline" size="sm" className="text-xs border-slate-200">
              <Download size={14} className="mr-1" /> Sample CSV
            </Button>
            <input type="file" accept=".csv" onChange={handleCsvImport} id="csv-upload-projects" className="hidden" />
            <Button onClick={() => document.getElementById('csv-upload-projects').click()} variant="outline" size="sm" className="text-xs border-slate-200">
              <Upload size={14} className="mr-1" /> Import
            </Button>
            <Button onClick={openNewDialog} className="bg-slate-900 hover:bg-slate-800 text-xs text-white" size="sm">
              <Plus size={14} className="mr-1" /> Add Project
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input placeholder="Project name..." value={filters.projectName} onChange={(e) => setFilters({...filters, projectName: e.target.value})} className="border-slate-200 h-9 text-sm" />
            <Input placeholder="Client name..." value={filters.clientName} onChange={(e) => setFilters({...filters, clientName: e.target.value})} className="border-slate-200 h-9 text-sm" />
            <Select value={filters.status || 'active_only'} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger className="border-slate-200 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active_only">Active (Default)</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="border-slate-200 h-9 text-sm" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center"><FolderKanban size={36} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">No projects found</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="hidden md:table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">#</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Project</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Code</th>
                      <th className="hidden lg:table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Client</th>
                      <th className="hidden xl:table-cell text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Team & Hours</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Hours</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((proj, index) => {
                      const empHours = getEmployeeHours(proj.project_code);
                      return (
                        <tr key={proj.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                          <td data-label="#" className="hidden md:table-cell py-3 px-4 text-sm text-slate-400">{index + 1}</td>
                          <td data-label="Project" className="py-3 px-4 font-medium text-sm text-slate-800">{proj.name}</td>
                          <td data-label="Code" className="py-3 px-4 text-sm font-mono text-slate-500">{proj.project_code}</td>
                          <td data-label="Client" className="hidden lg:table-cell py-3 px-4 text-sm text-slate-500">{proj.client_username}</td>
                          <td data-label="Team" className="hidden xl:table-cell py-3 px-4">
                            <div className="space-y-0.5">
                              {Object.entries(empHours).slice(0, 3).map(([empId, hours]) => {
                                const emp = employees.find(e => e.employee_id === empId);
                                return <div key={empId} className="text-xs text-slate-600">{emp?.name || empId}: <span className="font-bold text-blue-600">{hours.toFixed(1)}h</span></div>;
                              })}
                              {Object.keys(empHours).length > 3 && <span className="text-slate-300 text-xs">+{Object.keys(empHours).length - 3} more</span>}
                              {Object.keys(empHours).length === 0 && <span className="text-slate-300 text-xs">No hours</span>}
                            </div>
                          </td>
                          <td data-label="Hours" className="py-3 px-4 font-bold text-sm text-blue-600">{proj.completed_hours.toFixed(1)}h</td>
                          <td data-label="Status" className="py-3 px-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusColor(proj.status)}`}>{proj.status}</span>
                          </td>
                          <td data-label="Actions" className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleView(proj)} className="h-7 w-7 p-0 border-slate-200" title="View"><Eye size={12} /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(proj)} className="h-7 w-7 p-0 border-slate-200" title="Edit"><Edit size={12} /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleSendMail(proj.id)} className="h-7 w-7 p-0 border-blue-200 text-blue-500 hover:bg-blue-50" title="Send Mail" data-testid={`send-mail-${proj.id}`}><Send size={12} /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(proj.id)} className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" title="Delete"><Trash2 size={12} /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-xl lg:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>Project Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Project Code</Label>
                  <Input value={formData.project_code} onChange={(e) => setFormData({ ...formData, project_code: e.target.value })} required />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UIUX">UI/UX</SelectItem>
                      <SelectItem value="Development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input value={formData.client_username} onChange={(e) => setFormData({ ...formData, client_username: e.target.value })} required />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div>
                  <Label>Completed Hours</Label>
                  <Input type="number" step="0.5" value={formData.completed_hours} onChange={(e) => setFormData({ ...formData, completed_hours: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Scope of Work</Label>
                <Textarea value={formData.scope_of_work} onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Platform</Label>
                <Input value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} placeholder="e.g. Web, iOS, Android" data-testid="project-platform" />
              </div>
              <div>
                <Label>POC (Point of Contact)</Label>
                <Input placeholder="Search employee for POC..." value={pocSearch} onChange={(e) => setPocSearch(e.target.value)} data-testid="poc-search" />
                {pocSearch && filteredPocEmployees.length > 0 && (
                  <div className="border rounded-md max-h-32 overflow-y-auto mt-2">
                    {filteredPocEmployees.slice(0, 10).map(emp => (
                      <div key={emp.employee_id} className={`p-2 hover:bg-slate-100 cursor-pointer text-sm ${selectedPoc.includes(emp.employee_id) ? 'bg-blue-50' : ''}`} onClick={() => addPoc(emp.employee_id)}>
                        {emp.name} ({emp.employee_id})
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPoc.map(empId => {
                    const emp = employees.find(e => e.employee_id === empId);
                    return (
                      <Badge key={empId} variant="secondary" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700">
                        {emp ? emp.name : empId}
                        <X size={12} className="cursor-pointer" onClick={() => removePoc(empId)} />
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Timesheet Link</Label>
                <Input type="url" value={formData.timesheet_link} onChange={(e) => setFormData({ ...formData, timesheet_link: e.target.value })} />
              </div>
              <div>
                <Label>Assigned Employees</Label>
                <Input placeholder="Search employee..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
                {employeeSearch && filteredEmployees.length > 0 && (
                  <div className="border rounded-md max-h-32 sm:max-h-40 overflow-y-auto mt-2">
                    {filteredEmployees.slice(0, 10).map(emp => (
                      <div key={emp.employee_id} className={`p-2 hover:bg-slate-100 cursor-pointer text-sm flex items-center justify-between ${emp.status !== 'active' ? 'bg-slate-50' : ''}`} onClick={() => addEmployee(emp.employee_id)}>
                        <span>{emp.name} ({emp.employee_id})</span>
                        {emp.status !== 'active' && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Ex</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEmployees.map(empId => {
                    const emp = employees.find(e => e.employee_id === empId);
                    const isExEmployee = emp?.status !== 'active';
                    return (
                      <Badge key={empId} variant="secondary" className={`flex items-center gap-1 text-xs ${isExEmployee ? 'bg-red-100 text-red-700' : ''}`}>
                        {emp ? emp.name : empId}
                        {isExEmployee && <span className="text-[10px]">(Ex)</span>}
                        <X size={12} className="cursor-pointer" onClick={() => removeEmployee(empId)} />
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog - Project Details with Developer Breakdown */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Project Details</DialogTitle>
            </DialogHeader>
            {viewingProject && (
              <div className="space-y-4">
                {/* Project Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{viewingProject.name}</h3>
                    <p className="text-sm text-blue-600 font-mono">{viewingProject.project_code}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(viewingProject.status)}`}>
                    {viewingProject.status?.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div><p className="text-xs text-slate-400 uppercase tracking-wider">Type</p><p className="font-semibold text-sm text-slate-800">{viewingProject.type || '-'}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase tracking-wider">Client</p><p className="font-semibold text-sm text-slate-800">{viewingProject.client_username || '-'}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase tracking-wider">Start Date</p><p className="font-semibold text-sm text-slate-800">{viewingProject.start_date ? new Date(viewingProject.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase tracking-wider">Total Hours</p><p className="font-bold text-blue-600 text-lg">{viewingProject.completed_hours?.toFixed(1)}h</p></div>
                </div>

                {/* Scope of Work */}
                {viewingProject.scope_of_work && viewingProject.scope_of_work !== 'NULL' && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Scope of Work</p>
                    <p className="text-slate-700">{viewingProject.scope_of_work}</p>
                  </div>
                )}

                {/* Timesheet Link */}
                {viewingProject.timesheet_link && viewingProject.timesheet_link !== 'NULL' && viewingProject.timesheet_link !== 'null' && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Timesheet</p>
                    <a href={viewingProject.timesheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                      {viewingProject.timesheet_link}
                    </a>
                  </div>
                )}

                {/* Developer Hours Breakdown */}
                <div className="border-t pt-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Developer Hours Breakdown</p>
                  {historyLoading ? (
                    <div className="text-center py-4 text-slate-400 text-sm">Loading...</div>
                  ) : projectHistory?.developers?.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {projectHistory.developers.map((dev, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{dev.employee_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${dev.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {dev.status}
                            </span>
                          </div>
                          <span className="font-bold text-blue-600">{dev.total_hours?.toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm">No developer hours recorded</div>
                  )}
                </div>

                {/* Assigned Employees */}
                {viewingProject.assigned_employees?.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Assigned Employees ({viewingProject.assigned_employees.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingProject.assigned_employees.map(empId => {
                        const emp = employees.find(e => e.employee_id === empId);
                        return (
                          <span key={empId} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                            {emp ? emp.name : empId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* View Work History Button */}
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setViewDialogOpen(false);
                      navigate(`/admin/working-hours?project=${viewingProject.project_code}`);
                    }}
                    data-testid="view-work-history-btn"
                  >
                    <Clock size={16} className="mr-2" />
                    View Full Work History
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete All Confirmation Dialog - Admin Only */}
        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                Delete All Projects
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-700 mb-4 text-sm sm:text-base">
                Are you sure you want to delete <strong>ALL {projects.length} projects</strong>?
              </p>
              <p className="text-red-600 text-xs sm:text-sm bg-red-50 p-3 rounded">
                ⚠️ This action cannot be undone. All project data will be permanently deleted.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} data-testid="confirm-delete-all-projects" className="w-full sm:w-auto">
                Yes, Delete All
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
