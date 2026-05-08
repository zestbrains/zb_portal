import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Clock, Search, Users, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 1; y <= currentYear + 1; y++) years.push(y.toString());
  return years;
}

function getDayName(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function isWeekend(year, month, day) {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export default function LateComing({ user, onLogout }) {
  const now = new Date();
  const [month, setMonth] = useState((now.getMonth() + 1).toString());
  const [year, setYear] = useState(now.getFullYear().toString());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState({});

  useEffect(() => {
    fetchLateComing();
  }, [month, year]);

  const fetchLateComing = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/late-coming?year=${year}&month=${month}`);
      setData(res.data);
    } catch (error) {
      toast.error('Error fetching late coming data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLate = async (employeeId, day) => {
    const key = `${employeeId}-${day}`;
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.post(`/late-coming?year=${year}&month=${month}&employee_id=${employeeId}&day=${day}`);
      
      // Update local state
      setData(prev => ({
        ...prev,
        employees: prev.employees.map(emp => {
          if (emp.employee_id === employeeId) {
            const newLateDays = res.data.action === 'added'
              ? [...emp.late_days, day].sort((a, b) => a - b)
              : emp.late_days.filter(d => d !== day);
            return { ...emp, late_days: newLateDays };
          }
          return emp;
        }),
        total_late_marks: prev.total_late_marks + (res.data.action === 'added' ? 1 : -1)
      }));
      
      toast.success(res.data.message);
    } catch (error) {
      toast.error('Error updating late mark');
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  };

  const filteredEmployees = data?.employees?.filter(emp => {
    const searchLower = search.toLowerCase();
    return (
      emp.employee_name.toLowerCase().includes(searchLower) ||
      emp.employee_id.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Generate dates array
  const dates = data ? Array.from({ length: data.num_days }, (_, i) => i + 1) : [];

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-full" data-testid="admin-late-coming-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="text-orange-500" />
              Late Coming
            </h1>
            <p className="text-sm text-slate-500 mt-1">Mark employees who came late to office</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Month:</span>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Year:</span>
              <Select value={year} onValueChange={setYear}>
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
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600">{data.employees?.length || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Late Marks</p>
                  <p className="text-2xl font-bold text-orange-600">{data.total_late_marks || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <AlertCircle className="text-slate-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Days in Month</p>
                  <p className="text-2xl font-bold text-slate-600">{data.num_days}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-orange-800">
            <strong>How to use:</strong> Click on any date cell to toggle late mark for that employee. 
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">L</span> 
            = Late Coming
          </p>
        </div>

        {/* Late Coming Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-20 min-w-[180px]">
                    Employee
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 w-12">
                    Total
                  </th>
                  {dates.map(day => {
                    const weekend = isWeekend(parseInt(year), parseInt(month), day);
                    return (
                      <th 
                        key={day} 
                        className={`px-1 py-2 text-center text-xs border-b border-slate-200 w-10 ${weekend ? 'bg-slate-100' : ''}`}
                      >
                        <div className="font-semibold text-slate-500">{day}</div>
                        <div className={`text-[10px] ${weekend ? 'text-red-400' : 'text-slate-300'}`}>
                          {getDayName(parseInt(year), parseInt(month), day)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={dates.length + 2} className="p-8 text-center text-slate-400">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <tr 
                      key={emp.employee_id} 
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-slate-50`}
                    >
                      <td className="px-4 py-2 text-sm border-b border-r border-slate-100 font-medium sticky left-0 z-10 bg-inherit min-w-[180px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 truncate">{emp.employee_name}</span>
                          <span className="text-xs text-slate-400">{emp.employee_id}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center border-b border-r border-slate-100">
                        {emp.late_days.length > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {emp.late_days.length}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-300">0</span>
                        )}
                      </td>
                      {dates.map(day => {
                        const isLate = emp.late_days.includes(day);
                        const weekend = isWeekend(parseInt(year), parseInt(month), day);
                        const key = `${emp.employee_id}-${day}`;
                        const isToggling = toggling[key];
                        
                        return (
                          <td 
                            key={day} 
                            className={`px-1 py-2 text-center border-b border-slate-100 ${weekend ? 'bg-slate-100/50' : ''}`}
                          >
                            <button
                              onClick={() => handleToggleLate(emp.employee_id, day)}
                              disabled={isToggling}
                              className={`
                                w-8 h-8 rounded-lg border text-xs font-bold transition-all
                                ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'}
                                ${isLate 
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                                  : 'bg-white text-slate-300 border-slate-200 hover:border-orange-300 hover:text-orange-400'
                                }
                              `}
                              title={isLate ? 'Click to remove late mark' : 'Click to mark as late'}
                            >
                              {isLate ? 'L' : '-'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-bold border border-orange-600">L</div>
              <span className="text-xs text-slate-600">Late Coming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-300 text-xs font-bold border border-slate-200">-</div>
              <span className="text-xs text-slate-600">On Time / Not Marked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 text-xs font-bold border border-slate-200">-</div>
              <span className="text-xs text-slate-600">Weekend</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
