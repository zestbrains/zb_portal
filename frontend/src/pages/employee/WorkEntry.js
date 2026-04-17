import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Calendar, FolderKanban, Edit, Plus, Filter, ChevronLeft, ChevronRight, Trash2, Eye, X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function EmployeeWorkEntry({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEntries, setViewingEntries] = useState([]);
  const [viewingDate, setViewingDate] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFilter, setDateFilter] = useState({ from_date: '', to_date: '' });
  const [formData, setFormData] = useState({ project_code: '', hours: '', work_details: '', date: new Date().toISOString().split('T')[0] });
  const [editFormData, setEditFormData] = useState({ project_code: '', hours: '', work_details: '' });
  const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [editingDateEntries, setEditingDateEntries] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [allApprovalRequests, setAllApprovalRequests] = useState([]);
  const [approvalTab, setApprovalTab] = useState('pending');
  const [isProjectView, setIsProjectView] = useState(false);
  const [projectViewInfo, setProjectViewInfo] = useState({ status: '', name: '' });
  const [employees, setEmployees] = useState([]);

  const getTodayIST = () => { const n = new Date(); const ist = new Date(n.getTime() + (n.getTimezoneOffset() * 60000) + (5.5 * 3600000)); return ist.toISOString().split('T')[0]; };
  const getMinDate = () => { const d = new Date(); const ist = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (5.5 * 3600000)); ist.setDate(ist.getDate() - 2); return ist.toISOString().split('T')[0]; };
  const today = getTodayIST();

  useEffect(() => {
    const projectParam = searchParams.get('project');
    const sourceParam = searchParams.get('source');
    const statusParam = searchParams.get('status');
    const nameParam = searchParams.get('name');
    if (projectParam) setProjectFilter(projectParam);
    if (sourceParam === 'projects') { setIsProjectView(true); setProjectViewInfo({ status: statusParam || '', name: nameParam || projectParam || '' }); }
    fetchProjects(); fetchEntries();
    if (sourceParam === 'projects') fetchEmployees();
    if (sourceParam !== 'projects') { fetchPendingApprovals(); fetchAllApprovalRequests(); }
  }, []);

  useEffect(() => { applyFilters(); }, [entries, dateFilter, projectFilter]);

  const fetchProjects = async () => { try { const r = await api.get('/projects'); setProjects(r.data); setAssignedProjects(r.data.filter(p => p.assigned_employees?.length > 0)); } catch (e) {} };
  const fetchEntries = async () => {
    try {
      const src = searchParams.get('source'), proj = searchParams.get('project'), emp = searchParams.get('employee');
      if (src === 'projects' && proj) { let url = `/work-entries?project_code=${proj}`; if (emp) url += `&employee_id=${emp}`; const r = await api.get(url); setEntries(r.data); }
      else { const r = await api.get('/work-entries'); setEntries(r.data); }
    } catch (e) {}
  };
  const fetchEmployees = async () => { try { const r = await api.get('/employees'); setEmployees(r.data); } catch (e) {} };
  const getEmployeeName = (id) => { const e = employees.find(e => e.employee_id === id); return e ? e.name : id; };
  const fetchPendingApprovals = async () => { try { const r = await api.get('/weekend-approvals/my-pending'); setPendingApprovals(r.data || []); } catch (e) {} };
  const fetchAllApprovalRequests = async () => { try { const r = await api.get('/weekend-approvals/employee/my-requests'); setAllApprovalRequests(r.data || []); } catch (e) {} };

  const applyFilters = () => {
    let f = [...entries];
    if (projectFilter) f = f.filter(e => e.project_code === projectFilter);
    if (dateFilter.from_date) f = f.filter(e => e.date >= dateFilter.from_date);
    if (dateFilter.to_date) f = f.filter(e => e.date <= dateFilter.to_date);
    f.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredEntries(f); setCurrentPage(1);
  };
  const clearFilters = () => { setDateFilter({ from_date: '', to_date: '' }); setProjectFilter(''); setSearchParams({}); };
  const clearProjectFilter = () => { setProjectFilter(''); setSearchParams({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/work-entries', { ...formData, hours: parseFloat(formData.hours) });
      if (r.data.status === 'pending_approval') { toast.success(r.data.message, { description: 'Entry pending admin approval.', duration: 5000 }); fetchPendingApprovals(); }
      else { toast.success('Work entry added'); }
      setFormData({ project_code: '', hours: '', work_details: '', date: new Date().toISOString().split('T')[0] }); setAddDialogOpen(false); fetchEntries();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error adding entry'); }
  };

  const handleEdit = (entry) => { setEditingEntry(entry); setEditFormData({ project_code: entry.project_code, hours: entry.hours.toString(), work_details: entry.work_details }); setEditDialogOpen(true); };
  const handleEditDate = (date, entries) => { setEditingDate(date); setEditingDateEntries(entries.map(e => ({ ...e, hours: e.hours.toString(), isModified: false }))); setEditDateDialogOpen(true); };
  const updateEntryInModal = (id, field, value) => { setEditingDateEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value, isModified: true } : e)); };
  const handleSaveAllEntries = async () => {
    try {
      const modified = editingDateEntries.filter(e => e.isModified);
      for (const entry of modified) await api.put(`/work-entries/employee/${entry.id}`, { project_code: entry.project_code, hours: parseFloat(entry.hours), work_details: entry.work_details });
      toast.success(`Updated ${modified.length} entries`); setEditDateDialogOpen(false); fetchEntries();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error updating'); }
  };
  const handleDeleteFromModal = async (id, name) => { if (!window.confirm(`Delete entry for "${name}"?`)) return; try { await api.delete(`/work-entries/employee/${id}`); setEditingDateEntries(prev => prev.filter(e => e.id !== id)); toast.success('Deleted'); fetchEntries(); } catch (error) { toast.error('Error deleting'); } };
  const isEditable = (dateStr) => dateStr >= getTodayIST();

  const handleEditPendingApproval = async (a) => { const h = prompt(`Edit hours for ${getProjectName(a.project_code)}:`, a.original_hours); if (h === null) return; try { await api.put(`/weekend-approvals/employee/${a.id}`, { hours: parseFloat(h) }); toast.success('Updated'); fetchPendingApprovals(); } catch (error) { toast.error('Error'); } };
  const handleDeletePendingApproval = async (a) => { if (!window.confirm('Delete pending request?')) return; try { await api.delete(`/weekend-approvals/employee/${a.id}`); toast.success('Deleted'); fetchPendingApprovals(); fetchAllApprovalRequests(); } catch (error) { toast.error('Error'); } };
  const handleDeleteApprovalHistory = async (a) => { if (!window.confirm(`Delete ${a.status} entry?`)) return; try { await api.delete(`/weekend-approvals/employee/${a.id}`); toast.success('Deleted'); fetchAllApprovalRequests(); fetchEntries(); } catch (error) { toast.error('Error'); } };

  const handleUpdateEntry = async (e) => { e.preventDefault(); try { await api.put(`/work-entries/employee/${editingEntry.id}`, { ...editFormData, hours: parseFloat(editFormData.hours) }); toast.success('Updated'); setEditDialogOpen(false); fetchEntries(); } catch (error) { toast.error('Error'); } };
  const handleViewEntries = (entries, date) => { setViewingEntries(entries); setViewingDate(date); setViewDialogOpen(true); };
  const isToday = (dateStr) => dateStr === today;

  const groupEntriesByDate = (list) => {
    const g = {};
    list.forEach(entry => { if (!g[entry.date]) g[entry.date] = { date: entry.date, entries: [], totalHours: 0 }; g[entry.date].entries.push(entry); g[entry.date].totalHours += entry.hours; });
    return Object.values(g).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupedEntries = groupEntriesByDate(filteredEntries);
  const totalPages = Math.ceil(groupedEntries.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGroups = groupedEntries.slice(startIndex, startIndex + pageSize);
  const todayEntries = entries.filter(e => e.date === today);
  const totalHoursToday = todayEntries.reduce((s, e) => s + e.hours, 0);
  const totalHoursFiltered = filteredEntries.reduce((s, e) => s + e.hours, 0);
  const getProjectName = (code) => { const p = projects.find(p => p.project_code === code); return p ? p.name : code || 'Unknown'; };
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="work-entry-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{isProjectView ? 'Project Work Hours' : 'Working Hours'}</h1>
            <p className="text-sm text-slate-500 mt-1">{isProjectView ? 'View work hours for this project' : 'Log and view your daily work hours'}</p>
          </div>
          {!isProjectView && (
            <Button onClick={() => setAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm rounded-lg" data-testid="add-work-entry-btn"><Plus size={16} className="mr-1.5" /> Add Hours</Button>
          )}
        </div>

        {/* Project Banner */}
        {isProjectView && projectViewInfo.status && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${projectViewInfo.status.toLowerCase() === 'late' ? 'bg-red-50 border-red-200' : projectViewInfo.status.toLowerCase() === 'completed' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-center gap-3">
              <FolderKanban size={20} className={projectViewInfo.status.toLowerCase() === 'late' ? 'text-red-600' : projectViewInfo.status.toLowerCase() === 'completed' ? 'text-green-600' : 'text-blue-600'} />
              <div><p className="text-xs font-medium text-slate-500">Project Status</p><p className={`text-sm font-bold ${projectViewInfo.status.toLowerCase() === 'late' ? 'text-red-700' : projectViewInfo.status.toLowerCase() === 'completed' ? 'text-green-700' : 'text-blue-700'}`}>{projectViewInfo.status.toUpperCase()}</p></div>
            </div>
            <div className="text-right"><p className="text-xs text-slate-500">Project</p><p className="text-sm font-semibold text-slate-800">{decodeURIComponent(projectViewInfo.name)}</p></div>
          </div>
        )}

        {projectFilter && !isProjectView && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2"><FolderKanban size={16} className="text-blue-600" /><span className="text-sm text-blue-800">Showing: <strong>{getProjectName(projectFilter)}</strong></span></div>
            <Button variant="ghost" size="sm" onClick={clearProjectFilter} className="text-blue-600 hover:text-blue-800 h-7 text-xs"><X size={14} className="mr-1" /> Clear</Button>
          </div>
        )}

        {/* Stats */}
        <div className={`grid grid-cols-1 ${isProjectView ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 mb-6`}>
          {[
            { label: "Today's Hours", value: `${totalHoursToday.toFixed(1)}h`, icon: Clock, color: 'bg-blue-50 text-blue-600' },
            { label: projectFilter ? 'Project Total' : 'Filtered Total', value: `${totalHoursFiltered.toFixed(1)}h`, icon: Calendar, color: 'bg-green-50 text-green-600' },
            ...(!isProjectView ? [{ label: 'Assigned Projects', value: assignedProjects.length, icon: FolderKanban, color: 'bg-indigo-50 text-indigo-600' }] : []),
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}><s.icon size={20} /></div>
                <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p><p className="text-2xl font-bold text-slate-900">{s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Date Filter */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-end">
            <div><Label className="text-xs text-slate-500">From</Label><Input type="date" value={dateFilter.from_date} onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })} className="mt-1 h-9 border-slate-200 w-40" data-testid="filter-from-date" /></div>
            <div><Label className="text-xs text-slate-500">To</Label><Input type="date" value={dateFilter.to_date} onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })} className="mt-1 h-9 border-slate-200 w-40" data-testid="filter-to-date" /></div>
            {(dateFilter.from_date || dateFilter.to_date) && <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-xs border-slate-200">Clear</Button>}
          </div>
        </div>

        {/* Approvals Section */}
        {!isProjectView && (pendingApprovals.length > 0 || allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted').length > 0) && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Weekend/Holiday Approvals</h3>
              <div className="flex gap-2">
                <Button size="sm" variant={approvalTab === 'pending' ? 'default' : 'outline'} onClick={() => setApprovalTab('pending')} className={`text-xs h-8 ${approvalTab === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : 'border-slate-200'}`}>Pending ({pendingApprovals.length})</Button>
                <Button size="sm" variant={approvalTab === 'history' ? 'default' : 'outline'} onClick={() => setApprovalTab('history')} className={`text-xs h-8 ${approvalTab === 'history' ? 'bg-slate-900 hover:bg-slate-800' : 'border-slate-200'}`}>History ({allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted').length})</Button>
              </div>
            </div>
            <div className="p-4">
              {approvalTab === 'pending' && (pendingApprovals.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No pending approvals</p> : (
                <div className="space-y-2">
                  {pendingApprovals.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-medium text-sm text-slate-700">{formatDate(a.original_date)}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">Pending</span></div>
                        <div className="text-xs text-slate-500 mt-1"><span className="font-medium">{getProjectName(a.project_code)}</span> - {a.original_hours}h</div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleEditPendingApproval(a)} className="h-7 w-7 p-0 border-slate-200"><Edit size={12} /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeletePendingApproval(a)} className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" data-testid={`delete-pending-${a.id}`}><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {approvalTab === 'history' && (() => { const items = allApprovalRequests.filter(r => r.status !== 'pending' && r.status !== 'deleted'); return items.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No history</p> : (
                <div className="space-y-2">
                  {items.map((r) => (
                    <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${r.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-slate-700">{formatDate(r.original_date)}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${r.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{r.status === 'approved' ? 'Approved' : 'Rejected'}</span></div>
                        <div className="text-xs text-slate-500 mt-1"><span className="font-medium">{getProjectName(r.project_code)}</span> - {r.status === 'approved' ? (r.approved_hours || r.original_hours) : r.original_hours}h{r.rejection_reason && <span className="text-red-500 ml-2">Reason: {r.rejection_reason}</span>}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteApprovalHistory(r)} className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" data-testid={`delete-history-${r.id}`}><Trash2 size={12} /></Button>
                    </div>
                  ))}
                </div>
              ); })()}
            </div>
          </div>
        )}

        {/* Work Entries Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Work Entries ({filteredEntries.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Show:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-16 h-8 text-xs border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center"><FolderKanban size={36} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">No work entries found</p><p className="text-xs text-slate-300 mt-1">Start logging your work hours</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Date</th>
                    {isProjectView && <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Employee</th>}
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Projects</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Total</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {paginatedGroups.map((group) => (
                      <tr key={group.date} className={`border-b border-slate-100 last:border-0 transition-colors ${isToday(group.date) ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="font-medium text-sm text-slate-700">{formatDate(group.date)}</span>{isToday(group.date) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-medium">Today</span>}</div></td>
                        {isProjectView && <td className="py-3 px-4"><div className="flex flex-col gap-0.5">{[...new Set(group.entries.map(e => e.employee_id))].map(id => <span key={id} className="text-sm text-slate-600">{getEmployeeName(id)}</span>)}</div></td>}
                        <td className="py-3 px-4 max-w-md"><div className="flex flex-wrap gap-1">{group.entries.map((entry) => (<span key={entry.id} className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${entry.is_compensation ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`} title={entry.is_compensation && entry.compensation_notes ? `Compensation: ${entry.compensation_notes}` : entry.work_details}>{isProjectView && <span className="mr-1 font-medium">{getEmployeeName(entry.employee_id)}:</span>}{getProjectName(entry.project_code)} - {entry.hours}h{entry.is_compensation && <span className="ml-1 text-[10px] font-bold text-emerald-700" data-testid={`comp-label-${entry.id}`}>COMP</span>}</span>))}</div>{group.entries.some(e => e.is_compensation && e.compensation_notes) && <div className="mt-1 text-xs text-amber-600">{group.entries.filter(e => e.is_compensation && e.compensation_notes).map(e => e.compensation_notes).join('; ')}</div>}</td>
                        <td className="py-3 px-4"><span className="text-sm font-bold text-blue-600">{group.totalHours}h</span></td>
                        <td className="py-3 px-4">
                          {isEditable(group.date) ? (
                            <Button size="sm" variant="outline" onClick={() => handleEditDate(group.date, group.entries)} className="h-8 text-xs border-slate-200 text-blue-600" data-testid={`edit-date-${group.date}`}><Edit size={12} className="mr-1" /> Edit</Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleViewEntries(group.entries, group.date)} className="h-8 text-xs text-slate-400" data-testid={`view-entries-${group.date}`}><Eye size={12} className="mr-1" /> View</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <span className="text-xs text-slate-400">Showing {startIndex + 1}-{Math.min(startIndex + pageSize, groupedEntries.length)} of {groupedEntries.length}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 text-xs border-slate-200"><ChevronLeft size={14} /></Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => { let pn = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i; return (<Button key={pn} variant={currentPage === pn ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pn)} className={`h-8 w-8 p-0 text-xs ${currentPage === pn ? 'bg-slate-900' : 'border-slate-200'}`}>{pn}</Button>); })}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 text-xs border-slate-200"><ChevronRight size={14} /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">Add Work Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-sm text-slate-700">Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} min={getMinDate()} required className="mt-1.5 border-slate-200" data-testid="work-entry-date-input" /><p className="text-[10px] text-slate-400 mt-1">Past dates: last 2 days only. Future dates allowed.</p></div>
              <div><Label className="text-sm text-slate-700">Project</Label><Select value={formData.project_code} onValueChange={(v) => setFormData({ ...formData, project_code: v })}><SelectTrigger className="mt-1.5 border-slate-200" data-testid="work-entry-project-select"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.project_code} value={p.project_code}>{p.name} ({p.project_code})</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-sm text-slate-700">Hours</Label><Input type="number" step="0.5" min="0.5" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} placeholder="Enter hours" required className="mt-1.5 border-slate-200" data-testid="work-entry-hours-input" /></div>
              <div><Label className="text-sm text-slate-700">Work Details</Label><Textarea value={formData.work_details} onChange={(e) => setFormData({ ...formData, work_details: e.target.value })} rows={3} required placeholder="Describe the work..." className="mt-1.5 border-slate-200" data-testid="work-entry-details-input" /></div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-xs text-slate-500">Multiple entries for the same date and project will accumulate hours.</p></div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 h-10" data-testid="submit-work-entry-button">Add Entry</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Single Entry Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">Edit Work Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateEntry} className="space-y-4">
              <div><Label className="text-sm text-slate-700">Project</Label><Select value={editFormData.project_code} onValueChange={(v) => setEditFormData({...editFormData, project_code: v})}><SelectTrigger className="mt-1.5 border-slate-200"><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.project_code} value={p.project_code}>{p.name} ({p.project_code})</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-sm text-slate-700">Hours</Label><Input type="number" step="0.5" min="0.5" value={editFormData.hours} onChange={(e) => setEditFormData({...editFormData, hours: e.target.value})} required className="mt-1.5 border-slate-200" /></div>
              <div><Label className="text-sm text-slate-700">Work Details</Label><Textarea value={editFormData.work_details} onChange={(e) => setEditFormData({...editFormData, work_details: e.target.value})} rows={3} required className="mt-1.5 border-slate-200" /></div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">Update Entry</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit All Entries for Date */}
        <Dialog open={editDateDialogOpen} onOpenChange={setEditDateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">Edit Entries - {formatDate(editingDate)}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {editingDateEntries.map((entry) => (
                <div key={entry.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1"><Label className="text-xs text-slate-400">Project</Label><Select value={entry.project_code} onValueChange={(v) => updateEntryInModal(entry.id, 'project_code', v)}><SelectTrigger className="mt-1 border-slate-200"><SelectValue /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.project_code} value={p.project_code}>{p.name} ({p.project_code})</SelectItem>)}</SelectContent></Select></div>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 ml-2 h-8 w-8 p-0" onClick={() => handleDeleteFromModal(entry.id, getProjectName(entry.project_code))}><Trash2 size={14} /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs text-slate-400">Hours</Label><Input type="number" step="0.5" min="0.5" value={entry.hours} onChange={(e) => updateEntryInModal(entry.id, 'hours', e.target.value)} className="mt-1 border-slate-200" /></div>
                    <div className="col-span-2"><Label className="text-xs text-slate-400">Details</Label><Input value={entry.work_details} onChange={(e) => updateEntryInModal(entry.id, 'work_details', e.target.value)} className="mt-1 border-slate-200" /></div>
                  </div>
                  {entry.isModified && <span className="text-[10px] text-amber-600 font-medium">Modified</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
              <p className="text-sm text-slate-500">Total: <span className="font-bold text-blue-600">{editingDateEntries.reduce((s, e) => s + parseFloat(e.hours || 0), 0).toFixed(1)}h</span>{editingDateEntries.some(e => e.isModified) && <span className="ml-2 text-amber-600 text-xs">({editingDateEntries.filter(e => e.isModified).length} modified)</span>}</p>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setEditDateDialogOpen(false)} className="border-slate-200">Cancel</Button><Button onClick={handleSaveAllEntries} disabled={!editingDateEntries.some(e => e.isModified)} className="bg-slate-900 hover:bg-slate-800">Save Changes</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">Work Entries - {formatDate(viewingDate)}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {viewingEntries.map((entry) => (
                <div key={entry.id} className={`p-4 rounded-xl border ${entry.is_compensation ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-slate-800">{getProjectName(entry.project_code)}</h4>
                      {entry.is_compensation && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold" data-testid={`comp-label-${entry.id}`}>Compensation</span>}
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">{entry.hours}h</span>
                  </div>
                  <div className="text-xs text-slate-500"><p className="font-medium text-slate-600 mb-1">Work Details:</p><p className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-100">{entry.work_details || 'No details'}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
              <p className="text-sm text-slate-500">Total: <span className="font-bold text-blue-600">{viewingEntries.reduce((s, e) => s + e.hours, 0)}h</span></p>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="border-slate-200">Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
