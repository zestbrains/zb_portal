import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Attendance({ user, onLogout }) {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  useEffect(() => {
    fetchAttendance();
  }, [year, month]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance?year=${year}&month=${month}`);
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'P': 'bg-green-100 text-green-700 border-green-200',
      'PL': 'bg-blue-100 text-blue-700 border-blue-200',
      'CL': 'bg-red-100 text-red-700 border-red-200',
      'PL/2': 'bg-blue-50 text-blue-600 border-blue-200',
      'CL/2': 'bg-red-50 text-red-600 border-red-200',
      'PL/2 & CL/2': 'bg-amber-100 text-amber-700 border-amber-200',
      'OT': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'OT/2': 'bg-indigo-50 text-indigo-600 border-indigo-200',
      'WO': 'bg-slate-100 text-slate-500 border-slate-200',
      'H': 'bg-violet-100 text-violet-700 border-violet-200',
    };
    return colors[status] || 'bg-white text-slate-600 border-slate-200';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'P': return 'Present';
      case 'PL': return 'Paid Leave';
      case 'CL': return 'Casual Leave';
      case 'PL/2': return 'Half Day PL';
      case 'CL/2': return 'Half Day CL';
      case 'PL/2 & CL/2': return 'PL/2 & CL/2';
      case 'OT': return 'Overtime';
      case 'OT/2': return 'Half Overtime';
      case 'WO': return 'Week Off';
      case 'H': return 'Holiday';
      default: return status;
    }
  };

  const getDayName = (day) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (loading && !attendanceData) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10 max-w-full">
          <div className="animate-pulse"><div className="h-8 w-48 bg-slate-100 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-full space-y-6" data-testid="admin-attendance-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Attendance</h1>
            <p className="text-sm text-slate-500 mt-1">Monthly attendance tracker for all employees</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            {months[month - 1]} {year}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handlePreviousMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
              {months.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => { setYear(currentDate.getFullYear()); setMonth(currentDate.getMonth() + 1); }} className="ml-auto px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-medium">Today</button>
          </div>
        </div>

        {/* Summary */}
        {attendanceData && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-2xl font-bold text-slate-900">{attendanceData.employees.length}</div>
                <div className="text-xs text-slate-500 mt-1">Total Employees</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{attendanceData.num_days}</div>
                <div className="text-xs text-blue-500 mt-1">Working Days</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="text-2xl font-bold text-green-600">{(() => { const t = new Date(); if (year === t.getFullYear() && month === t.getMonth() + 1 && t.getDate() <= attendanceData.num_days) { return Object.values(attendanceData.attendance).filter(emp => emp[t.getDate()] === 'P').length; } return '-'; })()}</div>
                <div className="text-xs text-green-500 mt-1">Today's Present</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-2xl font-bold text-amber-600">{(() => { const t = new Date(); if (year === t.getFullYear() && month === t.getMonth() + 1 && t.getDate() <= attendanceData.num_days) { return Object.values(attendanceData.attendance).filter(emp => { const s = emp[t.getDate()]; return ['PL','CL','PL/2','CL/2','PL/2 & CL/2'].includes(s); }).length; } return '-'; })()}</div>
                <div className="text-xs text-amber-500 mt-1">Today's Leaves</div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Matrix */}
        {attendanceData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 sticky left-0 z-20 w-48">Employee</th>
                    {attendanceData.dates.map((day) => (
                      <th key={day} className="px-3 py-3 text-center text-xs font-medium text-slate-400 border-b border-slate-200 w-14">
                        <div className="font-semibold text-slate-500">{day}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">{getDayName(day)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.employees.map((employee, idx) => (
                    <tr key={employee.employee_id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/30 hover:bg-slate-50'}>
                      <td className="px-4 py-3 text-sm border-b border-r border-slate-100 font-medium sticky left-0 z-10 bg-inherit w-48">
                        <div className="flex flex-col"><span className="font-semibold text-slate-800 truncate">{employee.name}</span><span className="text-xs text-slate-400">{employee.employee_id}</span></div>
                      </td>
                      {attendanceData.dates.map((day) => {
                        const status = attendanceData.attendance[employee.employee_id]?.[day] || '-';
                        return (
                          <td key={day} className="px-2 py-3 text-center border-b border-slate-100" title={`${employee.name} - ${day} ${months[month - 1]}: ${status === '-' ? 'Future' : getStatusLabel(status)}`}>
                            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-[10px] font-bold ${status === '-' ? 'bg-slate-50 text-slate-300 border-slate-100' : getStatusColor(status)}`}>{status}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</h3>
          <div className="flex flex-wrap gap-2">
            {['P', 'PL', 'CL', 'PL/2', 'CL/2', 'PL/2 & CL/2', 'OT', 'OT/2', 'WO', 'H', '-'].map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-8 h-7 flex items-center justify-center rounded-lg border text-[10px] font-bold ${status === '-' ? 'bg-slate-50 text-slate-300 border-slate-100' : getStatusColor(status)}`}>{status}</div>
                <span className="text-xs text-slate-500">{status === '-' ? 'Future' : getStatusLabel(status)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
