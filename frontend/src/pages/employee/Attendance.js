import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, IndianRupee, AlertTriangle, CheckCircle, MessageCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

function fmt(num) {
  if (!num && num !== 0) return '0';
  return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EmployeeAttendance({ user, onLogout }) {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [salaryData, setSalaryData] = useState(null);
  const [lateMarkStatus, setLateMarkStatus] = useState(null);
  const [lateComingData, setLateComingData] = useState(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  useEffect(() => { fetchAttendance(); fetchSalary(); fetchLateMarkStatus(); fetchLateComing(); }, [year, month]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/my?year=${year}&month=${month}`);
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalary = async () => {
    try {
      const response = await api.get(`/salary/my?year=${year}&month=${month}`);
      setSalaryData(response.data);
    } catch (error) {
      setSalaryData(null);
    }
  };

  const fetchLateMarkStatus = async () => {
    try {
      const response = await api.get(`/late-marks/my-status?year=${year}&month=${month}`);
      setLateMarkStatus(response.data);
    } catch (error) {
      setLateMarkStatus(null);
    }
  };

  const fetchLateComing = async () => {
    try {
      const response = await api.get(`/late-coming/my?year=${year}&month=${month}`);
      setLateComingData(response.data);
    } catch (error) {
      setLateComingData(null);
    }
  };

  const isLate = (day) => lateComingData?.late_days?.includes(day);

  const handlePreviousMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else { setMonth(month - 1); } };
  const handleNextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else { setMonth(month + 1); } };

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
      '-': 'bg-slate-50 text-slate-300 border-slate-100',
    };
    return colors[status] || 'bg-white text-slate-600 border-slate-200';
  };

  const getStatusLabel = (status) => {
    const labels = { 'P': 'Present', 'PL': 'Paid Leave', 'CL': 'Casual Leave', 'PL/2': 'Half Day PL', 'CL/2': 'Half Day CL', 'PL/2 & CL/2': 'PL/2 & CL/2', 'OT': 'Overtime', 'OT/2': 'Half Overtime', 'WO': 'Week Off', 'H': 'Holiday', '-': 'Future' };
    return labels[status] || status;
  };

  const getStats = () => {
    if (!attendanceData) return { present: 0, leaves: 0, weekoffs: 0, ot: 0, compensation: 0 };
    const statuses = Object.values(attendanceData.attendance);
    return {
      present: statuses.filter(s => s === 'P').length,
      leaves: statuses.filter(s => ['PL', 'CL', 'PL/2', 'CL/2', 'PL/2 & CL/2'].includes(s)).length,
      weekoffs: statuses.filter(s => s === 'WO' || s === 'H').length,
      ot: statuses.filter(s => s === 'OT' || s === 'OT/2').length,
      compensation: attendanceData.compensation_dates?.length || 0
    };
  };

  const stats = getStats();

  if (loading && !attendanceData) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-100 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}</div>
            <div className="h-96 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 space-y-6" data-testid="employee-attendance-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Attendance</h1>
            <p className="text-sm text-slate-500 mt-1">View your monthly attendance & salary summary</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            {months[month - 1]} {year}
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9 border-slate-200" data-testid="prev-month-btn"><ChevronLeft className="w-4 h-4" /></Button>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" data-testid="month-select">
              {months.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" data-testid="year-select">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9 border-slate-200" data-testid="next-month-btn"><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { setYear(currentDate.getFullYear()); setMonth(currentDate.getMonth() + 1); }} className="ml-auto text-xs border-slate-200" data-testid="today-btn">Today</Button>
          </div>
        </div>

        {/* Salary Status Banner */}
        {lateMarkStatus && (
          <div className={`rounded-xl border-2 p-4 shadow-sm ${
            lateMarkStatus.salary_status === 'hold' 
              ? 'bg-red-50 border-red-300' 
              : 'bg-green-50 border-green-300'
          }`} data-testid="salary-status-banner">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                lateMarkStatus.salary_status === 'hold' 
                  ? 'bg-red-100' 
                  : 'bg-green-100'
              }`}>
                {lateMarkStatus.salary_status === 'hold' ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-bold text-lg ${
                    lateMarkStatus.salary_status === 'hold' 
                      ? 'text-red-800' 
                      : 'text-green-800'
                  }`}>
                    Salary Status: {lateMarkStatus.salary_status === 'hold' ? 'ON HOLD' : 'ACTIVE'}
                  </h3>
                </div>
                
                {lateMarkStatus.salary_status === 'hold' ? (
                  <div className="space-y-2">
                    {lateMarkStatus.has_late_mark && lateMarkStatus.late_projects?.length > 0 && (
                      <div>
                        <p className="text-sm text-red-700 font-medium mb-1">Late Project(s):</p>
                        <div className="flex flex-wrap gap-2">
                          {lateMarkStatus.late_projects.map((proj, idx) => (
                            <span key={idx} className="inline-flex items-center bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              {proj.project_name} ({proj.project_code})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 mt-3 p-3 bg-red-100/50 rounded-lg border border-red-200">
                      <MessageCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">
                        <strong>Important:</strong> Your salary is currently on hold due to late project delivery. 
                        Please contact your respective <strong>Project Manager</strong> to discuss and resolve this status. 
                        Once the project status is updated, your salary hold will be reviewed by the admin team.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-700">
                    Your salary for {months[month - 1]} {year} is active. No issues found.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            { label: 'Leaves', value: stats.leaves, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            { label: 'Week Off / Holiday', value: stats.weekoffs, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100' },
            { label: 'Overtime', value: stats.ot, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
            { label: 'Compensation', value: stats.compensation, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`} data-testid={`stat-${s.label.toLowerCase().replace(/[\s/]+/g, '-')}`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        {attendanceData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-slate-400 text-xs py-2 uppercase tracking-wider">{day}</div>
              ))}
              {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square" />
              ))}
              {attendanceData.dates.map((day) => {
                const status = attendanceData.attendance[day] || '-';
                const isToday = day === currentDate.getDate() && month === currentDate.getMonth() + 1 && year === currentDate.getFullYear();
                const isCompensation = attendanceData.compensation_dates?.includes(day);
                const late = isLate(day);
                return (
                  <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center p-1 border transition-colors relative ${isToday ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : isCompensation ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-100'}`} data-testid={`day-${day}`} title={`${getStatusLabel(status)}${isCompensation ? ' (Compensation)' : ''}${late ? ' - Late Coming' : ''}`}>
                    <div className={`text-xs font-semibold ${isToday ? 'text-slate-900' : 'text-slate-500'}`}>{day}</div>
                    <div className={`text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded border ${getStatusColor(status)}`}>{status}</div>
                    {isCompensation && <div className="text-[8px] font-bold text-emerald-700 mt-0.5 leading-none" data-testid={`comp-${day}`}>COMP</div>}
                    {late && status === 'P' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white shadow-sm" title="Late Coming">
                        <Clock size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Salary Summary */}
        {salaryData && salaryData.salary > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="salary-summary">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <IndianRupee size={16} className="text-slate-500" />
                Salary Summary - {months[month - 1]} {year}
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Base Salary</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{fmt(salaryData.salary)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-[10px] font-medium text-green-500 uppercase tracking-wider">Gross Salary</p>
                  <p className="text-lg font-bold text-green-700 mt-0.5">{fmt(salaryData.gross_salary)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Total Deductions</p>
                  <p className="text-lg font-bold text-red-600 mt-0.5">{fmt(salaryData.pt + salaryData.esic + salaryData.epf + salaryData.cpf + salaryData.cl_amount + salaryData.sandwich_amount)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full" data-testid="salary-breakdown-table">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-3">Description</th>
                      <th className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-3">Days/Hrs</th>
                      <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2.5 px-3 text-sm text-slate-700">Base Salary</td>
                      <td className="py-2.5 px-3 text-center text-xs text-slate-400">{salaryData.num_days} days</td>
                      <td className="py-2.5 px-3 text-right text-sm font-medium text-slate-800">{fmt(salaryData.salary)}</td>
                    </tr>
                    {salaryData.pt > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-600">Professional Tax (PT)</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-red-600">-{fmt(salaryData.pt)}</td>
                      </tr>
                    )}
                    {salaryData.esic > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-600">ESIC</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-red-600">-{fmt(salaryData.esic)}</td>
                      </tr>
                    )}
                    {salaryData.epf > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-600">EPF</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-red-600">-{fmt(salaryData.epf)}</td>
                      </tr>
                    )}
                    {salaryData.cpf > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-600">CPF</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-red-600">-{fmt(salaryData.cpf)}</td>
                      </tr>
                    )}
                    {salaryData.cl_count > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-600">Casual Leave Deduction</td>
                        <td className="py-2.5 px-3 text-center text-xs text-slate-400">{salaryData.cl_count} day{salaryData.cl_count !== 1 ? 's' : ''} ({salaryData.cl_dates?.join(', ')})</td>
                        <td className="py-2.5 px-3 text-right text-sm text-red-600">-{fmt(salaryData.cl_amount)}</td>
                      </tr>
                    )}
                    {salaryData.sandwich_days > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-orange-600">Sandwich Leave Deduction</td>
                        <td className="py-2.5 px-3 text-center text-xs text-orange-400">{salaryData.sandwich_days} day{salaryData.sandwich_days !== 1 ? 's' : ''} ({salaryData.sandwich_dates?.join(', ')})</td>
                        <td className="py-2.5 px-3 text-right text-sm text-orange-600">-{fmt(salaryData.sandwich_amount)}</td>
                      </tr>
                    )}
                    {salaryData.late_coming_count > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-orange-600">Late Coming Deduction</td>
                        <td className="py-2.5 px-3 text-center text-xs text-orange-400">
                          {salaryData.late_coming_count} late{salaryData.late_coming_count !== 1 ? 's' : ''} 
                          ({salaryData.late_coming_days?.join(', ')})
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm text-orange-600">
                          {salaryData.late_coming_amount > 0 ? `-${fmt(salaryData.late_coming_amount)}` : '0'}
                        </td>
                      </tr>
                    )}
                    {salaryData.ot_count > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-green-700">Overtime Earnings</td>
                        <td className="py-2.5 px-3 text-center text-xs text-green-500">{salaryData.ot_count} day{salaryData.ot_count !== 1 ? 's' : ''}</td>
                        <td className="py-2.5 px-3 text-right text-sm text-green-600">+{fmt(salaryData.ot_amount)}</td>
                      </tr>
                    )}
                    {salaryData.other_income > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-green-700">Other Income</td>
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-sm text-green-600">+{fmt(salaryData.other_income)}</td>
                      </tr>
                    )}
                    {salaryData.extra_hours > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-green-700">Extra Hours Earnings</td>
                        <td className="py-2.5 px-3 text-center text-xs text-green-500">{salaryData.extra_hours} hrs</td>
                        <td className="py-2.5 px-3 text-right text-sm text-green-600">+{fmt(salaryData.extra_hours_amount)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={2} className="py-3 px-3 text-sm font-bold text-slate-800">Net Gross Salary</td>
                      <td className="py-3 px-3 text-right text-base font-bold text-blue-600">{fmt(salaryData.gross_salary)}</td>
                    </tr>
                    {(salaryData.future_days || 0) > 0 && (
                      <tr className="border-t border-slate-200 bg-violet-50/50">
                        <td colSpan={2} className="py-3 px-3 text-sm font-bold text-violet-700">Till Date Salary (TD)</td>
                        <td className="py-3 px-3 text-right text-base font-bold text-violet-600">{fmt(salaryData.td_salary)}</td>
                      </tr>
                    )}
                    {(salaryData.future_days || 0) > 0 && (
                      <tr className="bg-violet-50/30">
                        <td colSpan={2} className="py-1.5 px-3 text-[10px] text-violet-400">Future days not yet earned ({salaryData.future_days} days)</td>
                        <td className="py-1.5 px-3 text-right text-[10px] text-violet-400">-{fmt(salaryData.future_amount)}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {['P', 'PL', 'CL', 'PL/2', 'CL/2', 'PL/2 & CL/2', 'OT', 'OT/2', 'WO', 'H', '-'].map((status) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-7 h-7 flex items-center justify-center rounded border text-[10px] font-bold ${getStatusColor(status)}`}>{status}</div>
                <span className="text-xs text-slate-500">{getStatusLabel(status)}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-[8px] font-bold text-emerald-700">COMP</div>
              <span className="text-xs text-slate-500">Compensation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-500 border border-orange-600">
                <Clock size={12} className="text-white" />
              </div>
              <span className="text-xs text-slate-500">Late Coming</span>
            </div>
          </div>
        </div>

        {/* Late Coming Warning */}
        {lateComingData && lateComingData.total_late > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <Clock className="text-orange-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800">Late Coming: {lateComingData.total_late} day{lateComingData.total_late > 1 ? 's' : ''}</h3>
                <p className="text-sm text-orange-700 mt-1">
                  You have been marked late on: <strong>{lateComingData.late_days?.join(', ')}</strong> of this month.
                </p>
                <p className="text-xs text-orange-600 mt-2">Please ensure timely attendance to avoid any impact on your records.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
