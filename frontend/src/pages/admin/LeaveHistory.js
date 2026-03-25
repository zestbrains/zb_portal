import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { History, Search, Filter, X, Calendar, CheckCircle, XCircle, AlertCircle, Eye, RefreshCw, Edit, Trash2 } from 'lucide-react';

export default function LeaveHistory({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [editFormData, setEditFormData] = useState({
    from_date: '',
    to_date: '',
    reason: '',
    status: ''
  });
  
  // Filters
  const [filters, setFilters] = useState({
    employee_id: '',
    status: '',
    from_date: '',
    to_date: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    fetchEmployees();
    fetchHistory();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees');
    }
  };

  const fetchHistory = async (filterParams = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterParams.employee_id) params.append('employee_id', filterParams.employee_id);
      if (filterParams.status) params.append('status', filterParams.status);
      if (filterParams.from_date) params.append('from_date', filterParams.from_date);
      if (filterParams.to_date) params.append('to_date', filterParams.to_date);
      
      const queryString = params.toString();
      const url = `/leaves/history${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      setApplications(response.data);
    } catch (error) {
      toast.error('Error fetching leave history');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const activeFilters = {};
    if (filters.employee_id) activeFilters.employee_id = filters.employee_id;
    if (filters.status) activeFilters.status = filters.status;
    if (filters.from_date) activeFilters.from_date = filters.from_date;
    if (filters.to_date) activeFilters.to_date = filters.to_date;
    
    setAppliedFilters(activeFilters);
    fetchHistory(activeFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      employee_id: '',
      status: '',
      from_date: '',
      to_date: ''
    });
    setAppliedFilters({});
    fetchHistory({});
  };

  const handleOpenEdit = (app) => {
    setEditApp(app);
    setEditFormData({
      from_date: app.from_date,
      to_date: app.to_date,
      reason: app.reason,
      status: app.status
    });
  };

  const handleAdminEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/leaves/applications/${editApp.id}/admin-edit`, editFormData);
      toast.success('Leave application updated');
      setEditApp(null);
      fetchHistory(appliedFilters);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating application');
    }
  };

  const handleAdminDelete = async (appId, empName) => {
    if (!window.confirm(`Are you sure you want to delete leave application for ${empName}?`)) {
      return;
    }
    try {
      await api.delete(`/leaves/applications/${appId}/admin-delete`);
      toast.success('Leave application deleted');
      fetchHistory(appliedFilters);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting application');
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.employee_id === empId);
    return emp ? emp.name : empId;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle size={14} className="text-green-500" />;
      case 'rejected': return <XCircle size={14} className="text-red-500" />;
      default: return <AlertCircle size={14} className="text-yellow-500" />;
    }
  };

  const hasActiveFilters = Object.keys(appliedFilters).length > 0;

  // Stats
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="leave-history-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leave History</h1>
          <p className="text-gray-600">Complete history of all leave applications with advanced filters</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <History size={24} />
                <div>
                  <p className="text-sm opacity-80">Total Applications</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <div>
                  <p className="text-sm opacity-80">Pending</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <p className="text-sm opacity-80">Approved</p>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle size={24} />
                <div>
                  <p className="text-sm opacity-80">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter size={20} />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <Label htmlFor="employee-filter">Employee</Label>
                <Select 
                  value={filters.employee_id || 'all'} 
                  onValueChange={(value) => setFilters({ ...filters, employee_id: value === 'all' ? '' : value })}
                >
                  <SelectTrigger id="employee-filter" data-testid="employee-filter">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.employee_id} value={emp.employee_id}>
                        {emp.name} ({emp.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select 
                  value={filters.status || 'all'} 
                  onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
                >
                  <SelectTrigger id="status-filter" data-testid="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="from-date-filter">From Date</Label>
                <Input
                  id="from-date-filter"
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                  data-testid="from-date-filter"
                />
              </div>
              <div>
                <Label htmlFor="to-date-filter">To Date</Label>
                <Input
                  id="to-date-filter"
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                  data-testid="to-date-filter"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} className="flex-1" data-testid="apply-filters-btn">
                  <Search size={16} className="mr-2" />
                  Apply
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClearFilters} data-testid="clear-filters-btn">
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span>Active Filters:</span>
                {appliedFilters.employee_id && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Employee: {getEmployeeName(appliedFilters.employee_id)}
                  </span>
                )}
                {appliedFilters.status && (
                  <span className={`px-2 py-1 rounded ${getStatusBadge(appliedFilters.status)}`}>
                    Status: {appliedFilters.status}
                  </span>
                )}
                {appliedFilters.from_date && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    From: {formatDate(appliedFilters.from_date)}
                  </span>
                )}
                {appliedFilters.to_date && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                    To: {formatDate(appliedFilters.to_date)}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History size={20} />
                Leave Applications ({applications.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => fetchHistory(appliedFilters)}>
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <History size={48} className="mx-auto mb-4 opacity-50" />
                <p>No leave applications found</p>
                {hasActiveFilters && (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Applied On</th>
                      <th>Leave Period</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Leave Types</th>
                      <th>Action By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div className="font-semibold">{getEmployeeName(app.employee_id)}</div>
                          <div className="text-xs text-gray-500">{app.employee_id}</div>
                        </td>
                        <td className="text-sm">{formatDate(app.created_at)}</td>
                        <td>
                          <div className="text-sm">
                            {formatDate(app.from_date)}
                          </div>
                          <div className="text-xs text-gray-500">
                            to {formatDate(app.to_date)}
                          </div>
                        </td>
                        <td className="font-semibold">{app.days_count}</td>
                        <td className="max-w-xs">
                          <div className="truncate text-sm" title={app.reason}>
                            {app.reason}
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(app.status)}`}>
                            {getStatusIcon(app.status)}
                            {app.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {app.leave_dates && app.leave_dates.length > 0 ? (
                            <div className="text-xs space-y-1">
                              {app.leave_dates.slice(0, 2).map((ld, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    ld.leave_type.includes('PL') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {ld.leave_type}
                                  </span>
                                </div>
                              ))}
                              {app.leave_dates.length > 2 && (
                                <span className="text-gray-500">+{app.leave_dates.length - 2} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-sm">
                          {app.approved_by ? (
                            <div>
                              <div>{app.approved_by}</div>
                              <div className="text-xs text-gray-500">{formatDate(app.approved_date)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedApp(app)}
                              data-testid={`view-details-${app.id}`}
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenEdit(app)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleAdminDelete(app.id, getEmployeeName(app.employee_id))}
                            >
                              <Trash2 size={14} />
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

        {/* Detail Dialog */}
        {selectedApp && (
          <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Leave Application Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(selectedApp.status)}`}>
                    {getStatusIcon(selectedApp.status)}
                    {selectedApp.status.toUpperCase()}
                  </span>
                </div>

                {/* Application Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Application Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>Employee:</strong> {getEmployeeName(selectedApp.employee_id)}</div>
                    <div><strong>Employee ID:</strong> {selectedApp.employee_id}</div>
                    <div><strong>Applied On:</strong> {formatDate(selectedApp.created_at)}</div>
                    <div><strong>Total Days:</strong> {selectedApp.days_count}</div>
                    <div><strong>From Date:</strong> {formatDate(selectedApp.from_date)}</div>
                    <div><strong>To Date:</strong> {formatDate(selectedApp.to_date)}</div>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Employee's Reason</h3>
                  <p className="text-gray-700">{selectedApp.reason}</p>
                </div>

                {/* Leave Types (if approved) */}
                {selectedApp.leave_dates && selectedApp.leave_dates.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-3">Approved Leave Types</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedApp.leave_dates.map((ld, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-sm">{formatDate(ld.date)}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            ld.leave_type.includes('PL') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {ld.leave_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedApp.status === 'rejected' && selectedApp.reject_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-red-800">Rejection Reason</h3>
                        <p className="text-red-700 mt-1">{selectedApp.reject_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Comments */}
                {selectedApp.comments && selectedApp.status !== 'rejected' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Admin Comments</h3>
                    <p className="text-gray-700">{selectedApp.comments}</p>
                  </div>
                )}

                {/* Action Details */}
                {selectedApp.approved_by && (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-semibold mb-2">Action Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><strong>Processed By:</strong> {selectedApp.approved_by}</div>
                      <div><strong>Processed On:</strong> {formatDate(selectedApp.approved_date)}</div>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <Button variant="outline" onClick={() => setSelectedApp(null)} className="w-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {editApp && (
          <Dialog open={!!editApp} onOpenChange={() => setEditApp(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit size={20} />
                  Edit Leave Application - {getEmployeeName(editApp.employee_id)}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdminEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-from-date">From Date</Label>
                    <Input
                      id="edit-from-date"
                      type="date"
                      value={editFormData.from_date}
                      onChange={(e) => setEditFormData({ ...editFormData, from_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-to-date">To Date</Label>
                    <Input
                      id="edit-to-date"
                      type="date"
                      value={editFormData.to_date}
                      onChange={(e) => setEditFormData({ ...editFormData, to_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editFormData.status} onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-reason">Reason</Label>
                  <Textarea
                    id="edit-reason"
                    value={editFormData.reason}
                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Update Application
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
