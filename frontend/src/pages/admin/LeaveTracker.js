import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Download, Eye, DollarSign, Edit, Trash2, Calendar, X, RotateCcw } from 'lucide-react';

export default function AdminLeaveTracker({ user, onLogout }) {
  const [tracker, setTracker] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [encashDialogOpen, setEncashDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [encashMonth, setEncashMonth] = useState('');
  const [activeYearTab, setActiveYearTab] = useState(null);
  const [employeeStatusTab, setEmployeeStatusTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [editFormData, setEditFormData] = useState({
    leave_type: 'PL',
    leave_days: '1',
    leave_date: ''
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState(null);

  useEffect(() => {
    fetchTracker(employeeStatusTab);
    fetchEmployees();
  }, [employeeStatusTab]);

  const fetchTracker = async (status = 'active') => {
    setLoading(true);
    try {
      const response = await api.get(`/leaves/tracker?employee_status=${status}`);
      setTracker(response.data);
    } catch (error) {
      toast.error('Error fetching leave tracker');
    } finally {
      setLoading(false);
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

  const handleViewDetails = async (empId) => {
    try {
      const response = await api.get(`/leaves/employee-yearwise/${empId}`);
      setViewingEmployee(response.data);
      // Set active tab to current year (the one with is_current = true)
      const currentYear = response.data.years_data.find(y => y.is_current);
      setActiveYearTab(currentYear ? currentYear.year_number : response.data.years_data.length);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Error fetching employee leave details');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditFormData({
      leave_type: record.type,
      leave_days: record.days.toString(),
      leave_date: record.date.split('T')[0]  // Add editable date
    });
    setEditDialogOpen(true);
  };

  const handleUpdateLeave = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams({
        leave_type: editFormData.leave_type,
        leave_days: editFormData.leave_days
      });
      if (editFormData.leave_date) {
        params.append('leave_date', editFormData.leave_date);
      }
      await api.put(`/leaves/records/${editingRecord.id}?${params.toString()}`);
      toast.success('Leave record updated');
      setEditDialogOpen(false);
      if (viewingEmployee) {
        handleViewDetails(viewingEmployee.employee_id);
      }
      fetchTracker();
    } catch (error) {
      toast.error('Error updating leave');
    }
  };

  const handleDeleteLeave = async (recordId) => {
    if (window.confirm('Delete this leave record?')) {
      try {
        await api.delete(`/leaves/records/${recordId}`);
        toast.success('Leave record deleted');
        if (viewingEmployee) {
          handleViewDetails(viewingEmployee.employee_id);
        }
        fetchTracker();
      } catch (error) {
        toast.error('Error deleting leave');
      }
    }
  };

  const handleResetClick = (emp) => {
    setResetEmployee(emp);
    setResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    if (!resetEmployee) return;
    try {
      const response = await api.delete(`/leaves/reset/${resetEmployee.employee_id}`);
      toast.success(response.data.message);
      setResetDialogOpen(false);
      setResetEmployee(null);
      fetchTracker(employeeStatusTab);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error resetting leave data');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/leaves/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(response.data.message);
      } else {
        toast.success(response.data.message);
      }
      fetchTracker(employeeStatusTab);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error importing leaves');
    }
    // Reset file input
    e.target.value = '';
  };

  const handleEncashment = async () => {
    if (!selectedEmployee || !encashMonth) {
      toast.error('Please select employee and month');
      return;
    }
    try {
      const response = await api.post('/leaves/encash', {
        employee_id: selectedEmployee,
        encash_month: encashMonth
      });
      toast.success(response.data.message);
      setEncashDialogOpen(false);
      setSelectedEmployee('');
      setEncashMonth('');
      fetchTracker();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error processing encashment');
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `employee_id,date,type,leave,status
EMP001,2026-02-20,PL,1,taken
EMP001,2026-02-21,PL,0.5,taken`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_import_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateMonths = () => {
    const months = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    for (let year = 2024; year <= 2030; year++) {
      for (let month = 0; month < 12; month++) {
        months.push(`${monthNames[month]} ${year}`);
      }
    }
    return months;
  };

  const months = generateMonths();

  // Get currently selected year data
  const getActiveYearData = () => {
    if (!viewingEmployee || !activeYearTab) return null;
    return viewingEmployee.years_data.find(y => y.year_number === activeYearTab);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="leave-tracker-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Leave Tracker</h1>
            <p className="text-sm sm:text-base text-gray-600">Monitor employee leave records (Current Year)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadSampleCSV} variant="outline" size="sm" className="text-xs sm:text-sm" data-testid="sample-csv-btn">
              <Download size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Sample</span> CSV
            </Button>
            <input type="file" accept=".csv" onChange={handleFileUpload} id="csv-upload" className="hidden" />
            <Button onClick={() => document.getElementById('csv-upload').click()} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm" size="sm" data-testid="import-csv-btn">
              <Upload size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
              Import
            </Button>
            <Dialog open={encashDialogOpen} onOpenChange={setEncashDialogOpen}>
              <Button onClick={() => setEncashDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm" size="sm" data-testid="encash-leave-btn">
                <DollarSign size={14} className="mr-1 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
                Encash
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Encash Employee Leave</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger data-testid="encash-employee-select">
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.employee_id} value={emp.employee_id}>
                            {emp.name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Encash Month</Label>
                    <Select value={encashMonth} onValueChange={setEncashMonth}>
                      <SelectTrigger data-testid="encash-month-select">
                        <SelectValue placeholder="Choose month" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleEncashment} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="process-encash-btn">
                    Process Encashment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Employee Status Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
          <Button 
            variant={employeeStatusTab === 'active' ? 'default' : 'outline'}
            onClick={() => setEmployeeStatusTab('active')}
            className={`text-xs sm:text-sm ${employeeStatusTab === 'active' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            size="sm"
          >
            Active
          </Button>
          <Button 
            variant={employeeStatusTab === 'ex-employee' ? 'default' : 'outline'}
            onClick={() => setEmployeeStatusTab('ex-employee')}
            className={`text-xs sm:text-sm ${employeeStatusTab === 'ex-employee' ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
            size="sm"
          >
            Ex-Employees
          </Button>
          <div className="ml-auto">
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64"
              data-testid="leave-tracker-search"
            />
          </div>
        </div>

        {/* Main List View Table */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading tracker...</div>
            ) : tracker.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No leave records found for {employeeStatusTab === 'active' ? 'active' : 'ex-'}employees.</div>
            ) : (
              <div className="table-container">
                <table data-testid="leave-tracker-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      <th>Joining Date</th>
                      <th>PL Taken</th>
                      <th>CL Taken</th>
                      <th>Available PL</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracker
                      .filter(emp => 
                        !searchQuery || 
                        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((emp, index) => (
                      <tr key={emp.employee_id} data-testid={`leave-row-${emp.employee_id}`}>
                        <td data-label="S.No">{index + 1}</td>
                        <td data-label="Employee ID" className="font-semibold">{emp.employee_id}</td>
                        <td data-label="Name">{emp.name}</td>
                        <td data-label="Joining Date">{formatDate(emp.joining_date)}</td>
                        <td data-label="PL Taken" className="text-red-600 font-medium">{emp.pl_taken.toFixed(1)}</td>
                        <td data-label="CL Taken" className="text-orange-600 font-medium">{emp.cl_taken.toFixed(1)}</td>
                        <td data-label="Available PL" className="font-semibold text-green-600">{emp.available_pl.toFixed(1)}</td>
                        <td data-label="Actions">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewDetails(emp.employee_id)}
                              data-testid={`view-btn-${emp.employee_id}`}
                            >
                              <Eye size={16} className="mr-1" /> View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => handleResetClick(emp)}
                              data-testid={`reset-btn-${emp.employee_id}`}
                            >
                              <RotateCcw size={16} />
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

        {/* Year-wise Leave Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl lg:max-w-4xl overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <DialogTitle className="text-lg sm:text-xl">
                  Leave Details - {viewingEmployee?.name}
                </DialogTitle>
                <span className="text-xs sm:text-sm text-gray-500">({viewingEmployee?.employee_id})</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Joining: {viewingEmployee && formatDate(viewingEmployee.joining_date)}
              </p>
            </DialogHeader>
            
            {viewingEmployee && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Year Tabs */}
                <div className="flex gap-1.5 sm:gap-2 border-b pb-2 mb-3 sm:mb-4 flex-wrap flex-shrink-0 overflow-x-hidden" data-testid="year-tabs">
                  {viewingEmployee.years_data.map((yearData) => (
                    <button
                      key={yearData.year_number}
                      onClick={() => setActiveYearTab(yearData.year_number)}
                      data-testid={`year-tab-${yearData.year_number}`}
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-t-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                        activeYearTab === yearData.year_number
                          ? 'bg-blue-600 text-white'
                          : yearData.is_closed
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {yearData.year_label} {yearData.is_closed ? '✓' : ''}
                    </button>
                  ))}
                </div>

                {/* Year Content */}
                {getActiveYearData() && (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[50vh] sm:max-h-[60vh]">
                    {(() => {
                      const yearData = getActiveYearData();
                      return (
                        <div className="space-y-3 sm:space-y-4 overflow-hidden">
                          {/* Year Summary Header */}
                          <div className={`p-3 sm:p-4 rounded-lg ${yearData.is_closed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar size={16} className={yearData.is_closed ? 'text-amber-600' : 'text-green-600'} />
                                <span className="font-semibold text-xs sm:text-sm">
                                  {formatDate(yearData.start_date)} - {formatDate(yearData.end_date)}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold self-start sm:self-auto ${
                                yearData.is_closed ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'
                              }`}>
                                {yearData.is_closed ? 'Closed' : 'Active'}
                              </span>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                              <div className="bg-white p-2 sm:p-3 rounded border">
                                <div className="text-xs text-gray-500">PL Taken</div>
                                <div className="text-lg sm:text-xl font-bold text-red-600">{yearData.pl_taken.toFixed(1)}</div>
                              </div>
                              <div className="bg-white p-2 sm:p-3 rounded border">
                                <div className="text-xs text-gray-500">CL Taken</div>
                                <div className="text-lg sm:text-xl font-bold text-orange-600">{yearData.cl_taken.toFixed(1)}</div>
                              </div>
                              {yearData.is_closed ? (
                                <div className="bg-white p-2 sm:p-3 rounded border">
                                  <div className="text-xs text-gray-500">Encashed</div>
                                  <div className="text-lg sm:text-xl font-bold text-purple-600">{yearData.settled_pl.toFixed(1)}</div>
                                </div>
                              ) : (
                                <div className="bg-white p-2 sm:p-3 rounded border">
                                  <div className="text-xs text-gray-500">Available PL</div>
                                  <div className="text-lg sm:text-xl font-bold text-green-600">{yearData.available_pl.toFixed(1)}</div>
                                </div>
                              )}
                              <div className="bg-white p-2 sm:p-3 rounded border">
                                <div className="text-xs text-gray-500">
                                  {yearData.is_closed ? 'Encash Month' : 'Next Encash'}
                                </div>
                                <div className="text-xs sm:text-sm font-semibold text-blue-600">{yearData.encash_month}</div>
                              </div>
                            </div>
                          </div>

                          {/* Monthly Leave Records */}
                          <div className="space-y-2 sm:space-y-3">
                            <h4 className="font-semibold text-gray-700 text-sm">Monthly Records</h4>
                            {yearData.monthly_leaves.length === 0 ? (
                              <div className="p-4 sm:p-6 text-center text-gray-400 bg-gray-50 rounded-lg text-sm">
                                No leave records for this year
                              </div>
                            ) : (
                              yearData.monthly_leaves.map((monthData, idx) => {
                                const allLeaves = [...monthData.leaves.pl, ...monthData.leaves.cl].sort(
                                  (a, b) => new Date(b.date) - new Date(a.date)
                                );
                                
                                return (
                                  <div key={idx} className="border rounded-lg bg-white" data-testid={`month-${monthData.month.replace(' ', '-')}`}>
                                    <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 border-b">
                                      <div className="font-semibold text-gray-800 text-sm">{monthData.month}</div>
                                      <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
                                        <span className="text-red-600">PL: {monthData.leaves.pl_total.toFixed(1)}</span>
                                        <span className="text-orange-600">CL: {monthData.leaves.cl_total.toFixed(1)}</span>
                                      </div>
                                    </div>
                                    <div className="divide-y">
                                      {allLeaves.map((leave) => (
                                        <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 hover:bg-gray-50 gap-2">
                                          <div className="flex items-center gap-2 sm:gap-4">
                                            <span className="font-mono text-xs sm:text-sm">{formatDate(leave.date)}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                              leave.type === 'PL' 
                                                ? 'bg-blue-100 text-blue-800' 
                                                : 'bg-orange-100 text-orange-800'
                                            }`}>
                                              {leave.days} {leave.type}
                                            </span>
                                          </div>
                                          <div className="flex gap-2 self-end sm:self-auto">
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              className="p-1.5"
                                              onClick={() => handleEdit(leave)}
                                              data-testid={`edit-leave-${leave.id}`}
                                            >
                                              <Edit size={14} />
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="destructive" 
                                              className="p-1.5"
                                              onClick={() => handleDeleteLeave(leave.id)}
                                              data-testid={`delete-leave-${leave.id}`}
                                            >
                                              <Trash2 size={14} />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Leave Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Leave Record</DialogTitle>
            </DialogHeader>
            {editingRecord && (
              <form onSubmit={handleUpdateLeave} className="space-y-4">
                <div>
                  <Label>Leave Date</Label>
                  <Input 
                    type="date"
                    value={editFormData.leave_date}
                    onChange={(e) => setEditFormData({...editFormData, leave_date: e.target.value})}
                    data-testid="edit-leave-date"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Leave Type</Label>
                    <Select value={editFormData.leave_type} onValueChange={(value) => setEditFormData({...editFormData, leave_type: value})}>
                      <SelectTrigger data-testid="edit-leave-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PL">PL</SelectItem>
                        <SelectItem value="CL">CL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Leave Days</Label>
                    <Select value={editFormData.leave_days} onValueChange={(value) => setEditFormData({...editFormData, leave_days: value})}>
                      <SelectTrigger data-testid="edit-leave-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5 (Half)</SelectItem>
                        <SelectItem value="1">1 (Full)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" data-testid="update-leave-btn">
                  Update Leave
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Reset Leave Data</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to reset all leave data for <strong>{resetEmployee?.name}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Warning:</strong> This will permanently delete all leave records (PL & CL) for this employee and reset their leave counters to 0.
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setResetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleResetConfirm}
                data-testid="confirm-reset-btn"
              >
                <RotateCcw size={16} className="mr-2" />
                Reset All Leave
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
