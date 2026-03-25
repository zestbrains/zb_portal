import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, Edit, Trash2, Plus, X } from 'lucide-react';

export default function EmployeeLeaveApply({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveDates, setLeaveDates] = useState([{ date: '', day_type: 'full' }]);
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState('apply');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editFormData, setEditFormData] = useState({
    from_date: '',
    to_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchApplications();
    fetchLeaveBalance();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/leaves/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications');
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const response = await api.get('/leaves/my-details');
      setLeaveBalance({
        available_pl: response.data.current_year_available_pl,
        pl_taken: response.data.current_year_pl_taken,
        cl_taken: response.data.current_year_cl_taken
      });
    } catch (error) {
      console.error('Error fetching leave balance');
    }
  };

  const addLeaveDate = () => {
    setLeaveDates([...leaveDates, { date: '', day_type: 'full' }]);
  };

  const removeLeaveDate = (index) => {
    if (leaveDates.length > 1) {
      setLeaveDates(leaveDates.filter((_, i) => i !== index));
    }
  };

  const updateLeaveDate = (index, field, value) => {
    const updated = [...leaveDates];
    updated[index] = { ...updated[index], [field]: value };
    setLeaveDates(updated);
  };

  const calculateTotalDays = () => {
    return leaveDates.reduce((total, ld) => {
      if (ld.date) {
        // first_half or second_half = 0.5, full = 1
        return total + (ld.day_type === 'first_half' || ld.day_type === 'second_half' ? 0.5 : 1);
      }
      return total;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates
    const validDates = leaveDates.filter(ld => ld.date);
    if (validDates.length === 0) {
      toast.error('Please add at least one leave date');
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for leave');
      return;
    }
    
    // Sort dates and get from/to
    const sortedDates = [...validDates].sort((a, b) => new Date(a.date) - new Date(b.date));
    const from_date = sortedDates[0].date;
    const to_date = sortedDates[sortedDates.length - 1].date;
    
    try {
      await api.post('/leaves/apply', {
        from_date,
        to_date,
        reason,
        leave_dates: validDates.map(ld => ({
          date: ld.date,
          day_type: ld.day_type
        }))
      });
      toast.success('Leave application submitted successfully');
      setLeaveDates([{ date: '', day_type: 'full' }]);
      setReason('');
      fetchApplications();
      setActiveTab('applied');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error submitting application');
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const handleEditApplication = (app) => {
    setEditingApp(app);
    setEditFormData({
      from_date: app.from_date,
      to_date: app.to_date,
      reason: app.reason
    });
    setEditDialogOpen(true);
  };

  const handleUpdateApplication = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/leaves/applications/${editingApp.id}`, editFormData);
      toast.success('Leave application updated successfully');
      setEditDialogOpen(false);
      setEditingApp(null);
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating application');
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm('Are you sure you want to delete this leave application?')) {
      return;
    }
    try {
      await api.delete(`/leaves/applications/${appId}`);
      toast.success('Leave application deleted successfully');
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting application');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected': return <XCircle size={16} className="text-red-500" />;
      default: return <AlertCircle size={16} className="text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const ApplicationCard = ({ app, showActions = false }) => (
    <div className="p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-800">
            {formatDate(app.from_date)} - {formatDate(app.to_date)}
          </p>
          <p className="text-sm text-gray-500">{app.days_count} day(s)</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(app.status)}`}>
          {getStatusIcon(app.status)}
          {app.status.toUpperCase()}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-gray-600"><strong>Reason:</strong> {app.reason}</p>
        {app.leave_dates && app.leave_dates.length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <strong>Leave Types by Date:</strong>
            <div className="mt-1 space-y-1">
              {app.leave_dates.map((ld, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{formatDate(ld.date)}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    ld.leave_type.toLowerCase() === 'rejected' 
                      ? 'bg-red-100 text-red-800' 
                      : ld.leave_type.includes('PL') 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                  }`}>
                    {ld.leave_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {app.status === 'rejected' && app.reject_reason && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-red-700">Rejection Reason:</strong>
                <p className="text-red-600 mt-1">{app.reject_reason}</p>
              </div>
            </div>
          </div>
        )}
        {app.comments && app.status !== 'rejected' && (
          <p className="text-gray-600 mt-2 p-2 bg-gray-50 rounded">
            <strong>Admin Comment:</strong> {app.comments}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Applied: {formatDate(app.created_at)}
        </p>
        {showActions && app.status === 'pending' && (
          <div className="mt-3 pt-3 border-t flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEditApplication(app)}
              data-testid={`edit-leave-${app.id}`}
            >
              <Edit size={14} className="mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDeleteApplication(app.id)}
              data-testid={`delete-leave-${app.id}`}
            >
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="leave-apply-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Apply Leave</h1>
          <p className="text-gray-600">Submit leave request and track application status</p>
        </div>

        {/* Leave Balance Cards */}
        {leaveBalance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar size={24} />
                  <div>
                    <p className="text-sm opacity-80">Available PL</p>
                    <p className="text-2xl font-bold">{leaveBalance.available_pl.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock size={24} />
                  <div>
                    <p className="text-sm opacity-80">PL Taken</p>
                    <p className="text-2xl font-bold">{leaveBalance.pl_taken.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar size={24} />
                  <div>
                    <p className="text-sm opacity-80">CL Taken</p>
                    <p className="text-2xl font-bold">{leaveBalance.cl_taken.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="apply" data-testid="apply-tab">
                    <Send size={16} className="mr-2" />
                    Apply Leave
                  </TabsTrigger>
                  <TabsTrigger value="applied" data-testid="applied-tab">
                    <AlertCircle size={16} className="mr-2" />
                    Pending ({pendingApplications.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" data-testid="approved-tab">
                    <CheckCircle size={16} className="mr-2" />
                    Approved ({approvedApplications.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected" data-testid="rejected-tab">
                    <XCircle size={16} className="mr-2" />
                    Rejected ({rejectedApplications.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Apply Leave Tab */}
              <TabsContent value="apply" className="p-6">
                <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Leave Dates</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLeaveDate}
                        className="text-indigo-600"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Date
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {leaveDates.map((ld, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <Input
                              type="date"
                              value={ld.date}
                              onChange={(e) => updateLeaveDate(index, 'date', e.target.value)}
                              required
                              data-testid={`leave-date-input-${index}`}
                            />
                          </div>
                          <div className="w-40">
                            <Select
                              value={ld.day_type}
                              onValueChange={(value) => updateLeaveDate(index, 'day_type', value)}
                            >
                              <SelectTrigger data-testid={`leave-type-select-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full Day</SelectItem>
                                <SelectItem value="first_half">First Half</SelectItem>
                                <SelectItem value="second_half">Second Half</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {leaveDates.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLeaveDate(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X size={18} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-sm text-indigo-800">
                        <strong>Total Days:</strong> {calculateTotalDays()} day(s)
                        <span className="text-xs ml-2 text-indigo-600">
                          (Half days = 0.5, Full days = 1)
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="reason">Reason / Description</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      required
                      placeholder="Please provide a reason for your leave..."
                      data-testid="leave-reason-input"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Your leave application will be sent to Admin/HR for approval. 
                      Admin/HR will assign the leave type (PL/CL) for each date during approval.
                      Leave balance will be updated after approval.
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full" data-testid="submit-leave-button">
                    <Send size={18} className="mr-2" />
                    Submit Application ({calculateTotalDays()} days)
                  </Button>
                </form>
              </TabsContent>

              {/* Pending Applications Tab */}
              <TabsContent value="applied" className="p-6">
                {pendingApplications.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No pending applications</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pendingApplications.map((app) => (
                      <ApplicationCard key={app.id} app={app} showActions={true} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Approved Applications Tab */}
              <TabsContent value="approved" className="p-6">
                {approvedApplications.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No approved applications</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {approvedApplications.map((app) => (
                      <ApplicationCard key={app.id} app={app} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Rejected Applications Tab */}
              <TabsContent value="rejected" className="p-6">
                {rejectedApplications.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <XCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No rejected applications</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {rejectedApplications.map((app) => (
                      <ApplicationCard key={app.id} app={app} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Leave Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit size={20} />
                Edit Leave Application
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateApplication} className="space-y-4">
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
                <Label htmlFor="edit-reason">Reason</Label>
                <Textarea
                  id="edit-reason"
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Update Application
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
