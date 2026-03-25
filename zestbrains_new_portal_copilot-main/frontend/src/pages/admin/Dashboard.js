import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Users, Building2, FolderKanban, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Award, Calendar, Cake, PartyPopper } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [employeesOnLeave, setEmployeesOnLeave] = useState({ today: [], tomorrow: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const projectPieData = analytics ? [
    { name: 'Completed', value: analytics.project_overview.completed, color: '#10B981' },
    { name: 'In Progress', value: analytics.project_overview.in_progress, color: '#3B82F6' },
    { name: 'Late', value: analytics.project_overview.late, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-6 lg:p-8" data-testid="admin-dashboard">
        <div className="mb-4 md:mb-6 lg:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600">Welcome back, {user.username}! Here's your company overview.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <FolderKanban className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="text-xs md:text-sm opacity-80">Active Projects</p>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.project_overview.active || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="text-xs md:text-sm opacity-80">Completed</p>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.project_overview.completed || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Clock className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="text-xs md:text-sm opacity-80">In Progress</p>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.project_overview.in_progress || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="text-xs md:text-sm opacity-80">Late Projects</p>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.project_overview.late || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white col-span-2 md:col-span-1">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Users className="w-5 h-5 md:w-6 md:h-6" />
                    <div>
                      <p className="text-xs md:text-sm opacity-80">Active Employees</p>
                      <p className="text-xl md:text-2xl font-bold">{stats?.total_employees || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employees on Leave Today & Tomorrow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Today's Leave */}
              <Card className="shadow-lg border-l-4 border-l-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Calendar size={20} />
                    On Leave Today ({employeesOnLeave.today?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeesOnLeave.today?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {employeesOnLeave.today.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.employee_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            emp.day_type === 'half' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {emp.day_type === 'half' ? 'Half Day' : 'Full Day'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No employees on leave today</p>
                  )}
                </CardContent>
              </Card>

              {/* Tomorrow's Leave */}
              <Card className="shadow-lg border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Calendar size={20} />
                    On Leave Tomorrow ({employeesOnLeave.tomorrow?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeesOnLeave.tomorrow?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {employeesOnLeave.tomorrow.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.employee_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            emp.day_type === 'half' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {emp.day_type === 'half' ? 'Half Day' : 'Full Day'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No employees on leave tomorrow</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Project Status Pie Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban size={20} />
                    Project Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projectPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={projectPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
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
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      No project data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends Line Chart */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} />
                    Project Completion Trends (Last 6 Months)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.monthly_trends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.monthly_trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
                        <Line type="monotone" dataKey="delayed" stroke="#EF4444" strokeWidth={2} name="Delayed" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400">
                      No trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Employee Performance Bar Chart */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  Employee Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.employee_performance?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.employee_performance.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={80} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed_on_time" fill="#10B981" name="On Time" stackId="a" />
                      <Bar dataKey="completed_late" fill="#EF4444" name="Late" stackId="a" />
                      <Bar dataKey="ongoing" fill="#3B82F6" name="Ongoing" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-gray-400">
                    No employee performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top & Low Performers + Late Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Top Performers */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Award size={20} />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.top_performers?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.top_performers.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.employee_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{emp.completed_on_time} On-time</p>
                            <p className="text-xs text-gray-500">{emp.total_assigned} total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Low Performers */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <TrendingDown size={20} />
                    Needs Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.low_performers?.filter(e => e.completed_late > 0).length > 0 ? (
                    <div className="space-y-3">
                      {analytics.low_performers.filter(e => e.completed_late > 0).map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.employee_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-600">{emp.completed_late} Late</p>
                            <p className="text-xs text-gray-500">{emp.total_assigned} total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No delays reported</p>
                  )}
                </CardContent>
              </Card>

              {/* Late Projects by Employee */}
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle size={20} />
                    Late Projects by Employee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.late_by_employee?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.late_by_employee.slice(0, 5).map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{emp.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]" title={emp.projects.join(', ')}>
                              {emp.projects.slice(0, 2).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{emp.count}</p>
                            <p className="text-xs text-gray-500">late</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-500 text-center py-4">No late projects!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Late Projects Table */}
            {analytics?.late_projects?.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle size={20} />
                    Late Projects Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Project Code</th>
                          <th>End Date</th>
                          <th>Status</th>
                          <th>Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.late_projects.map((proj, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold">{proj.name}</td>
                            <td>{proj.project_code}</td>
                            <td className="text-red-600">{new Date(proj.end_date).toLocaleDateString()}</td>
                            <td>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                {proj.status}
                              </span>
                            </td>
                            <td>{proj.assigned_employees?.length || 0} employees</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Holidays & Birthdays Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {birthdays.map((bday, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-gray-800">{bday.name}</p>
                            <p className="text-xs text-gray-500">ID: {bday.employee_id}</p>
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
                    <p className="text-gray-400 text-center py-4">No upcoming birthdays in next 30 days</p>
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
