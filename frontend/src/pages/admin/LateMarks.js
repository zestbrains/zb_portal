import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, Search, Users, FolderKanban, Download, CheckCircle, PauseCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const START_YEAR = 2026;
const START_MONTH = 3;

function getAvailableMonths(year) {
  if (parseInt(year) === START_YEAR) return MONTHS.filter(m => parseInt(m.value) >= START_MONTH);
  return MONTHS;
}

function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = START_YEAR; y <= currentYear + 1; y++) years.push(y.toString());
  return years;
}

export default function LateMarks({ user, onLogout }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1 < START_MONTH && now.getFullYear() === START_YEAR ? START_MONTH.toString() : (now.getMonth() + 1).toString());
  const [year, setYear] = useState(now.getFullYear().toString());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetchLateMarks();
  }, [month, year]);

  const fetchLateMarks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/late-marks?year=${year}&month=${month}`);
      setData(res.data);
    } catch (error) {
      toast.error('Error fetching late marks data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryStatusChange = async (employeeId, newStatus) => {
    setUpdating(prev => ({ ...prev, [employeeId]: true }));
    try {
      await api.put(`/late-marks/salary-status?year=${year}&month=${month}&employee_id=${employeeId}&salary_status=${newStatus}`);
      // Update local state
      setData(prev => ({
        ...prev,
        employees: prev.employees.map(emp => 
          emp.employee_id === employeeId ? { ...emp, salary_status: newStatus } : emp
        ),
        employees_on_hold: prev.employees.filter(e => 
          e.employee_id === employeeId ? newStatus === 'hold' : e.salary_status === 'hold'
        ).length
      }));
      toast.success(`Salary status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Error updating salary status');
    } finally {
      setUpdating(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const filteredEmployees = data?.employees?.filter(emp => {
    const searchLower = search.toLowerCase();
    return (
      emp.employee_name.toLowerCase().includes(searchLower) ||
      emp.employee_id.toLowerCase().includes(searchLower) ||
      emp.departments?.some(d => d.toLowerCase().includes(searchLower)) ||
      emp.late_projects?.some(p => 
        p.project_name.toLowerCase().includes(searchLower) ||
        p.project_code.toLowerCase().includes(searchLower)
      )
    );
  }) || [];

  const exportToCSV = () => {
    if (!filteredEmployees.length) return;
    
    const headers = ['Employee ID', 'Employee Name', 'Email', 'Departments', 'Has Late Mark', 'Late Projects', 'Salary Status'];
    const rows = filteredEmployees.map(emp => [
      emp.employee_id,
      emp.employee_name,
      emp.employee_email,
      emp.departments?.join('; ') || '',
      emp.has_late_mark ? 'Yes' : 'No',
      emp.late_projects?.map(p => p.project_name).join('; ') || 'None',
      emp.salary_status?.toUpperCase() || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `late_marks_${year}_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableMonths = getAvailableMonths(year);

  // Handle year change - adjust month if needed
  const handleYearChange = (newYear) => {
    setYear(newYear);
    if (parseInt(newYear) === START_YEAR && parseInt(month) < START_MONTH) {
      setMonth(START_MONTH.toString());
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-full space-y-6" data-testid="admin-late-marks-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="text-red-500" />
              Late Marks
            </h1>
            <p className="text-sm text-slate-500 mt-1">Monthly late mark management with salary hold status</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2" disabled={!filteredEmployees.length}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>

        {/* Month/Year Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Month:</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Year:</span>
            <Select value={year} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableYears().map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600">{data.total_employees}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">With Late Marks</p>
                  <p className="text-2xl font-bold text-red-600">{data.employees_with_late_marks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <PauseCircle className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Salary On Hold</p>
                  <p className="text-2xl font-bold text-orange-600">{data.employees_on_hold}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FolderKanban className="text-yellow-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Late Projects</p>
                  <p className="text-2xl font-bold text-yellow-600">{data.unique_late_projects}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search by employee, department, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employee List - Grouped View */}
        <div className="space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
              <Users className="mx-auto mb-2 text-slate-300" size={40} />
              <p className="font-medium">No employees found</p>
            </div>
          ) : (
            filteredEmployees.map(emp => (
              <div 
                key={emp.employee_id} 
                className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
                  emp.has_late_mark ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Employee Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900">{emp.employee_name}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{emp.employee_id}</span>
                      {emp.has_late_mark && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle size={10} className="mr-1" />
                          Late Mark
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{emp.employee_email}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {emp.departments?.map((dept, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{dept}</Badge>
                      ))}
                    </div>
                    
                    {/* Late Projects */}
                    {emp.has_late_mark ? (
                      <div className="flex flex-wrap gap-2">
                        {emp.late_projects.map((proj, i) => (
                          <div key={i} className="bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 text-sm">
                            <p className="font-medium text-red-800">{proj.project_name}</p>
                            <p className="text-xs text-red-600">{proj.client_name || 'No Client'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle size={14} />
                        No late project
                      </div>
                    )}
                  </div>
                  
                  {/* Salary Status Toggle */}
                  <div className="flex items-center gap-3 lg:border-l lg:pl-4 lg:ml-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Salary Status</p>
                      <p className={`text-sm font-semibold ${emp.salary_status === 'hold' ? 'text-orange-600' : 'text-green-600'}`}>
                        {emp.salary_status === 'hold' ? 'HOLD' : 'ACTIVE'}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={emp.salary_status === 'active'}
                        onCheckedChange={(checked) => handleSalaryStatusChange(emp.employee_id, checked ? 'active' : 'hold')}
                        disabled={updating[emp.employee_id]}
                        className="data-[state=checked]:bg-green-500"
                      />
                      <span className="text-[10px] text-slate-400">
                        {emp.salary_status === 'hold' ? 'Hold' : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
