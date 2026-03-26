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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Calendar, History, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';

export default function HRLeaveApproval({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectApp, setRejectApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [leaveDates, setLeaveDates] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [editFormData, setEditFormData] = useState({
    from_date: '',
    to_date: '',
    reason: '',
    status: ''
  });
  const [editLeaveDates, setEditLeaveDates] = useState([]);

  useEffect(() => {
    fetchApplications();
    fetchAllApplications();
    fetchEmployees();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/leaves/applications?status=pending');
      setApplications(response.data);
    } catch (error) {
      toast.error('Error fetching applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllApplications = async () => {
    try {
      const response = await api.get('/leaves/applications');
      setAllApplications(response.data);
    } catch (error) {
      console.error('Error fetching all applications');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees');
    }
  };

  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.employee_id === empId);
    return emp ? emp.name : empId;
  };

  // Generate dates between from_date and to_date with reject_reason field
  const generateDatesForApplication = (app) => {
    const dates = [];
    
    // Check if employee submitted with half-day info
    if (app.leave_dates_input && app.leave_dates_input.length > 0) {
      // Use the employee's submitted dates with day_type
      for (const ld of app.leave_dates_input) {
        let dayTypeLabel = '';
        if (ld.day_type === 'first_half') {
          dayTypeLabel = ' (First Half)';
        } else if (ld.day_type === 'second_half') {
          dayTypeLabel = ' (Second Half)';
        }
        dates.push({
          date: ld.date,
          leave_type: 'PL',
          day_type: ld.day_type,
          day_type_label: dayTypeLabel,
          reject_reason: ''
        });
      }
    } else {
      // Fallback: generate dates from range
      const start = new Date(app.from_date);
      const end = new Date(app.to_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push({
          date: new Date(d).toISOString().split('T')[0],
          leave_type: 'PL',
          day_type: 'full',
          day_type_label: '',
          reject_reason: ''
        });
      }
    }
    return dates;
  };

  const handleOpenApproval = (app) => {
    setSelectedApp(app);
    setLeaveDates(generateDatesForApplication(app));
    setComments('');
  };

  const handleOpenReject = (app) => {
    setRejectApp(app);
    setRejectReason('');
  };

  const handleOpenEdit = (app) => {
    setEditApp(app);
    setEditFormData({
      from_date: app.from_date,
      to_date: app.to_date,
      reason: app.reason,
      status: app.status
    });
    // Populate leave dates for editing if they exist
    if (app.leave_dates && app.leave_dates.length > 0) {
      setEditLeaveDates(app.leave_dates.map(ld => ({
        date: ld.date,
        leave_type: ld.leave_type
      })));
    } else {
      // Generate dates from range if no leave_dates
      const dates = [];
      const start = new Date(app.from_date);
      const end = new Date(app.to_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push({
          date: new Date(d).toISOString().split('T')[0],
          leave_type: 'PL'
        });
      }
      setEditLeaveDates(dates);
    }
  };

  const handleLeaveTypeChange = (index, newType) => {
    const updated = [...leaveDates];
    updated[index].leave_type = newType;
    // Clear reject reason if not rejected
    if (newType !== 'Rejected') {
      updated[index].reject_reason = '';
    }
    setLeaveDates(updated);
  };

  const handleEditLeaveTypeChange = (index, newType) => {
    const updated = [...editLeaveDates];
    updated[index].leave_type = newType;
    setEditLeaveDates(updated);
  };

  const handleRejectReasonChange = (index, reason) => {
    const updated = [...leaveDates];
    updated[index].reject_reason = reason;
    setLeaveDates(updated);
  };

  const handleApprove = async (appId) => {
    // Validate reject reasons for rejected dates
    const rejectedDatesWithoutReason = leaveDates.filter(
      ld => ld.leave_type === 'Rejected' && !ld.reject_reason.trim()
    );
    
    if (rejectedDatesWithoutReason.length > 0) {
      toast.error('Please provide a reject reason for all rejected dates');
      return;
    }
    
    try {
      await api.put(`/leaves/applications/${appId}/approve`, { 
        status: 'approved', 
        comments,
        leave_dates: leaveDates
      });
      toast.success('Leave processed successfully');
      setSelectedApp(null);
      setComments('');
      setLeaveDates([]);
      fetchApplications();
      fetchAllApplications();
    } catch (error) {
      toast.error('Error processing application');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await api.put(`/leaves/applications/${rejectApp.id}/approve`, { 
        status: 'rejected', 
        comments: '',
        reject_reason: rejectReason,
        leave_dates: []
      });
      toast.success('Leave rejected');
      setRejectApp(null);
      setRejectReason('');
      fetchApplications();
      fetchAllApplications();
    } catch (error) {
      toast.error('Error rejecting application');
    }
  };

  const handleAdminEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editFormData,
        leave_dates: editLeaveDates
      };
      await api.put(`/leaves/applications/${editApp.id}/admin-edit`, payload);
      toast.success('Leave application updated');
      setEditApp(null);
      setEditLeaveDates([]);
      fetchApplications();
      fetchAllApplications();
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
      fetchApplications();
      fetchAllApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting application');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate summary of selected leave types
  const getLeaveTypeSummary = () => {
    const summary = { PL: 0, CL: 0, 'Half PL': 0, 'Half CL': 0, 'PL/2 & CL/2': 0, Rejected: 0 };
    leaveDates.forEach(ld => {
      if (summary[ld.leave_type] !== undefined) {
        summary[ld.leave_type]++;
      }
    });
    return summary;
  };

  const pendingApps = allApplications.filter(a => a.status === 'pending');
  const approvedApps = allApplications.filter(a => a.status === 'approved');
  const rejectedApps = allApplications.filter(a => a.status === 'rejected');

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const ApplicationsTable = ({ apps, showActions = false }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Employee</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">From</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">To</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Days</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Reason</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-8 text-slate-400 text-sm">No applications found</td>
            </tr>
          ) : (
            apps.map((app) => (
              <tr key={app.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium text-sm text-slate-800">{getEmployeeName(app.employee_id)}</div>
                  <div className="text-xs text-slate-400">{app.employee_id}</div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{formatDate(app.from_date)}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{formatDate(app.to_date)}</td>
                <td className="py-3 px-4 text-sm font-bold text-slate-800">
                  {app.days_count}
                  {app.leave_dates_input && app.leave_dates_input.some(ld => ld.day_type !== 'full') && (
                    <span className="ml-1 text-xs text-amber-600" title="Includes half day(s)">*</span>
                  )}
                </td>
                <td className="py-3 px-4 max-w-xs"><div className="truncate text-sm text-slate-600" title={app.reason}>{app.reason}</div></td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {showActions ? (
                    <div className="flex gap-1">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => handleOpenApproval(app)}>
                        <CheckCircle size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleOpenReject(app)} className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEdit(app)} className="h-8 text-xs border-slate-200">
                        <Edit size={12} className="mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAdminDelete(app.id, getEmployeeName(app.employee_id))} className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 size={12} className="mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="leave-approval-page">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Leave Approval</h1>
          <p className="text-sm text-slate-500 mt-1">Manage employee leave applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600"><AlertCircle size={20} /></div><div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-amber-600">{pendingApps.length}</p></div></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600"><CheckCircle size={20} /></div><div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Approved</p><p className="text-2xl font-bold text-green-600">{approvedApps.length}</p></div></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-600"><XCircle size={20} /></div><div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected</p><p className="text-2xl font-bold text-red-600">{rejectedApps.length}</p></div></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"><History size={20} /></div><div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p><p className="text-2xl font-bold text-slate-900">{allApplications.length}</p></div></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" data-testid="leave-approval-card">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-200 px-4 pt-3">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({pendingApps.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">
                  Approved ({approvedApps.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">
                  Rejected ({rejectedApps.length})
                </TabsTrigger>
              </TabsList>
              </div>

              <TabsContent value="pending" className="p-0">
                <ApplicationsTable apps={pendingApps} showActions={true} />
              </TabsContent>

              <TabsContent value="approved" className="p-0">
                <ApplicationsTable apps={approvedApps} showActions={false} />
              </TabsContent>

              <TabsContent value="rejected" className="p-0">
                <ApplicationsTable apps={rejectedApps} showActions={false} />
              </TabsContent>
            </Tabs>
        </div>

        {/* Approval Dialog with Per-Date Selection */}
        {selectedApp && (
          <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  Approve Leave - {getEmployeeName(selectedApp.employee_id)}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Application Summary */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>From:</strong> {formatDate(selectedApp.from_date)}</div>
                    <div><strong>To:</strong> {formatDate(selectedApp.to_date)}</div>
                    <div><strong>Days:</strong> {selectedApp.days_count}</div>
                    <div><strong>Status:</strong> Pending</div>
                  </div>
                  <p className="mt-2 text-sm"><strong>Reason:</strong> {selectedApp.reason}</p>
                </div>

                {/* Per-Date Leave Type Selection */}
                <div>
                  <Label className="text-base font-semibold">Set Leave Type for Each Date</Label>
                  <p className="text-sm text-slate-500 mb-3">Select the leave type for each date. Use "Rejected" to reject specific dates with a reason.</p>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                    {leaveDates.map((ld, index) => (
                      <div key={index} className={`p-2 rounded border ${
                        ld.leave_type === 'Rejected' ? 'bg-red-50 border-red-200' : 'bg-white'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            {formatDate(ld.date)}
                            {ld.day_type_label && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                {ld.day_type_label.replace(/[()]/g, '')}
                              </span>
                            )}
                          </span>
                          <Select 
                            value={ld.leave_type} 
                            onValueChange={(value) => handleLeaveTypeChange(index, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PL">PL (Full Day)</SelectItem>
                              <SelectItem value="CL">CL (Full Day)</SelectItem>
                              <SelectItem value="Half PL">Half PL</SelectItem>
                              <SelectItem value="Half CL">Half CL</SelectItem>
                              <SelectItem value="PL/2 & CL/2">PL/2 & CL/2</SelectItem>
                              <SelectItem value="Rejected" className="text-red-600">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {ld.leave_type === 'Rejected' && (
                          <div className="mt-2">
                            <Input
                              placeholder="Rejection reason (required)"
                              value={ld.reject_reason}
                              onChange={(e) => handleRejectReasonChange(index, e.target.value)}
                              className="border-red-300"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary of Selected Types */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Leave Type Summary:</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {Object.entries(getLeaveTypeSummary()).map(([type, count]) => (
                      count > 0 && (
                        <span key={type} className={`px-2 py-1 rounded ${
                          type === 'Rejected' ? 'bg-red-100 text-red-800' :
                          type.includes('PL') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {type}: {count}
                        </span>
                      )
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    placeholder="Add any comments..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setSelectedApp(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedApp.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Process Leave
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        {rejectApp && (
          <Dialog open={!!rejectApp} onOpenChange={() => setRejectApp(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <XCircle size={20} />
                  Reject Leave - {getEmployeeName(rejectApp.employee_id)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm"><strong>Period:</strong> {formatDate(rejectApp.from_date)} - {formatDate(rejectApp.to_date)}</p>
                  <p className="text-sm"><strong>Days:</strong> {rejectApp.days_count}</p>
                  <p className="text-sm"><strong>Employee Reason:</strong> {rejectApp.reason}</p>
                </div>
                <div>
                  <Label htmlFor="rejectReason">Rejection Reason (Required)</Label>
                  <Textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejection..."
                    className="border-red-300"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setRejectApp(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleReject} variant="destructive" className="flex-1">
                    <XCircle size={16} className="mr-2" />
                    Reject Leave
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {editApp && (
          <Dialog open={!!editApp} onOpenChange={() => { setEditApp(null); setEditLeaveDates([]); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                
                {/* Edit Leave Types Section */}
                {editLeaveDates.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Edit Leave Types</Label>
                    <p className="text-sm text-slate-500 mb-3">Modify the leave type for each date</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {editLeaveDates.map((ld, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium text-sm">{formatDate(ld.date)}</span>
                          <Select 
                            value={ld.leave_type} 
                            onValueChange={(value) => handleEditLeaveTypeChange(index, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PL">PL (Full Day)</SelectItem>
                              <SelectItem value="CL">CL (Full Day)</SelectItem>
                              <SelectItem value="Half PL">Half PL</SelectItem>
                              <SelectItem value="Half CL">Half CL</SelectItem>
                              <SelectItem value="PL/2 & CL/2">PL/2 & CL/2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
