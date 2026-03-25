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
      await api.put(`/leaves/applications/${editApp.id}/admin-edit`, editFormData);
      toast.success('Leave application updated');
      setEditApp(null);
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
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const ApplicationsTable = ({ apps, showActions = false }) => (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>From Date</th>
            <th>To Date</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-8 text-gray-500">
                No applications found
              </td>
            </tr>
          ) : (
            apps.map((app) => (
              <tr key={app.id}>
                <td>
                  <div className="font-semibold">{getEmployeeName(app.employee_id)}</div>
                  <div className="text-xs text-gray-500">{app.employee_id}</div>
                </td>
                <td>{formatDate(app.from_date)}</td>
                <td>{formatDate(app.to_date)}</td>
                <td>
                  {app.days_count}
                  {app.leave_dates_input && app.leave_dates_input.some(ld => ld.day_type !== 'full') && (
                    <span className="ml-1 text-xs text-orange-600" title="Includes half day(s)">*</span>
                  )}
                </td>
                <td className="max-w-xs truncate" title={app.reason}>{app.reason}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {showActions ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleOpenApproval(app)}
                      >
                        <CheckCircle size={16} className="mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenReject(app)}
                      >
                        <XCircle size={16} className="mr-1" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(app)}
                      >
                        <Edit size={14} className="mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAdminDelete(app.id, getEmployeeName(app.employee_id))}
                      >
                        <Trash2 size={14} className="mr-1" /> Delete
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
      <div className="p-8" data-testid="leave-approval-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leave Approval</h1>
          <p className="text-gray-600">Manage employee leave applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} />
                <div>
                  <p className="text-sm opacity-80">Pending</p>
                  <p className="text-2xl font-bold">{pendingApps.length}</p>
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
                  <p className="text-2xl font-bold">{approvedApps.length}</p>
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
                  <p className="text-2xl font-bold">{rejectedApps.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <History size={24} />
                <div>
                  <p className="text-sm opacity-80">Total</p>
                  <p className="text-2xl font-bold">{allApplications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg" data-testid="leave-approval-card">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start border-b rounded-none px-6 py-3 bg-gray-50">
                <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-100">
                  Pending ({pendingApps.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-green-100">
                  Approved ({approvedApps.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-red-100">
                  Rejected ({rejectedApps.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="p-6">
                <ApplicationsTable apps={pendingApps} showActions={true} />
              </TabsContent>

              <TabsContent value="approved" className="p-6">
                <ApplicationsTable apps={approvedApps} showActions={false} />
              </TabsContent>

              <TabsContent value="rejected" className="p-6">
                <ApplicationsTable apps={rejectedApps} showActions={false} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
                <div className="p-4 bg-gray-50 rounded-lg">
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
                  <p className="text-sm text-gray-500 mb-3">Select the leave type for each date. Use "Rejected" to reject specific dates with a reason.</p>
                  
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
                <div className="p-4 bg-gray-50 rounded-lg">
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
