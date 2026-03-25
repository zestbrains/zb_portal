import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export default function EmployeeLeaveTracker({ user, onLogout }) {
  const [leaveData, setLeaveData] = useState(null);
  const [activeYearTab, setActiveYearTab] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyLeaveDetails();
  }, []);

  const fetchMyLeaveDetails = async () => {
    try {
      const response = await api.get('/leaves/my-details');
      setLeaveData(response.data);
      // Set active tab to current year
      const currentYear = response.data.years_data.find(y => y.is_current);
      setActiveYearTab(currentYear ? currentYear.year_number : response.data.years_data.length);
    } catch (error) {
      toast.error('Error fetching leave details');
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

  const getActiveYearData = () => {
    if (!leaveData || !activeYearTab) return null;
    return leaveData.years_data.find(y => y.year_number === activeYearTab);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-8 text-center text-gray-500">Loading leave details...</div>
      </Layout>
    );
  }

  if (!leaveData) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-8 text-center text-gray-500">No leave data found</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="employee-leave-tracker-page">
        {/* Header with Summary */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Leave Tracker</h1>
          <p className="text-gray-600">View your leave history and balance</p>
        </div>

        {/* Current Year Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar size={24} />
                <div>
                  <p className="text-sm opacity-80">Available PL</p>
                  <p className="text-2xl font-bold">{leaveData.current_year_available_pl.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock size={24} />
                <div>
                  <p className="text-sm opacity-80">PL Taken (This Year)</p>
                  <p className="text-2xl font-bold">{leaveData.current_year_pl_taken.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar size={24} />
                <div>
                  <p className="text-sm opacity-80">CL Taken (This Year)</p>
                  <p className="text-2xl font-bold">{leaveData.current_year_cl_taken.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <p className="text-sm opacity-80">Years of Service</p>
                  <p className="text-2xl font-bold">{leaveData.total_years}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Employee ID:</span>
                <span className="ml-2 font-semibold">{leaveData.employee_id}</span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-semibold">{leaveData.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Joining Date:</span>
                <span className="ml-2 font-semibold">{formatDate(leaveData.joining_date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year-wise Leave Details */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {/* Year Tabs */}
            <div className="flex gap-2 border-b pb-4 mb-6 flex-wrap" data-testid="year-tabs">
              {leaveData.years_data.map((yearData) => (
                <button
                  key={yearData.year_number}
                  onClick={() => setActiveYearTab(yearData.year_number)}
                  data-testid={`year-tab-${yearData.year_number}`}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeYearTab === yearData.year_number
                      ? 'bg-blue-600 text-white'
                      : yearData.is_closed
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {yearData.year_label} {yearData.is_closed ? '(Closed)' : '(Active)'}
                </button>
              ))}
            </div>

            {/* Year Content */}
            {getActiveYearData() && (
              <div>
                {(() => {
                  const yearData = getActiveYearData();
                  return (
                    <div className="space-y-6">
                      {/* Year Summary Header */}
                      <div className={`p-4 rounded-lg ${yearData.is_closed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={18} className={yearData.is_closed ? 'text-amber-600' : 'text-green-600'} />
                            <span className="font-semibold">
                              {formatDate(yearData.start_date)} - {formatDate(yearData.end_date)}
                            </span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            yearData.is_closed ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'
                          }`}>
                            {yearData.is_closed ? 'Closed' : 'Active'}
                          </span>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-500">Total PL Taken</div>
                            <div className="text-xl font-bold text-red-600">{yearData.pl_taken.toFixed(1)}</div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-500">Total CL Taken</div>
                            <div className="text-xl font-bold text-orange-600">{yearData.cl_taken.toFixed(1)}</div>
                          </div>
                          {yearData.is_closed ? (
                            <div className="bg-white p-3 rounded border">
                              <div className="text-xs text-gray-500">Settled PL (Encashed)</div>
                              <div className="text-xl font-bold text-purple-600">{yearData.settled_pl.toFixed(1)}</div>
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded border">
                              <div className="text-xs text-gray-500">Available PL</div>
                              <div className="text-xl font-bold text-green-600">{yearData.available_pl.toFixed(1)}</div>
                            </div>
                          )}
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-500">
                              {yearData.is_closed ? 'Encashment Month' : 'Next Encashment'}
                            </div>
                            <div className="text-sm font-semibold text-blue-600">{yearData.encash_month}</div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Leave Records (Read-only) */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-700">Monthly Leave Records</h4>
                        {yearData.monthly_leaves.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg">
                            No leave records for this year
                          </div>
                        ) : (
                          yearData.monthly_leaves.map((monthData, idx) => {
                            const allLeaves = [...monthData.leaves.pl, ...monthData.leaves.cl].sort(
                              (a, b) => new Date(b.date) - new Date(a.date)
                            );
                            
                            return (
                              <div key={idx} className="border rounded-lg bg-white" data-testid={`month-${monthData.month.replace(' ', '-')}`}>
                                <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
                                  <div className="font-semibold text-gray-800">{monthData.month}</div>
                                  <div className="flex gap-4 text-sm">
                                    <span className="text-red-600">PL: {monthData.leaves.pl_total.toFixed(1)}</span>
                                    <span className="text-orange-600">CL: {monthData.leaves.cl_total.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="divide-y">
                                  {allLeaves.map((leave) => (
                                    <div key={leave.id} className="flex items-center justify-between p-3">
                                      <div className="flex items-center gap-4">
                                        <span className="font-mono text-sm w-24">{formatDate(leave.date)}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                          leave.type === 'PL' 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-orange-100 text-orange-800'
                                        }`}>
                                          {leave.days} {leave.type}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500 capitalize">{leave.status}</span>
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
