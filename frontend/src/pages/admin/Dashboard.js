import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Users, FolderKanban, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Award, Calendar, Cake, PartyPopper } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [employeesOnLeave, setEmployeesOnLeave] = useState({ today: [], tomorrow: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes, holidaysRes, birthdaysRes, leaveRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/admin-analytics'),
        api.get('/holidays/upcoming'),
        api.get('/birthdays/upcoming'),
        api.get('/dashboard/employees-on-leave')
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setHolidays(holidaysRes.data);
      setBirthdays(birthdaysRes.data);
      setEmployeesOnLeave(leaveRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const projectPieData = analytics ? [
    { name: 'Completed', value: analytics.project_overview.completed, color: '#10B981' },
    { name: 'In Progress', value: analytics.project_overview.in_progress, color: '#3B82F6' },
    { name: 'Late', value: analytics.project_overview.late, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
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
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="admin-dashboard">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {user.username}. Here's your company overview.</p>
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
              <StatCard icon={FolderKanban} label="Active Projects" value={analytics?.project_overview.active || 0} color="bg-blue-50 text-blue-600" />
              <StatCard icon={CheckCircle} label="Completed" value={analytics?.project_overview.completed || 0} color="bg-green-50 text-green-600" />
              <StatCard icon={Clock} label="In Progress" value={analytics?.project_overview.in_progress || 0} color="bg-amber-50 text-amber-600" />
              <StatCard icon={AlertTriangle} label="Late Projects" value={analytics?.project_overview.late || 0} color="bg-red-50 text-red-600" />
              <StatCard icon={Users} label="Active Employees" value={stats?.total_employees || 0} color="bg-slate-100 text-slate-700" />
            </div>

            {/* Leave Today/Tomorrow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    On Leave Today ({employeesOnLeave.today?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeesOnLeave.today?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {employeesOnLeave.today.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.employee_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.day_type === 'half' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {emp.day_type === 'half' ? 'Half Day' : 'Full Day'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No employees on leave today</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    On Leave Tomorrow ({employeesOnLeave.tomorrow?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeesOnLeave.tomorrow?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {employeesOnLeave.tomorrow.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.employee_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.day_type === 'half' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                            {emp.day_type === 'half' ? 'Half Day' : 'Full Day'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No employees on leave tomorrow</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Project Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  {projectPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={projectPieData} cx="50%" cy="50%" labelLine={false} label={({ name, value, percent }) => `${name}: ${value}`} outerRadius={95} fill="#8884d8" dataKey="value">
                          {projectPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No project data available</div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Completion Trends (6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.monthly_trends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={analytics.monthly_trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" fontSize={12} stroke="#94A3B8" />
                        <YAxis fontSize={12} stroke="#94A3B8" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
                        <Line type="monotone" dataKey="delayed" stroke="#EF4444" strokeWidth={2} name="Delayed" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">No trend data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Employee Performance */}
            <Card className="border-slate-200 shadow-sm mb-8">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-800">Employee Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.employee_performance?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analytics.employee_performance.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={80} stroke="#94A3B8" />
                      <YAxis fontSize={12} stroke="#94A3B8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed_on_time" fill="#10B981" name="On Time" stackId="a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed_late" fill="#EF4444" name="Late" stackId="a" />
                      <Bar dataKey="ongoing" fill="#3B82F6" name="Ongoing" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            {/* Performers + Late */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <Award size={16} /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.top_performers?.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.top_performers.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.employee_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{emp.completed_on_time}</p>
                            <p className="text-xs text-slate-400">{emp.total_assigned} total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-400 text-center py-4 text-sm">No data</p>)}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <TrendingDown size={16} /> Needs Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.low_performers?.filter(e => e.completed_late > 0).length > 0 ? (
                    <div className="space-y-2">
                      {analytics.low_performers.filter(e => e.completed_late > 0).map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.employee_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-amber-600">{emp.completed_late} Late</p>
                            <p className="text-xs text-slate-400">{emp.total_assigned} total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-400 text-center py-4 text-sm">No delays</p>)}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertTriangle size={16} /> Late Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.late_by_employee?.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.late_by_employee.slice(0, 5).map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[140px]" title={emp.projects.join(', ')}>{emp.projects.slice(0, 2).join(', ')}</p>
                          </div>
                          <p className="text-lg font-bold text-red-600">{emp.count}</p>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-green-500 text-center py-4 text-sm">No late projects</p>)}
                </CardContent>
              </Card>
            </div>

            {/* Late Projects Table */}
            {analytics?.late_projects?.length > 0 && (
              <Card className="border-slate-200 shadow-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Late Projects Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Project Name</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Code</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">End Date</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.late_projects.map((proj, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{proj.name}</td>
                            <td className="py-3 px-4 text-sm text-slate-500 font-mono">{proj.project_code}</td>
                            <td className="py-3 px-4 text-sm text-red-600">{new Date(proj.end_date).toLocaleDateString()}</td>
                            <td className="py-3 px-4"><span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">{proj.status}</span></td>
                            <td className="py-3 px-4 text-sm text-slate-600">{proj.assigned_employees?.length || 0} employees</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Holidays & Birthdays */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PartyPopper size={16} className="text-indigo-500" /> Upcoming Holidays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {holidays.length > 0 ? (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {holidays.map((holiday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{holiday.name}</p>
                            {holiday.description && <p className="text-xs text-slate-400">{holiday.description}</p>}
                          </div>
                          <p className="text-sm font-semibold text-indigo-600">{formatDate(holiday.date)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-slate-400 text-center py-4 text-sm">No upcoming holidays</p>)}
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Cake size={16} className="text-pink-500" /> Upcoming Birthdays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {birthdays.length > 0 ? (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {birthdays.map((bday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm text-slate-800">{bday.name}</p>
                            <p className="text-xs text-slate-400">ID: {bday.employee_id}</p>
                          </div>
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
