import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { FolderKanban, CheckCircle, Clock, AlertTriangle, Calendar, TrendingUp, PartyPopper, Cake } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function EmployeeDashboard({ user, onLogout }) {
  const [analytics, setAnalytics] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, holidaysRes, birthdaysRes] = await Promise.all([
        api.get('/dashboard/employee-analytics'),
        api.get('/holidays/upcoming'),
        api.get('/birthdays/upcoming')
      ]);
      setAnalytics(analyticsRes.data);
      setHolidays(holidaysRes.data);
      setBirthdays(birthdaysRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const projectPieData = analytics ? [
    { name: 'On Time', value: analytics.project_summary.on_time, color: '#10B981' },
    { name: 'Late', value: analytics.project_summary.late, color: '#EF4444' },
    { name: 'Ongoing', value: analytics.project_summary.ongoing, color: '#3B82F6' },
  ].filter(d => d.value > 0) : [];

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="employee-dashboard">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {analytics?.employee?.name || user.username}!</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-slate-100 mb-3" />
                <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
                <div className="h-6 w-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <StatCard icon={FolderKanban} label="Total Assigned" value={analytics?.project_summary.total || 0} color="bg-blue-50 text-blue-600" />
              <StatCard icon={CheckCircle} label="Completed" value={analytics?.project_summary.completed || 0} color="bg-green-50 text-green-600" />
              <StatCard icon={Clock} label="Ongoing" value={analytics?.project_summary.ongoing || 0} color="bg-amber-50 text-amber-600" />
              <StatCard icon={TrendingUp} label="On Time" value={analytics?.project_summary.on_time || 0} color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={AlertTriangle} label="Late" value={analytics?.project_summary.late || 0} color="bg-red-50 text-red-600" />
            </div>

            {/* Leave Summary */}
            {analytics?.leave_summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available PL</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{analytics.leave_summary.available_pl.toFixed(1)}</p>
                    </div>
                    <Calendar className="text-slate-300" size={28} />
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">PL Taken</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{analytics.leave_summary.pl_taken.toFixed(1)}</p>
                    </div>
                    <Calendar className="text-slate-300" size={28} />
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">CL Taken</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{analytics.leave_summary.cl_taken.toFixed(1)}</p>
                    </div>
                    <Calendar className="text-slate-300" size={28} />
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-800">My Project Status</CardTitle></CardHeader>
                <CardContent>
                  {projectPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={projectPieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={85} fill="#8884d8" dataKey="value">
                          {projectPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (<div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">No project data</div>)}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Completion Trends (6 Months)</CardTitle></CardHeader>
                <CardContent>
                  {analytics?.monthly_trends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={analytics.monthly_trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" fontSize={12} stroke="#94A3B8" />
                        <YAxis fontSize={12} stroke="#94A3B8" />
                        <Tooltip /><Legend />
                        <Line type="monotone" dataKey="on_time" stroke="#10B981" strokeWidth={2} name="On Time" />
                        <Line type="monotone" dataKey="late" stroke="#EF4444" strokeWidth={2} name="Late" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (<div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">No trend data</div>)}
                </CardContent>
              </Card>
            </div>

            {/* Hours by Project */}
            {analytics?.hours_by_project?.length > 0 && (
              <Card className="border-slate-200 shadow-sm mb-8">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Hours by Project (Top 5)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={analytics.hours_by_project} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" fontSize={12} stroke="#94A3B8" />
                      <YAxis dataKey="project_name" type="category" fontSize={11} width={150} stroke="#94A3B8" />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#3B82F6" name="Hours" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-sm text-slate-500 mt-3">Total: <span className="font-bold text-slate-800">{analytics.total_work_hours} hours</span></p>
                </CardContent>
              </Card>
            )}

            {/* Recent Projects */}
            {analytics?.recent_projects?.length > 0 && (
              <Card className="border-slate-200 shadow-sm mb-8">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Recent Projects</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.recent_projects.map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm text-slate-800">{proj.name}</p>
                          {proj.end_date && <p className="text-xs text-slate-400">Due: {new Date(proj.end_date).toLocaleDateString()}</p>}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          proj.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                          proj.status === 'active' || proj.status === 'running' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>{proj.status}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <a href="/employee/work-entry" className="block p-5 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 shadow-sm group" data-testid="quick-link-work-hours">
                <Clock size={24} className="text-blue-600 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800 group-hover:text-slate-900">Log Work Hours</h4>
                <p className="text-xs text-slate-400 mt-0.5">Record your daily work activities</p>
              </a>
              <a href="/employee/leave-tracker" className="block p-5 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 shadow-sm group" data-testid="quick-link-leave-tracker">
                <Calendar size={24} className="text-green-600 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800 group-hover:text-slate-900">Leave Tracker</h4>
                <p className="text-xs text-slate-400 mt-0.5">View leave history and balance</p>
              </a>
              <a href="/employee/leave-apply" className="block p-5 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 shadow-sm group" data-testid="quick-link-apply-leave">
                <Calendar size={24} className="text-indigo-600 mb-2" />
                <h4 className="font-semibold text-sm text-slate-800 group-hover:text-slate-900">Apply Leave</h4>
                <p className="text-xs text-slate-400 mt-0.5">Submit a new leave request</p>
              </a>
            </div>

            {/* Holidays & Birthdays */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700"><PartyPopper size={16} className="text-indigo-500" /> Upcoming Holidays</CardTitle></CardHeader>
                <CardContent>
                  {holidays.length > 0 ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {holidays.map((holiday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <div><p className="font-medium text-sm text-slate-800">{holiday.name}</p>{holiday.description && <p className="text-xs text-slate-400">{holiday.description}</p>}</div>
                          <p className="text-sm font-semibold text-indigo-600">{formatDate(holiday.date)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-400 text-center py-4 text-sm">No upcoming holidays</p>)}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Cake size={16} className="text-pink-500" /> Upcoming Birthdays</CardTitle></CardHeader>
                <CardContent>
                  {birthdays.length > 0 ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {birthdays.map((bday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <p className="font-medium text-sm text-slate-800">{bday.name}</p>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-pink-600">{formatDate(bday.upcoming_date)}</p>
                            <p className="text-xs text-slate-400">{bday.days_until === 0 ? 'Today!' : `in ${bday.days_until} days`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-400 text-center py-4 text-sm">No upcoming birthdays</p>)}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
