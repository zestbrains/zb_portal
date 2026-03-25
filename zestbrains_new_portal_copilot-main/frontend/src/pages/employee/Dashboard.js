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

  useEffect(() => {
    fetchAnalytics();
  }, []);

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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const projectPieData = analytics ? [
    { name: 'On Time', value: analytics.project_summary.on_time, color: '#10B981' },
    { name: 'Late', value: analytics.project_summary.late, color: '#EF4444' },
    { name: 'Ongoing', value: analytics.project_summary.ongoing, color: '#3B82F6' },
  ].filter(d => d.value > 0) : [];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="employee-dashboard">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-gray-600">Welcome back, {analytics?.employee?.name || user.username}!</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading your analytics...</div>
          </div>
        ) : (
          <>
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FolderKanban size={24} />
                    <div>
                      <p className="text-sm opacity-80">Total Assigned</p>
                      <p className="text-2xl font-bold">{analytics?.project_summary.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} />
                    <div>
                      <p className="text-sm opacity-80">Completed</p>
                      <p className="text-2xl font-bold">{analytics?.project_summary.completed || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock size={24} />
                    <div>
                      <p className="text-sm opacity-80">Ongoing</p>
                      <p className="text-2xl font-bold">{analytics?.project_summary.ongoing || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp size={24} />
                    <div>
                      <p className="text-sm opacity-80">On Time</p>
                      <p className="text-2xl font-bold">{analytics?.project_summary.on_time || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} />
                    <div>
                      <p className="text-sm opacity-80">Late</p>
                      <p className="text-2xl font-bold">{analytics?.project_summary.late || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leave Summary */}
            {analytics?.leave_summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Available PL</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.leave_summary.available_pl.toFixed(1)}</p>
                      </div>
                      <Calendar className="text-blue-400" size={32} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">PL Taken</p>
                        <p className="text-2xl font-bold text-red-600">{analytics.leave_summary.pl_taken.toFixed(1)}</p>
                      </div>
                      <Calendar className="text-red-400" size={32} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">CL Taken</p>
                        <p className="text-2xl font-bold text-orange-600">{analytics.leave_summary.cl_taken.toFixed(1)}</p>
                      </div>
                      <Calendar className="text-orange-400" size={32} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Project Status Pie Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban size={20} />
                    My Project Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={projectPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value}`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {projectPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-400">
                      No project data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal Trend Line Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} />
                    My Completion Trends (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.monthly_trends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={analytics.monthly_trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="on_time" stroke="#10B981" strokeWidth={2} name="On Time" />
                        <Line type="monotone" dataKey="late" stroke="#EF4444" strokeWidth={2} name="Late" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-400">
                      No trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hours by Project */}
            {analytics?.hours_by_project?.length > 0 && (
              <Card className="shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    Hours by Project (Top 5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.hours_by_project} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="project_name" type="category" fontSize={11} width={150} />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#4F46E5" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">
                      Total Work Hours: <span className="font-bold text-indigo-600">{analytics.total_work_hours} hours</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Projects */}
            {analytics?.recent_projects?.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban size={20} />
                    My Recent Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recent_projects.map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">{proj.name}</p>
                          {proj.end_date && (
                            <p className="text-xs text-gray-500">
                              Due: {new Date(proj.end_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          proj.status === 'completed' ? 'bg-green-100 text-green-800' :
                          proj.status === 'active' || proj.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {proj.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <a href="/employee/work-entry" className="block p-6 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200">
                <Clock size={32} className="text-indigo-600 mb-3" />
                <h4 className="font-semibold text-indigo-900">Log Work Hours</h4>
                <p className="text-sm text-indigo-700 mt-1">Record your daily work activities</p>
              </a>
              <a href="/employee/leave-tracker" className="block p-6 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200">
                <Calendar size={32} className="text-green-600 mb-3" />
                <h4 className="font-semibold text-green-900">Leave Tracker</h4>
                <p className="text-sm text-green-700 mt-1">View your leave history and balance</p>
              </a>
              <a href="/employee/leave-apply" className="block p-6 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200">
                <Calendar size={32} className="text-purple-600 mb-3" />
                <h4 className="font-semibold text-purple-900">Apply Leave</h4>
                <p className="text-sm text-purple-700 mt-1">Submit a new leave request</p>
              </a>
            </div>

            {/* Holidays & Birthdays Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Upcoming Holidays */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <PartyPopper size={20} />
                    Upcoming Festival Holidays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {holidays.length > 0 ? (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto">
                      {holidays.map((holiday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{holiday.name}</p>
                            {holiday.description && (
                              <p className="text-xs text-gray-500">{holiday.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-purple-600">{formatDate(holiday.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No upcoming holidays</p>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Birthdays */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-pink-600">
                    <Cake size={20} />
                    Upcoming Birthdays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {birthdays.length > 0 ? (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto">
                      {birthdays.map((bday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{bday.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-pink-600">{formatDate(bday.upcoming_date)}</p>
                            <p className="text-xs text-gray-500">
                              {bday.days_until === 0 ? '🎉 Today!' : `in ${bday.days_until} days`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No upcoming birthdays</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
