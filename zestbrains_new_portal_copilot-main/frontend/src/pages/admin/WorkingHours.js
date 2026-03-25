import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Download, Eye, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';

export default function AdminWorkingHours({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFromUrl = searchParams.get('project') || '';
  const [summary, setSummary] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    project_code: '',
    hours: '',
    work_details: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editFormData, setEditFormData] = useState({
    project_code: '',
    hours: '',
    work_details: '',
    date: ''
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: '',
    employee: '',
    employeeStatus: 'active',  // Default to active employees
    search: '',
    project: projectFromUrl  // Add project filter from URL
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchSummary();
    fetchDepartments();
    fetchEmployees();
    fetchProjects();
  }, [filters.startDate, filters.endDate, filters.department, filters.employee, filters.employeeStatus, filters.project, pagination.page]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.department && filters.department !== 'all') params.append('department_id', filters.department);
      if (filters.employee && filters.employee !== 'all') params.append('employee_id', filters.employee);
      if (filters.project) params.append('project_code', filters.project);
      params.append('employee_status', filters.employeeStatus);
      params.append('page', pagination.page.toString());
      params.append('page_size', pagination.pageSize.toString());

      const response = await api.get(`/work-entries/detailed-summary?${params.toString()}`);
      setSummary(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        totalCount: response.data.pagination?.total_count || 0,
        totalPages: response.data.pagination?.total_pages || 0
      }));
    } catch (error) {
      toast.error('Error fetching working hours');
      setSummary([]);
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

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?status=active');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees');
    }
  };

  // Filter employees based on selected department
  const getFilteredEmployees = () => {
    if (!filters.department || filters.department === 'all') {
      return employees;
    }
    
    // Get department name for the selected ID
    const selectedDept = departments.find(d => d.id === filters.department);
    if (!selectedDept) return employees;
    
    // Find all department IDs with the same name (to handle duplicates like Android)
    const matchingDeptIds = departments
      .filter(d => d.name === selectedDept.name)
      .map(d => d.id);
    
    // Filter employees who belong to any of the matching departments
    return employees.filter(emp => 
      matchingDeptIds.includes(emp.department_id) ||
      (emp.department_ids && emp.department_ids.some(id => matchingDeptIds.includes(id)))
    );
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects');
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      await api.post('/work-entries/admin', {
        ...formData,
        hours: parseFloat(formData.hours)
      });
      toast.success('Work entry added successfully');
      setAddDialogOpen(false);
      setFormData({
        employee_id: '',
        project_code: '',
        hours: '',
        work_details: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adding work entry');
    }
  };

  const handleEditEntry = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/work-entries/${editingEntry.id}`, {
        ...editFormData,
        hours: parseFloat(editFormData.hours)
      });
      toast.success('Work entry updated successfully');
      setEditDialogOpen(false);
      setEditingEntry(null);
      fetchSummary();
      // Refresh view dialog if open
      if (viewingEntry) {
        const updatedEntry = summary.find(s => s.employee_id === viewingEntry.employee_id && s.date === viewingEntry.date);
        if (updatedEntry) setViewingEntry(updatedEntry);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating work entry');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await api.delete('/work-entries');
      toast.success(response.data.message);
      setDeleteAllDialogOpen(false);
      fetchSummary();
    } catch (error) {
      toast.error('Error deleting all work entries');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (window.confirm('Delete this work entry?')) {
      try {
        await api.delete(`/work-entries/${entryId}`);
        toast.success('Work entry deleted');
        fetchSummary();
        // Close view dialog if the deleted entry was being viewed
        if (viewDialogOpen) {
          setViewDialogOpen(false);
          setViewingEntry(null);
        }
      } catch (error) {
        toast.error('Error deleting work entry');
      }
    }
  };

  // Delete all entries for a specific employee on a specific date
  const handleDeleteDateEntries = async (entry) => {
    const projectCount = entry.projects.length;
    const totalHours = entry.total_hours.toFixed(1);
    
    if (window.confirm(`Delete all ${projectCount} work entries for ${entry.employee_name} on ${entry.date}?\n\nTotal hours: ${totalHours}h\n\nThis action cannot be undone.`)) {
      try {
        // Delete all entries for this employee on this date
        for (const proj of entry.projects) {
          if (proj.id) {
            await api.delete(`/work-entries/${proj.id}`);
          }
        }
        toast.success(`Deleted ${projectCount} work entries (${totalHours}h)`);
        fetchSummary();
      } catch (error) {
        toast.error('Error deleting work entries');
      }
    }
  };

  const openEditDialog = (entry, projectData) => {
    setEditingEntry({ id: entry.id, ...projectData });
    setEditFormData({
      project_code: projectData.project_code,
      hours: projectData.hours.toString(),
      work_details: projectData.work_details,
      date: entry.date
    });
    setEditDialogOpen(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/work-entries/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        console.error('Import errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} rows had errors. Check console.`);
      }
      fetchSummary();
    } catch (error) {
      toast.error('Error importing work entries');
    }
  };

  const handleView = (entry) => {
    setViewingEntry(entry);
    setViewDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const response = await api.get(`/work-entries/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'work_entries_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch (error) {
      toast.error('Error exporting data');
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `employee_id,date,project_code,hours,work_details
102,2026-02-20,${projects[0]?.project_code || 'project_code_here'},4.5,Worked on frontend development
102,2026-02-20,${projects[1]?.project_code || 'project_code_here'},3.5,Worked on backend API`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work_entry_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.info('Note: Use project_code (not project_id) from your projects list');
  };

  const getFilteredSummary = () => {
    let filtered = summary;
    
    // Filter by project code from URL
    if (filters.project) {
      filtered = filtered.filter(entry =>
        entry.projects.some(p => p.project_code === filters.project)
      );
    }
    
    // Filter by search term
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.employee_name.toLowerCase().includes(search) ||
        entry.employee_id.toLowerCase().includes(search) ||
        entry.projects.some(p => p.project_name.toLowerCase().includes(search) || p.project_code.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  };

  const filteredSummary = getFilteredSummary();

  // Get work entry ID from the raw data
  const getWorkEntryId = async (employeeId, projectCode, date) => {
    try {
      const response = await api.get(`/work-entries?employee_id=${employeeId}&date=${date}`);
      const entry = response.data.find(e => e.project_code === projectCode);
      return entry?.id;
    } catch (error) {
      return null;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="working-hours-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Working Hours</h1>
            <p className="text-sm sm:text-base text-gray-600">Track employee work hours and project time</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === 'admin' && (
              <Button onClick={() => setDeleteAllDialogOpen(true)} variant="destructive" size="sm" className="text-xs sm:text-sm" data-testid="delete-all-hours-btn">
                <Trash2 size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Delete All</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            )}
            <Button onClick={downloadSampleCSV} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Sample</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              id="csv-upload-work"
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('csv-upload-work').click()}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Upload size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              Import
            </Button>
            <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700" size="sm">
              <Download size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700" size="sm">
              <Plus size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              Add
            </Button>
          </div>
        </div>

        {/* Employee Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={filters.employeeStatus === 'active' ? 'default' : 'outline'}
            onClick={() => { setFilters({...filters, employeeStatus: 'active'}); setPagination(p => ({...p, page: 1})); }}
            data-testid="tab-active-employees"
            size="sm"
            className="text-xs sm:text-sm"
          >
            Active
          </Button>
          <Button
            variant={filters.employeeStatus === 'ex-employee' ? 'default' : 'outline'}
            onClick={() => { setFilters({...filters, employeeStatus: 'ex-employee'}); setPagination(p => ({...p, page: 1})); }}
            data-testid="tab-ex-employees"
            size="sm"
            className="text-xs sm:text-sm"
          >
            Ex-Employees
          </Button>
          <Button
            variant={filters.employeeStatus === 'all' ? 'default' : 'outline'}
            onClick={() => { setFilters({...filters, employeeStatus: 'all'}); setPagination(p => ({...p, page: 1})); }}
            data-testid="tab-all-employees"
            size="sm"
            className="text-xs sm:text-sm"
          >
            All
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            {/* Project Filter Banner */}
            {filters.project && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-sm text-indigo-700">
                    Showing work hours for project: <strong>{filters.project}</strong>
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setFilters({...filters, project: ''});
                    setSearchParams({});
                  }}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-100"
                >
                  Clear Filter
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => { setFilters({...filters, startDate: e.target.value}); setPagination(p => ({...p, page: 1})); }}
              />
              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => { setFilters({...filters, endDate: e.target.value}); setPagination(p => ({...p, page: 1})); }}
              />
              <Select value={filters.department || undefined} onValueChange={(value) => { 
                setFilters({...filters, department: value, employee: 'all'}); // Reset employee when department changes
                setPagination(p => ({...p, page: 1})); 
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.employee || undefined} onValueChange={(value) => { setFilters({...filters, employee: value}); setPagination(p => ({...p, page: 1})); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {getFilteredEmployees().map(emp => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading working hours...</div>
            ) : filteredSummary.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No work entries found.</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Employee Name</th>
                      <th>Projects & Hours</th>
                      <th>Total Hours</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.map((entry, index) => (
                      <tr key={`${entry.employee_id}-${entry.date}`}>
                        <td>{index + 1}</td>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="font-semibold">{entry.employee_name}</td>
                        <td>
                          <div className="space-y-1">
                            {entry.projects.map((proj, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{proj.project_name}</span> - <span className="text-blue-600 font-semibold">{proj.hours}h</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="font-bold text-lg">{entry.total_hours.toFixed(1)}h</td>
                        <td>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleView(entry)} title="View Details">
                              <Eye size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleDeleteDateEntries(entry)}
                              title={`Delete all ${entry.projects.length} entries for this date`}
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
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total entries)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-xl lg:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Work Entry Details</DialogTitle>
            </DialogHeader>
            {viewingEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><strong>Employee:</strong> {viewingEntry.employee_name}</div>
                  <div><strong>Employee ID:</strong> {viewingEntry.employee_id}</div>
                  <div><strong>Date:</strong> {new Date(viewingEntry.date).toLocaleDateString()}</div>
                  <div><strong>Total Hours:</strong> <span className="text-blue-600 font-bold">{viewingEntry.total_hours}h</span></div>
                </div>
                <div>
                  <strong className="text-sm">Project Details:</strong>
                  <div className="mt-2 space-y-2 sm:space-y-3">
                    {viewingEntry.projects.map((proj, idx) => (
                      <div key={idx} className="p-2.5 sm:p-3 bg-gray-50 rounded-lg border">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <div>
                            <div className="font-semibold text-sm">{proj.project_name}</div>
                            <div className="text-xs text-gray-600">{proj.project_code}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-base sm:text-lg font-bold text-blue-600">{proj.hours}h</div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="p-1.5"
                              onClick={async () => {
                                const entryId = await getWorkEntryId(viewingEntry.employee_id, proj.project_code, viewingEntry.date);
                                if (entryId) {
                                  openEditDialog({ id: entryId, date: viewingEntry.date }, proj);
                                }
                              }}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="p-1.5"
                              onClick={async () => {
                                const entryId = await getWorkEntryId(viewingEntry.employee_id, proj.project_code, viewingEntry.date);
                                if (entryId) handleDeleteEntry(entryId);
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-700">
                          <strong>Work Details:</strong>
                          <div className="mt-1 whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ 
                            __html: (proj.work_details || '').replace(/&nbsp;/g, ' ').replace(/\n/g, '<br/>') 
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Hours Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Working Hours</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={formData.employee_id} onValueChange={(value) => setFormData({...formData, employee_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.employee_id} value={emp.employee_id}>
                          {emp.name} ({emp.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select value={formData.project_code} onValueChange={(value) => setFormData({...formData, project_code: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(proj => (
                        <SelectItem key={proj.project_code} value={proj.project_code}>
                          {proj.name} ({proj.project_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.hours}
                    onChange={(e) => setFormData({...formData, hours: e.target.value})}
                    placeholder="Enter hours"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Work Details</Label>
                <Textarea
                  value={formData.work_details}
                  onChange={(e) => setFormData({...formData, work_details: e.target.value})}
                  rows={3}
                  placeholder="Describe the work completed..."
                  required
                />
              </div>
              <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Note:</strong> Multiple entries per day for different projects are allowed.
                </p>
              </div>
              <Button type="submit" className="w-full">
                Add Work Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Hours Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Working Hours</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>Project</Label>
                  <Select value={editFormData.project_code} onValueChange={(value) => setEditFormData({...editFormData, project_code: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(proj => (
                        <SelectItem key={proj.project_code} value={proj.project_code}>
                          {proj.name} ({proj.project_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editFormData.hours}
                    onChange={(e) => setEditFormData({...editFormData, hours: e.target.value})}
                    placeholder="Enter hours"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Work Details</Label>
                <Textarea
                  value={editFormData.work_details}
                  onChange={(e) => setEditFormData({...editFormData, work_details: e.target.value})}
                  rows={3}
                  placeholder="Describe the work completed..."
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Update Work Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete All Confirmation Dialog - Admin Only */}
        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                Delete All Working Hours
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-4 text-sm sm:text-base">
                Are you sure you want to delete <strong>ALL working hours entries</strong>?
              </p>
              <p className="text-red-600 text-xs sm:text-sm bg-red-50 p-3 rounded">
                ⚠️ This action cannot be undone. All work entries will be permanently deleted.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} data-testid="confirm-delete-all-hours" className="w-full sm:w-auto">
                Yes, Delete All
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
