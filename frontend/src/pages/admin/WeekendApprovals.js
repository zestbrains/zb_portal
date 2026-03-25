import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Check, X, Clock, Calendar, History, Eye, Edit, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { toast } from 'sonner';

export default function WeekendApprovals({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Year and Month filter states
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  
  // Form states for approval/rejection
  const [editedDate, setEditedDate] = useState('');
  const [editedHours, setEditedHours] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCompensation, setIsCompensation] = useState(false);

  // Generate years (from 2026 to current year)
  const generateYears = () => {
    const years = [];
    const startYear = 2026;
    for (let y = startYear; y <= currentYear; y++) {
      years.push({ value: y.toString(), label: y.toString() });
    }
    return years;
  };

  // Generate months
  const generateMonths = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // If selected year is 2026, start from February
    const startMonth = selectedYear === '2026' ? 2 : 1;
    const months = [];
    
    for (let m = startMonth; m <= 12; m++) {
      // If current year and month is in future, stop
      if (parseInt(selectedYear) === currentYear && m > currentMonth) break;
      
      months.push({
        value: m.toString(),
        label: monthNames[m - 1]
      });
    }
    return months;
  };

  const years = generateYears();
  const months = generateMonths();

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const response = await api.get('/weekend-approvals?status=pending');
        setPendingApprovals(response.data);
      } else {
        // Use year and month for history filter
        const yearMonth = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
        const response = await api.get(`/weekend-approvals/history?month=${yearMonth}`);
        setHistory(response.data);
      }
      
      // Get pending count
      const countResponse = await api.get('/weekend-approvals/pending-count');
      setPendingCount(countResponse.data.count);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = (approval) => {
    setSelectedApproval(approval);
    setViewDialogOpen(true);
  };

  const openActionDialog = (approval, type) => {
    setSelectedApproval(approval);
    setActionType(type);
    setEditedDate(approval.original_date);
    setEditedHours(approval.original_hours.toString());
    setRejectionReason('');
    setIsCompensation(false); // Reset compensation checkbox
    setActionDialogOpen(true);
  };

  const handleApprove = async () => {
    try {
      await api.put(`/weekend-approvals/${selectedApproval.id}/approve`, {
        approved_date: editedDate,
        approved_hours: parseFloat(editedHours),
        is_compensation: isCompensation // Store compensation flag
      });
      toast.success('Work entry approved successfully');
      setActionDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.put(`/weekend-approvals/${selectedApproval.id}/reject`, {
        rejection_reason: rejectionReason
      });
      toast.success('Work entry rejected');
      setActionDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleApproveAll = async () => {
    if (pendingApprovals.length === 0) {
      toast.error('No pending approvals to approve');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to approve all ${pendingApprovals.length} pending entries?\n\nThis will approve them with their original dates and hours.`)) {
      return;
    }
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const approval of pendingApprovals) {
        try {
          await api.put(`/weekend-approvals/${approval.id}/approve`, {
            approved_date: approval.original_date,
            approved_hours: approval.original_hours
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to approve ${approval.id}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully approved ${successCount} entries`);
      }
      if (failCount > 0) {
        toast.error(`Failed to approve ${failCount} entries`);
      }
      
      fetchData();
    } catch (error) {
      toast.error('Error during bulk approval');
    }
  };

  const openDeleteDialog = (approval) => {
    setSelectedApproval(approval);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/weekend-approvals/${selectedApproval.id}`);
      toast.success('Entry deleted from history and work entries');
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDayType = (approval) => {
    if (approval.is_holiday) return { type: 'Holiday', color: 'bg-purple-100 text-purple-800' };
    const date = new Date(approval.original_date);
    if (date.getDay() === 0) return { type: 'Sunday', color: 'bg-red-100 text-red-800' };
    if (date.getDay() === 6) return { type: 'Saturday', color: 'bg-orange-100 text-orange-800' };
    return { type: 'Weekday', color: 'bg-slate-100 text-slate-800' };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="weekend-approvals-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Weekend/Holiday Approvals</h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve weekend & holiday work entries</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-amber-100 text-amber-700 border-amber-200 px-4 py-2 rounded-lg text-sm font-semibold">
              {pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={`text-xs ${activeTab === 'pending' ? 'bg-slate-900 hover:bg-slate-800' : 'border-slate-200'}`}
            size="sm"
            data-testid="tab-pending"
          >
            <Clock size={14} className="mr-1.5" />
            Pending ({pendingCount})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
            className={`text-xs ${activeTab === 'history' ? 'bg-slate-900 hover:bg-slate-800' : 'border-slate-200'}`}
            size="sm"
            data-testid="tab-history"
          >
            <History size={16} className="mr-2" />
            History
          </Button>
          {activeTab === 'pending' && pendingCount > 0 && user.role === 'admin' && (
            <Button
              onClick={handleApproveAll}
              className="bg-green-600 hover:bg-green-700 ml-auto"
              data-testid="approve-all-btn"
            >
              <Check size={16} className="mr-2" />
              Approve All ({pendingCount})
            </Button>
          )}
        </div>

        {/* Year and Month Filter for History */}
        {activeTab === 'history' && (
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Year:</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28" data-testid="year-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Month:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-36" data-testid="month-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : activeTab === 'pending' ? (
              pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Clock size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingApprovals.map((approval) => {
                    const dayType = getDayType(approval);
                    return (
                      <div key={approval.id} className="p-4 hover:bg-slate-50" data-testid={`approval-${approval.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-semibold">{approval.employee_name}</span>
                              <span className="text-slate-500 text-sm">({approval.employee_id})</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${dayType.color}`}>
                                {dayType.type}
                                {approval.holiday_name && ` - ${approval.holiday_name}`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-slate-500">Date:</span>
                                <span className="ml-1 font-medium">{formatDate(approval.original_date)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Hours:</span>
                                <span className="ml-1 font-medium text-blue-600">{approval.original_hours}h</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-500">Project:</span>
                                <span className="ml-1 font-medium">{approval.project_name}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 self-end sm:self-center">
                            <Button size="sm" variant="outline" onClick={() => openViewDialog(approval)} data-testid={`view-${approval.id}`}>
                              <Eye size={16} />
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openActionDialog(approval, 'approve')} data-testid={`approve-${approval.id}`}>
                              <Check size={16} className="mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openActionDialog(approval, 'reject')} data-testid={`reject-${approval.id}`}>
                              <X size={16} className="mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              history.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <History size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>No approval history found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((record) => {
                    const dayType = getDayType(record);
                    const hasChanges = record.approved_date !== record.original_date || 
                                       record.approved_hours !== record.original_hours;
                    return (
                      <div key={record.id} className="p-4 hover:bg-slate-50" data-testid={`history-${record.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-semibold">{record.employee_name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(record.status)}`}>
                                {record.status.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${dayType.color}`}>
                                {dayType.type}
                              </span>
                              {hasChanges && record.status === 'approved' && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  <Edit size={10} className="inline mr-1" />Edited
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-slate-500">Original Date:</span>
                                <span className="ml-1">{formatDate(record.original_date)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Original Hours:</span>
                                <span className="ml-1">{record.original_hours}h</span>
                              </div>
                              {record.status === 'approved' && (
                                <>
                                  <div>
                                    <span className="text-slate-500">Approved Date:</span>
                                    <span className="ml-1 font-medium text-green-600">{formatDate(record.approved_date)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Approved Hours:</span>
                                    <span className="ml-1 font-medium text-green-600">{record.approved_hours}h</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-slate-500">Project:</span>
                              <span className="ml-1">{record.project_name}</span>
                            </div>
                            {record.status === 'rejected' && record.rejection_reason && (
                              <div className="mt-2 text-sm text-red-600">
                                <span className="font-medium">Rejection Reason:</span> {record.rejection_reason}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-slate-400">
                              {record.status === 'approved' ? 'Approved' : 'Rejected'} by {record.approved_by} on {formatDate(record.approved_at)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openViewDialog(record)}>
                              <Eye size={16} />
                            </Button>
                            {(record.status === 'approved' || record.status === 'rejected') && user.role === 'admin' && (
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDeleteDialog(record)} data-testid={`delete-${record.id}`}>
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Work Entry Details</DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Employee</span>
                    <p className="font-medium">{selectedApproval.employee_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Employee ID</span>
                    <p className="font-medium">{selectedApproval.employee_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Project</span>
                    <p className="font-medium">{selectedApproval.project_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status</span>
                    <p className={`font-medium px-2 py-0.5 rounded text-xs inline-block ${getStatusBadge(selectedApproval.status)}`}>
                      {selectedApproval.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Original Date</span>
                    <p className="font-medium">{formatDate(selectedApproval.original_date)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Original Hours</span>
                    <p className="font-medium">{selectedApproval.original_hours}h</p>
                  </div>
                  {selectedApproval.status === 'approved' && (
                    <>
                      <div>
                        <span className="text-slate-500">Approved Date</span>
                        <p className="font-medium text-green-600">{formatDate(selectedApproval.approved_date)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Approved Hours</span>
                        <p className="font-medium text-green-600">{selectedApproval.approved_hours}h</p>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Work Details</span>
                  <p className="mt-1 p-3 bg-slate-50 rounded text-sm">{selectedApproval.original_work_details}</p>
                </div>
                {selectedApproval.rejection_reason && (
                  <div>
                    <span className="text-slate-500 text-sm">Rejection Reason</span>
                    <p className="mt-1 p-3 bg-red-50 rounded text-sm text-red-700">{selectedApproval.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve/Reject Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Work Entry' : 'Reject Work Entry'}
              </DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded text-sm">
                  <p><strong>Employee:</strong> {selectedApproval.employee_name}</p>
                  <p><strong>Project:</strong> {selectedApproval.project_name}</p>
                </div>

                {actionType === 'approve' ? (
                  <>
                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                      <p className="font-medium mb-1">You can edit the date and hours before approving:</p>
                      <p>Original values will be preserved for audit.</p>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={editedDate} 
                        onChange={(e) => setEditedDate(e.target.value)}
                        data-testid="edit-date"
                      />
                      {editedDate !== selectedApproval.original_date && (
                        <p className="text-xs text-orange-600 mt-1">Changed from {formatDate(selectedApproval.original_date)}</p>
                      )}
                    </div>
                    <div>
                      <Label>Hours</Label>
                      <Input 
                        type="number" 
                        step="0.5" 
                        min="0.5"
                        value={editedHours} 
                        onChange={(e) => setEditedHours(e.target.value)}
                        data-testid="edit-hours"
                      />
                      {parseFloat(editedHours) !== selectedApproval.original_hours && (
                        <p className="text-xs text-orange-600 mt-1">Changed from {selectedApproval.original_hours}h</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded border border-amber-200">
                      <Checkbox 
                        id="compensation" 
                        checked={isCompensation}
                        onCheckedChange={(checked) => setIsCompensation(checked)}
                        data-testid="compensation-checkbox"
                      />
                      <Label htmlFor="compensation" className="text-sm font-medium cursor-pointer">
                        Mark as Compensation
                      </Label>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove} data-testid="confirm-approve">
                      <Check size={16} className="mr-2" /> Approve Entry
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Rejection Reason *</Label>
                      <Textarea 
                        value={rejectionReason} 
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..."
                        rows={3}
                        data-testid="rejection-reason"
                      />
                    </div>
                    <Button className="w-full" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleReject} data-testid="confirm-reject">
                      <X size={16} className="mr-2" /> Reject Entry
                    </Button>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={20} />
                Delete Approved Entry
              </DialogTitle>
            </DialogHeader>
            {selectedApproval && (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                  <p className="text-red-800 font-medium mb-2">Warning: This action cannot be undone!</p>
                  <p className="text-red-700">This will permanently delete:</p>
                  <ul className="list-disc list-inside text-red-700 mt-1">
                    <li>The approval record from history</li>
                    <li>The corresponding work entry from All Entries</li>
                    <li>Deduct {selectedApproval.approved_hours}h from project hours</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-slate-50 rounded text-sm">
                  <p><strong>Employee:</strong> {selectedApproval.employee_name}</p>
                  <p><strong>Date:</strong> {formatDate(selectedApproval.approved_date)}</p>
                  <p><strong>Hours:</strong> {selectedApproval.approved_hours}h</p>
                  <p><strong>Project:</strong> {selectedApproval.project_name}</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete} className="flex-1" data-testid="confirm-delete">
                    <Trash2 size={16} className="mr-2" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
