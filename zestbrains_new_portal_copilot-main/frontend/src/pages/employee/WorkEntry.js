import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Calendar, FolderKanban, Edit, Lock, Plus, Filter, ChevronLeft, ChevronRight, Trash2, Eye, X, AlertCircle, History, CheckCircle, XCircle } from 'lucide-react';

export default function EmployeeWorkEntry({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEntries, setViewingEntries] = useState([]);
  const [viewingDate, setViewingDate] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Date Filter
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: ''
  });
  
  const [formData, setFormData] = useState({
    project_code: '',
    hours: '',
    work_details: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editFormData, setEditFormData] = useState({
    project_code: '',
    hours: '',
    work_details: ''
  });
  
  // New state for multi-entry edit modal
  const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [editingDateEntries, setEditingDateEntries] = useState([]);
  
  // Pending approvals state
  const [pendingApprovals, setPendingApprovals] = useState([]);
  
  // All approval requests (for history view)
  const [allApprovalRequests, setAllApprovalRequests] = useState([]);
  const [approvalTab, setApprovalTab] = useState('pending'); // 'pending' or 'history'

  // Get today's date in IST timezone
  const getTodayIST = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const istTime = new Date(utcTime + istOffset);
    return istTime.toISOString().split('T')[0];
  };
  
  // Calculate date limits for work entry (last 2 days + today)
  const getMinDate = () => {
    const date = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const istDate = new Date(utcTime + istOffset);
    // Go back 2 days
    istDate.setDate(istDate.getDate() - 2);
    return istDate.toISOString().split('T')[0];
  };
  
  const today = getTodayIST();

  useEffect(() => {
    // Check for project filter in URL
    const projectParam = searchParams.get('project');
    if (projectParam) {
      setProjectFilter(projectParam);
    }
    fetchProjects();
    fetchEntries();
    fetchPendingApprovals();
    fetchAllApprovalRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, dateFilter, projectFilter]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
      const assigned = response.data.filter(p => 
        p.assigned_employees && p.assigned_employees.length > 0
      );
      setAssignedProjects(assigned);
    } catch (error) {
      console.error('Error fetching projects');
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await api.get('/work-entries');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries');
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/weekend-approvals/my-pending');
      setPendingApprovals(response.data || []);
    } catch (error) {
      console.error('Error fetching pending approvals');
    }
  };

  const fetchAllApprovalRequests = async () => {
    try {
      const response = await api.get('/weekend-approvals/employee/my-requests');
      setAllApprovalRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching approval requests');
    }
  };

  const applyFilters = () => {
    let filtered = [...entries];
    
    // Apply project filter
    if (projectFilter) {
      filtered = filtered.filter(e => e.project_code === projectFilter);
    }
    
    if (dateFilter.from_date) {
      filtered = filtered.filter(e => e.date >= dateFilter.from_date);
    }
    if (dateFilter.to_date) {
      filtered = filtered.filter(e => e.date <= dateFilter.to_date);
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setFilteredEntries(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDateFilter({ from_date: '', to_date: '' });
    setProjectFilter('');
    setSearchParams({});
  };

  const clearProjectFilter = () => {
    setProjectFilter('');
    setSearchParams({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/work-entries', {
        ...formData,
        hours: parseFloat(formData.hours)
      });
      
      // Check if it's a weekend/holiday approval
      if (response.data.status === 'pending_approval') {
        toast.success(response.data.message, {
          description: 'Your work entry will be added after admin approval.',
          duration: 5000
        });
        // Refresh pending approvals to show the new entry
        fetchPendingApprovals();
      } else {
        toast.success('Work entry added successfully');
      }
      
      setFormData({
        project_code: '',
        hours: '',
        work_details: '',
        date: new Date().toISOString().split('T')[0]
      });
      setAddDialogOpen(false);
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adding work entry');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      project_code: entry.project_code,
      hours: entry.hours.toString(),
      work_details: entry.work_details
    });
    setEditDialogOpen(true);
  };

  // New: Handle edit for all entries of a date
  const handleEditDate = (date, entries) => {
    setEditingDate(date);
    setEditingDateEntries(entries.map(e => ({
      ...e,
      hours: e.hours.toString(),
      isModified: false
    })));
    setEditDateDialogOpen(true);
  };

  // New: Update a single entry in the date edit modal
  const updateEntryInModal = (entryId, field, value) => {
    setEditingDateEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, [field]: value, isModified: true } : e
    ));
  };

  // New: Save all modified entries from date edit modal
  const handleSaveAllEntries = async () => {
    try {
      const modifiedEntries = editingDateEntries.filter(e => e.isModified);
      
      for (const entry of modifiedEntries) {
        await api.put(`/work-entries/employee/${entry.id}`, {
          project_code: entry.project_code,
          hours: parseFloat(entry.hours),
          work_details: entry.work_details
        });
      }
      
      toast.success(`Updated ${modifiedEntries.length} work entries`);
      setEditDateDialogOpen(false);
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating work entries');
    }
  };

  // New: Delete entry from date edit modal
  const handleDeleteFromModal = async (entryId, projectName) => {
    if (!window.confirm(`Delete entry for "${projectName}"?`)) return;
    
    try {
      await api.delete(`/work-entries/employee/${entryId}`);
      setEditingDateEntries(prev => prev.filter(e => e.id !== entryId));
      toast.success('Entry deleted');
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting entry');
    }
  };

  // Check if date is editable (today or future in IST)
  const isEditable = (dateStr) => {
    const todayIST = getTodayIST();
    return dateStr >= todayIST;
  };

  // Handle editing pending approval
  const handleEditPendingApproval = async (approval) => {
    const newHours = prompt(`Edit hours for ${getProjectName(approval.project_code)} on ${formatDate(approval.original_date)}:`, approval.original_hours);
    if (newHours === null) return;
    
    try {
      await api.put(`/weekend-approvals/employee/${approval.id}`, {
        hours: parseFloat(newHours)
      });
      toast.success('Pending request updated');
      fetchPendingApprovals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating request');
    }
  };

  // Handle deleting pending approval
  const handleDeletePendingApproval = async (approval) => {
    if (!window.confirm(`Delete pending request for ${getProjectName(approval.project_code)} on ${formatDate(approval.original_date)}?`)) return;
    
    try {
      await api.delete(`/weekend-approvals/employee/${approval.id}`);
      toast.success('Pending request deleted');
      fetchPendingApprovals();
      fetchAllApprovalRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting request');
    }
  };

  // Handle deleting from approval history (approved/rejected)
  const handleDeleteApprovalHistory = async (approval) => {
    const statusText = approval.status === 'approved' ? 'approved' : 'rejected';
    if (!window.confirm(`Delete ${statusText} entry for ${getProjectName(approval.project_code)} on ${formatDate(approval.original_date)}?\n\n${approval.status === 'approved' ? 'This will also remove the associated work hours.' : ''}`)) return;
    
    try {
      await api.delete(`/weekend-approvals/employee/${approval.id}`);
      toast.success('Entry deleted from history');
      fetchAllApprovalRequests();
      fetchEntries(); // Refresh work entries if it was approved
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting entry');
    }
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/work-entries/employee/${editingEntry.id}`, {
        ...editFormData,
        hours: parseFloat(editFormData.hours)
      });
      toast.success('Work entry updated successfully');
      setEditDialogOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating work entry');
    }
  };

  const handleDelete = async (entryId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete the entry for "${projectName}"?`)) {
      return;
    }
    try {
      await api.delete(`/work-entries/employee/${entryId}`);
      toast.success('Work entry deleted successfully');
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting work entry');
    }
  };

  const handleViewEntries = (entries, date) => {
    setViewingEntries(entries);
    setViewingDate(date);
    setViewDialogOpen(true);
  };

  const isToday = (dateStr) => {
    return dateStr === today;
  };

  // Group entries by date (like Admin view)
  const groupEntriesByDate = (entriesList) => {
    const grouped = {};
    entriesList.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = {
          date: entry.date,
          entries: [],
          totalHours: 0
        };
      }
      grouped[entry.date].entries.push(entry);
      grouped[entry.date].totalHours += entry.hours;
    });
    // Convert to array and sort by date descending
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupedEntries = groupEntriesByDate(filteredEntries);
  
  // Pagination calculations (now based on grouped entries - one row per date)
  const totalPages = Math.ceil(groupedEntries.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGroups = groupedEntries.slice(startIndex, endIndex);

  // Stats
  const todayEntries = entries.filter(e => e.date === today);
  const totalHoursToday = todayEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalHoursFiltered = filteredEntries.reduce((sum, e) => sum + e.hours, 0);

  const getProjectName = (projectCode) => {
    const project = projects.find(p => p.project_code === projectCode);
    return project ? project.name : projectCode || 'Unknown Project';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format projects for display (e.g., "Project A - 3h, Project B - 2h")
  const formatProjectsDisplay = (entriesForDate) => {
    return entriesForDate.map(entry => 
      `${getProjectName(entry.project_code)} - ${entry.hours}h`
    ).join(', ');
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="work-entry-page">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Working Hours</h1>
            <p className="text-gray-600">Log and view your daily work hours</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="add-work-entry-btn">
            <Plus size={18} className="mr-2" />
            Add Working Hours
          </Button>
        </div>

        {/* Project Filter Banner */}
        {projectFilter && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban size={18} className="text-indigo-600" />
              <span className="text-indigo-800">
                Showing hours for: <strong>{getProjectName(projectFilter)}</strong> ({projectFilter})
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearProjectFilter} className="text-indigo-600 hover:text-indigo-800">
              <X size={16} className="mr-1" />
              Clear Filter
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock size={24} />
                <div>
                  <p className="text-sm opacity-80">Today's Hours</p>
                  <p className="text-2xl font-bold">{totalHoursToday.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar size={24} />
                <div>
                  <p className="text-sm opacity-80">{projectFilter ? 'Project Total Hours' : 'Filtered Total Hours'}</p>
                  <p className="text-2xl font-bold">{totalHoursFiltered.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FolderKanban size={24} />
                <div>
                  <p className="text-sm opacity-80">Total Assigned Projects</p>
                  <p className="text-2xl font-bold">{assignedProjects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter size={20} />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateFilter.from_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
                  data-testid="filter-from-date"
                />
              </div>
              <div>
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateFilter.to_date}
                  onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
                  data-testid="filter-to-date"
                />
              </div>
              {(dateFilter.from_date || dateFilter.to_date) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekend/Holiday Approvals Section with Tabs */}
        {(pendingApprovals.length > 0 || allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted').length > 0) && (
          <Card className="shadow-lg mb-6">
            <CardHeader className="border-b pb-0">
              <div className="flex items-center gap-4 mb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle size={20} />
                  Weekend/Holiday Approvals
                </CardTitle>
              </div>
              {/* Tabs */}
              <div className="flex gap-2">
                <Button
                  variant={approvalTab === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setApprovalTab('pending')}
                  className={approvalTab === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  Pending ({pendingApprovals.length})
                </Button>
                <Button
                  variant={approvalTab === 'history' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setApprovalTab('history')}
                  className={approvalTab === 'history' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                >
                  History ({allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted').length})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Pending Tab */}
              {approvalTab === 'pending' && (
                <>
                  {pendingApprovals.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No pending approvals</p>
                  ) : (
                    <>
                      <p className="text-sm text-orange-600 mb-3">
                        These entries are awaiting admin approval. You can edit or delete them.
                      </p>
                      <div className="space-y-2">
                        {pendingApprovals.map((approval) => (
                          <div key={approval.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatDate(approval.original_date)}</span>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Pending</span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">{getProjectName(approval.project_code)}</span>
                                <span className="mx-2">•</span>
                                <span>{approval.original_hours}h</span>
                                {approval.original_work_details && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-gray-500 truncate max-w-xs inline-block align-bottom">{approval.original_work_details}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPendingApproval(approval)}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeletePendingApproval(approval)}
                                className="text-red-600 hover:bg-red-50"
                                data-testid={`delete-pending-${approval.id}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* History Tab */}
              {approvalTab === 'history' && (
                <>
                  {allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted').length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No approval history</p>
                  ) : (
                    <div className="space-y-2">
                      {allApprovalRequests
                        .filter(r => r.status !== 'pending' && r.status !== 'deleted')
                        .map((record) => (
                          <div 
                            key={record.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              record.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{formatDate(record.original_date)}</span>
                                {record.status === 'approved' ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Approved</span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Rejected</span>
                                )}
                                {record.is_compensation && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Compensation</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">{getProjectName(record.project_code)}</span>
                                <span className="mx-2">•</span>
                                <span>{record.status === 'approved' ? (record.approved_hours || record.original_hours) : record.original_hours}h</span>
                                {record.rejection_reason && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-red-600">Reason: {record.rejection_reason}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteApprovalHistory(record)}
                              className="text-red-600 hover:bg-red-50"
                              data-testid={`delete-history-${record.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Work Entries Table - Like Admin View */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Work Entries ({filteredEntries.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label>Show:</Label>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderKanban size={48} className="mx-auto mb-4 opacity-50" />
                <p>No work entries found</p>
                <p className="text-sm">Start logging your work hours</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Projects</th>
                        <th>Total Hours</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGroups.map((group) => {
                        const isTodayEntry = isToday(group.date);
                        return (
                          <tr key={group.date} className={isTodayEntry ? 'bg-blue-50' : ''}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatDate(group.date)}</span>
                                {isTodayEntry && (
                                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Today</span>
                                )}
                              </div>
                            </td>
                            <td className="max-w-md">
                              <div className="flex flex-wrap gap-1">
                                {group.entries.map((entry, idx) => (
                                  <span 
                                    key={entry.id} 
                                    className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
                                    title={entry.work_details}
                                  >
                                    {getProjectName(entry.project_code)} - {entry.hours}h
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className="font-semibold text-blue-600">{group.totalHours}h</span>
                            </td>
                            <td>
                              {isEditable(group.date) ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDate(group.date, group.entries)}
                                  data-testid={`edit-date-${group.date}`}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit size={14} className="mr-1" />
                                  Edit
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-500 hover:text-gray-700"
                                  onClick={() => handleViewEntries(group.entries, group.date)}
                                  data-testid={`view-entries-${group.date}`}
                                >
                                  <Eye size={14} className="mr-1" />
                                  View
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, groupedEntries.length)} of {groupedEntries.length} dates
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Entry Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus size={20} />
                Add Work Entry
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={getMinDate()}
                  required
                  data-testid="work-entry-date-input"
                />
                <p className="text-xs text-gray-500 mt-1">Past dates: last 2 days only. Future dates allowed.</p>
              </div>
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={formData.project_code} onValueChange={(value) => setFormData({ ...formData, project_code: value })}>
                  <SelectTrigger data-testid="work-entry-project-select">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((proj) => (
                      <SelectItem key={proj.project_code} value={proj.project_code}>
                        {proj.name} ({proj.project_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="Enter hours"
                  required
                  data-testid="work-entry-hours-input"
                />
              </div>
              <div>
                <Label htmlFor="work_details">Work Details</Label>
                <Textarea
                  id="work_details"
                  value={formData.work_details}
                  onChange={(e) => setFormData({ ...formData, work_details: e.target.value })}
                  rows={4}
                  required
                  placeholder="Describe the work you completed..."
                  data-testid="work-entry-details-input"
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If you add multiple entries for the same date and project, hours will be accumulated.
                </p>
              </div>
              
              <Button type="submit" className="w-full" data-testid="submit-work-entry-button">
                Add Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Entry Dialog - Single Entry (kept for backward compatibility) */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Work Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEntry} className="space-y-4">
              <div>
                <Label>Project</Label>
                <Select value={editFormData.project_code} onValueChange={(value) => setEditFormData({...editFormData, project_code: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((proj) => (
                      <SelectItem key={proj.project_code} value={proj.project_code}>
                        {proj.name} ({proj.project_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editFormData.hours}
                  onChange={(e) => setEditFormData({...editFormData, hours: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Work Details</Label>
                <Textarea
                  value={editFormData.work_details}
                  onChange={(e) => setEditFormData({...editFormData, work_details: e.target.value})}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Update Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* NEW: Edit All Entries for a Date Modal */}
        <Dialog open={editDateDialogOpen} onOpenChange={setEditDateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit size={20} />
                Edit Work Entries - {formatDate(editingDate)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {editingDateEntries.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No entries to edit</p>
              ) : (
                editingDateEntries.map((entry, idx) => (
                  <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">Project</Label>
                        <Select 
                          value={entry.project_code} 
                          onValueChange={(value) => updateEntryInModal(entry.id, 'project_code', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((proj) => (
                              <SelectItem key={proj.project_code} value={proj.project_code}>
                                {proj.name} ({proj.project_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                        onClick={() => handleDeleteFromModal(entry.id, getProjectName(entry.project_code))}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={entry.hours}
                          onChange={(e) => updateEntryInModal(entry.id, 'hours', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Work Details</Label>
                        <Input
                          value={entry.work_details}
                          onChange={(e) => updateEntryInModal(entry.id, 'work_details', e.target.value)}
                          className="mt-1"
                          placeholder="Work details..."
                        />
                      </div>
                    </div>
                    
                    {entry.isModified && (
                      <span className="text-xs text-orange-600 font-medium">Modified</span>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total: <span className="font-bold text-blue-600">
                  {editingDateEntries.reduce((sum, e) => sum + parseFloat(e.hours || 0), 0).toFixed(1)}h
                </span>
                {editingDateEntries.some(e => e.isModified) && (
                  <span className="ml-2 text-orange-600">
                    ({editingDateEntries.filter(e => e.isModified).length} modified)
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditDateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAllEntries}
                  disabled={!editingDateEntries.some(e => e.isModified)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Entries Dialog (for past dates) */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye size={20} />
                Work Entries - {formatDate(viewingDate)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {viewingEntries.map((entry, idx) => (
                <div key={entry.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{getProjectName(entry.project_code)}</h4>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                      {entry.hours}h
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-700 mb-1">Work Details:</p>
                    <p className="whitespace-pre-wrap bg-white p-2 rounded border">{entry.work_details || 'No details provided'}</p>
                  </div>
                </div>
              ))}
              {viewingEntries.length === 0 && (
                <p className="text-center text-gray-500 py-4">No entries found</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Total: <span className="font-bold text-blue-600">{viewingEntries.reduce((sum, e) => sum + e.hours, 0)}h</span>
              </p>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
