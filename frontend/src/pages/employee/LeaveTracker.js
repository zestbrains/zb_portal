import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export default function EmployeeLeaveTracker({ user, onLogout }) {
  const [leaveData, setLeaveData] = useState(null);
  const [activeYearTab, setActiveYearTab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMyLeaveDetails(); }, []);

  const fetchMyLeaveDetails = async () => {
    try {
      const response = await api.get('/leaves/my-details');
      setLeaveData(response.data);
      const currentYear = response.data.years_data.find(y => y.is_current);
      setActiveYearTab(currentYear ? currentYear.year_number : response.data.years_data.length);
    } catch (error) {
      toast.error('Error fetching leave details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const getActiveYearData = () => leaveData?.years_data?.find(y => y.year_number === activeYearTab) || null;

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-100 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!leaveData) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No leave data found</p>
          </div>
        </div>
      </Layout>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon size={20} /></div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="employee-leave-tracker-page">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Leave Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">View your leave history and balance</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Calendar} label="Available PL" value={leaveData.current_year_available_pl.toFixed(1)} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Clock} label="PL Taken" value={leaveData.current_year_pl_taken.toFixed(1)} color="bg-red-50 text-red-600" />
          <StatCard icon={Calendar} label="CL Taken" value={leaveData.current_year_cl_taken.toFixed(1)} color="bg-amber-50 text-amber-600" />
          <StatCard icon={CheckCircle} label="Years of Service" value={leaveData.total_years} color="bg-green-50 text-green-600" />
        </div>

        {/* Employee Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-slate-400 text-xs uppercase tracking-wider">Employee ID</span><p className="font-semibold text-slate-800">{leaveData.employee_id}</p></div>
            <div><span className="text-slate-400 text-xs uppercase tracking-wider">Name</span><p className="font-semibold text-slate-800">{leaveData.name}</p></div>
            <div><span className="text-slate-400 text-xs uppercase tracking-wider">Joining Date</span><p className="font-semibold text-slate-800">{formatDate(leaveData.joining_date)}</p></div>
          </div>
        </div>

        {/* Year-wise Details */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Year Tabs */}
          <div className="flex gap-2 p-4 border-b border-slate-200 overflow-x-auto" data-testid="year-tabs">
            {leaveData.years_data.map((yearData) => (
              <button
                key={yearData.year_number}
                onClick={() => setActiveYearTab(yearData.year_number)}
                data-testid={`year-tab-${yearData.year_number}`}
                className={`px-4 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                  activeYearTab === yearData.year_number
                    ? 'bg-slate-900 text-white'
                    : yearData.is_closed
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                {yearData.year_label} {yearData.is_closed ? '(Closed)' : '(Active)'}
              </button>
            ))}
          </div>

          {/* Year Content */}
          {getActiveYearData() && (() => {
            const yearData = getActiveYearData();
            return (
              <div className="p-4 md:p-6 space-y-6">
                {/* Year Summary */}
                <div className={`p-4 rounded-xl border ${yearData.is_closed ? 'bg-amber-50/50 border-amber-200' : 'bg-green-50/50 border-green-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm text-slate-700">{formatDate(yearData.start_date)} - {formatDate(yearData.end_date)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${yearData.is_closed ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>{yearData.is_closed ? 'Closed' : 'Active'}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 uppercase tracking-wider">PL Taken</div><div className="text-xl font-bold text-red-600 mt-1">{yearData.pl_taken.toFixed(1)}</div></div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 uppercase tracking-wider">CL Taken</div><div className="text-xl font-bold text-amber-600 mt-1">{yearData.cl_taken.toFixed(1)}</div></div>
                    {yearData.is_closed ? (
                      <div className="bg-white p-3 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 uppercase tracking-wider">Settled PL</div><div className="text-xl font-bold text-indigo-600 mt-1">{yearData.settled_pl.toFixed(1)}</div></div>
                    ) : (
                      <div className="bg-white p-3 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 uppercase tracking-wider">Available PL</div><div className="text-xl font-bold text-green-600 mt-1">{yearData.available_pl.toFixed(1)}</div></div>
                    )}
                    <div className="bg-white p-3 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 uppercase tracking-wider">{yearData.is_closed ? 'Encashment' : 'Next Encashment'}</div><div className="text-sm font-semibold text-blue-600 mt-1">{yearData.encash_month}</div></div>
                  </div>
                </div>

                {/* Monthly Records */}
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 mb-3">Monthly Leave Records</h4>
                  {yearData.monthly_leaves.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-400">No leave records for this year</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {yearData.monthly_leaves.map((monthData, idx) => {
                        const allLeaves = [...monthData.leaves.pl, ...monthData.leaves.cl].sort((a, b) => new Date(b.date) - new Date(a.date));
                        return (
                          <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden" data-testid={`month-${monthData.month.replace(' ', '-')}`}>
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200">
                              <span className="font-semibold text-sm text-slate-700">{monthData.month}</span>
                              <div className="flex gap-3 text-xs font-medium">
                                <span className="text-red-600">PL: {monthData.leaves.pl_total.toFixed(1)}</span>
                                <span className="text-amber-600">CL: {monthData.leaves.cl_total.toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {allLeaves.map((leave) => (
                                <div key={leave.id} className="flex items-center justify-between px-4 py-2.5">
                                  <div className="flex items-center gap-4">
                                    <span className="font-mono text-xs text-slate-500 w-24">{formatDate(leave.date)}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${leave.type === 'PL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{leave.days} {leave.type}</span>
                                  </div>
                                  <span className="text-xs text-slate-400 capitalize">{leave.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
