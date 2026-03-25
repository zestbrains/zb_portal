import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { AlertTriangle, Search, Users, FolderKanban, Download } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function LateMarks({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLateMarks();
  }, []);

  const fetchLateMarks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/late-marks');
      setData(res.data);
    } catch (error) {
      toast.error('Error fetching late marks data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data?.late_marks?.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.employee_name.toLowerCase().includes(searchLower) ||
      item.employee_id.toLowerCase().includes(searchLower) ||
      item.project_name.toLowerCase().includes(searchLower) ||
      item.project_code.toLowerCase().includes(searchLower) ||
      item.client_name?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Group by employee for better visualization
  const groupedByEmployee = filteredData.reduce((acc, item) => {
    if (!acc[item.employee_id]) {
      acc[item.employee_id] = {
        employee_id: item.employee_id,
        employee_name: item.employee_name,
        employee_email: item.employee_email,
        departments: item.departments,
        projects: []
      };
    }
    acc[item.employee_id].projects.push({
      project_id: item.project_id,
      project_name: item.project_name,
      project_code: item.project_code,
      client_name: item.client_name,
      start_date: item.start_date,
      end_date: item.end_date
    });
    return acc;
  }, {});

  const exportToCSV = () => {
    if (!filteredData.length) return;
    
    const headers = ['Employee ID', 'Employee Name', 'Email', 'Departments', 'Project Code', 'Project Name', 'Client', 'Start Date', 'End Date'];
    const rows = filteredData.map(item => [
      item.employee_id,
      item.employee_name,
      item.employee_email,
      item.departments?.join('; ') || '',
      item.project_code,
      item.project_name,
      item.client_name || '',
      item.start_date || '',
      item.end_date || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `late_marks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <p className="text-sm text-slate-500 mt-1">Employees assigned to projects marked as late</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2" disabled={!filteredData.length}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Late Marks</p>
                  <p className="text-2xl font-bold text-red-600">{data.total_late_marks}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Employees Affected</p>
                  <p className="text-2xl font-bold text-orange-600">{data.unique_employees}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{data.unique_projects}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search by employee, project, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Late Marks Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredData.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertTriangle className="mx-auto mb-2 text-slate-300" size={40} />
              <p className="font-medium">No late marks found</p>
              <p className="text-sm">All projects are on track!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Employee</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Department</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Project</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Client</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, idx) => (
                    <tr key={`${item.employee_id}-${item.project_code}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{item.employee_name}</p>
                          <p className="text-xs text-slate-500">{item.employee_id}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {item.departments?.map((dept, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{dept}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{item.project_name}</p>
                          <p className="text-xs text-blue-600 font-mono">{item.project_code}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-700">{item.client_name || '-'}</p>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-500">
                          {item.start_date && (
                            <p>Start: {new Date(item.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          )}
                          {item.end_date && item.end_date !== 'NULL' && (
                            <p>End: {new Date(item.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          )}
                          {!item.start_date && (!item.end_date || item.end_date === 'NULL') && <p>-</p>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Grouped View by Employee */}
        {Object.keys(groupedByEmployee).length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Grouped by Employee</h2>
            <div className="grid gap-4">
              {Object.values(groupedByEmployee).map(emp => (
                <div key={emp.employee_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{emp.employee_name}</h3>
                      <p className="text-xs text-slate-500">{emp.employee_id} • {emp.employee_email}</p>
                    </div>
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {emp.projects.length} Late Project{emp.projects.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emp.projects.map((proj, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                        <p className="font-medium text-red-800">{proj.project_name}</p>
                        <p className="text-xs text-red-600">{proj.project_code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
