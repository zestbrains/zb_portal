import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Send, Edit, Trash2, Plus, X, AlertTriangle } from 'lucide-react';

export default function EmployeeLeaveApply({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveDates, setLeaveDates] = useState([{ date: '', day_type: 'full' }]);
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState('apply');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editFormData, setEditFormData] = useState({ from_date: '', to_date: '', reason: '' });
  const [sandwichWarning, setSandwichWarning] = useState(null);
  const [checkingSandwich, setCheckingSandwich] = useState(false);

  useEffect(() => { fetchApplications(); fetchLeaveBalance(); }, []);

  const fetchApplications = async () => { try { const r = await api.get('/leaves/applications'); setApplications(r.data); } catch (e) { console.error(e); } };
  const fetchLeaveBalance = async () => { try { const r = await api.get('/leaves/my-details'); setLeaveBalance({ available_pl: r.data.current_year_available_pl, pl_taken: r.data.current_year_pl_taken, cl_taken: r.data.current_year_cl_taken }); } catch (e) { console.error(e); } };

  const addLeaveDate = () => setLeaveDates([...leaveDates, { date: '', day_type: 'full' }]);
  const removeLeaveDate = (index) => { if (leaveDates.length > 1) setLeaveDates(leaveDates.filter((_, i) => i !== index)); };
  const updateLeaveDate = (index, field, value) => { const u = [...leaveDates]; u[index] = { ...u[index], [field]: value }; setLeaveDates(u); };
  const calculateTotalDays = () => leaveDates.reduce((t, ld) => t + (ld.date ? (ld.day_type === 'first_half' || ld.day_type === 'second_half' ? 0.5 : 1) : 0), 0);

  const checkSandwich = async (dates) => {
    const validDates = dates.filter(ld => ld.date);
    if (validDates.length === 0) { setSandwichWarning(null); return; }
    setCheckingSandwich(true);
    try {
      const resp = await api.post('/leaves/check-sandwich', {
        leave_dates: validDates.map(ld => ({ date: ld.date, day_type: ld.day_type }))
      });
      if (resp.data.has_sandwich) {
        setSandwichWarning(resp.data);
      } else {
        setSandwichWarning(null);
      }
    } catch { setSandwichWarning(null); }
    setCheckingSandwich(false);
  };

  // Debounced sandwich check when dates change
  useEffect(() => {
    const timer = setTimeout(() => { checkSandwich(leaveDates); }, 500);
    return () => clearTimeout(timer);
  }, [leaveDates]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validDates = leaveDates.filter(ld => ld.date);
    if (validDates.length === 0) { toast.error('Please add at least one leave date'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    const sorted = [...validDates].sort((a, b) => new Date(a.date) - new Date(b.date));
    try {
      await api.post('/leaves/apply', { from_date: sorted[0].date, to_date: sorted[sorted.length - 1].date, reason, leave_dates: validDates.map(ld => ({ date: ld.date, day_type: ld.day_type })) });
      toast.success('Leave application submitted');
      setLeaveDates([{ date: '', day_type: 'full' }]); setReason(''); fetchApplications(); setActiveTab('applied');
    } catch (error) { toast.error(error.response?.data?.detail || 'Error submitting'); }
  };

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const approvedApplications = applications.filter(a => a.status === 'approved');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  const handleEditApplication = (app) => { setEditingApp(app); setEditFormData({ from_date: app.from_date, to_date: app.to_date, reason: app.reason }); setEditDialogOpen(true); };
  const handleUpdateApplication = async (e) => { e.preventDefault(); try { await api.put(`/leaves/applications/${editingApp.id}`, editFormData); toast.success('Updated'); setEditDialogOpen(false); fetchApplications(); } catch (error) { toast.error(error.response?.data?.detail || 'Error'); } };
  const handleDeleteApplication = async (appId) => { if (!window.confirm('Delete this leave application?')) return; try { await api.delete(`/leaves/applications/${appId}`); toast.success('Deleted'); fetchApplications(); } catch (error) { toast.error(error.response?.data?.detail || 'Error'); } };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const getStatusBadge = (status) => ({ approved: 'bg-green-100 text-green-700 border-green-200', rejected: 'bg-red-100 text-red-700 border-red-200' }[status] || 'bg-amber-100 text-amber-700 border-amber-200');
  const getStatusIcon = (status) => ({ approved: <CheckCircle size={14} className="text-green-500" />, rejected: <XCircle size={14} className="text-red-500" /> }[status] || <AlertCircle size={14} className="text-amber-500" />);

  const ApplicationCard = ({ app, showActions = false }) => (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm" data-testid={`leave-app-${app.id}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-sm text-slate-800">{formatDate(app.from_date)} - {formatDate(app.to_date)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{app.days_count} day(s)</p>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
          {getStatusIcon(app.status)} {app.status.toUpperCase()}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-slate-600"><span className="font-medium text-slate-700">Reason:</span> {app.reason}</p>
        {app.leave_dates?.length > 0 && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leave Types</span>
            <div className="mt-2 space-y-1">
              {app.leave_dates.map((ld, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-slate-500">{formatDate(ld.date)}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium border ${ld.leave_type.toLowerCase() === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : ld.leave_type.includes('PL') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{ld.leave_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {app.status === 'rejected' && app.reject_reason && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2"><XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" /><div><span className="text-xs font-medium text-red-700">Rejection Reason:</span><p className="text-xs text-red-600 mt-0.5">{app.reject_reason}</p></div></div>
          </div>
        )}
        {app.comments && app.status !== 'rejected' && (<p className="text-xs text-slate-500 p-2 bg-slate-50 rounded"><span className="font-medium">Comment:</span> {app.comments}</p>)}
        <p className="text-xs text-slate-300 mt-2">Applied: {formatDate(app.created_at)}</p>
        {showActions && app.status === 'pending' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleEditApplication(app)} className="text-xs border-slate-200" data-testid={`edit-leave-${app.id}`}><Edit size={12} className="mr-1" /> Edit</Button>
            <Button size="sm" variant="outline" onClick={() => handleDeleteApplication(app.id)} className="text-xs text-red-600 border-red-200 hover:bg-red-50" data-testid={`delete-leave-${app.id}`}><Trash2 size={12} className="mr-1" /> Delete</Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto" data-testid="leave-apply-page">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Apply Leave</h1>
          <p className="text-sm text-slate-500 mt-1">Submit leave request and track application status</p>
        </div>

        {leaveBalance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Available PL', value: leaveBalance.available_pl.toFixed(1), color: 'text-blue-600', icon: Calendar, bg: 'bg-blue-50' },
              { label: 'PL Taken', value: leaveBalance.pl_taken.toFixed(1), color: 'text-red-600', icon: Clock, bg: 'bg-red-50' },
              { label: 'CL Taken', value: leaveBalance.cl_taken.toFixed(1), color: 'text-amber-600', icon: Calendar, bg: 'bg-amber-50' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg} ${s.color}`}><s.icon size={20} /></div>
                  <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-slate-200 px-4 pt-3">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="apply" data-testid="apply-tab" className="text-xs"><Send size={14} className="mr-1.5" /> Apply</TabsTrigger>
                <TabsTrigger value="applied" data-testid="applied-tab" className="text-xs"><AlertCircle size={14} className="mr-1.5" /> Pending ({pendingApplications.length})</TabsTrigger>
                <TabsTrigger value="approved" data-testid="approved-tab" className="text-xs"><CheckCircle size={14} className="mr-1.5" /> Approved ({approvedApplications.length})</TabsTrigger>
                <TabsTrigger value="rejected" data-testid="rejected-tab" className="text-xs"><XCircle size={14} className="mr-1.5" /> Rejected ({rejectedApplications.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="apply" className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-slate-700">Leave Dates</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLeaveDate} className="text-xs border-slate-200"><Plus size={14} className="mr-1" /> Add Date</Button>
                  </div>
                  <div className="space-y-2">
                    {leaveDates.map((ld, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex-1">
                          <Input type="date" value={ld.date} onChange={(e) => updateLeaveDate(index, 'date', e.target.value)} required className="border-slate-200" data-testid={`leave-date-input-${index}`} />
                        </div>
                        <div className="w-36">
                          <Select value={ld.day_type} onValueChange={(v) => updateLeaveDate(index, 'day_type', v)}>
                            <SelectTrigger className="border-slate-200" data-testid={`leave-type-select-${index}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Day</SelectItem>
                              <SelectItem value="first_half">First Half</SelectItem>
                              <SelectItem value="second_half">Second Half</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {leaveDates.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeLeaveDate(index)} className="h-9 w-9 text-slate-400 hover:text-red-500"><X size={16} /></Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700"><span className="font-semibold">Total:</span> {calculateTotalDays()} day(s)</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reason" className="text-sm font-medium text-slate-700">Reason</Label>
                  <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required placeholder="Provide a reason for your leave..." className="mt-1.5 border-slate-200" data-testid="leave-reason-input" />
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500">Your application will be sent to Admin/HR for approval. Leave type (PL/CL) assigned during approval.</p>
                </div>

                {/* Sandwich Leave Warning */}
                {sandwichWarning && sandwichWarning.has_sandwich && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl" data-testid="sandwich-warning">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-full flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-800 text-sm">Sandwich Leave Warning</h4>
                        {sandwichWarning.warnings.map((w, idx) => (
                          <p key={idx} className="text-sm text-amber-700 mt-1">{w}</p>
                        ))}
                        <div className="mt-2 p-2 bg-amber-100/50 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-600">
                            <strong>Note:</strong> Sandwich leave rule means if you take leave on working days between two non-working days (weekend/holiday), 
                            those non-working days will also be counted as leave days with salary deduction.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-lg font-medium" data-testid="submit-leave-button">
                  <Send size={16} className="mr-2" /> Submit Application ({calculateTotalDays()} days)
                  {sandwichWarning?.has_sandwich && <span className="ml-1 text-amber-300">(Sandwich applies)</span>}
                </Button>
              </form>
            </TabsContent>

            {['applied', 'approved', 'rejected'].map((tab) => {
              const items = tab === 'applied' ? pendingApplications : tab === 'approved' ? approvedApplications : rejectedApplications;
              const EmptyIcon = tab === 'applied' ? AlertCircle : tab === 'approved' ? CheckCircle : XCircle;
              return (
                <TabsContent key={tab} value={tab} className="p-4 md:p-6">
                  {items.length === 0 ? (
                    <div className="text-center py-12"><EmptyIcon size={40} className="mx-auto mb-3 text-slate-300" /><p className="text-sm text-slate-400">No {tab} applications</p></div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">{items.map((app) => <ApplicationCard key={app.id} app={app} showActions={tab === 'applied'} />)}</div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-lg font-semibold text-slate-900">Edit Leave Application</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateApplication} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm text-slate-700">From Date</Label><Input type="date" value={editFormData.from_date} onChange={(e) => setEditFormData({ ...editFormData, from_date: e.target.value })} required className="mt-1.5 border-slate-200" /></div>
                <div><Label className="text-sm text-slate-700">To Date</Label><Input type="date" value={editFormData.to_date} onChange={(e) => setEditFormData({ ...editFormData, to_date: e.target.value })} required className="mt-1.5 border-slate-200" /></div>
              </div>
              <div><Label className="text-sm text-slate-700">Reason</Label><Textarea value={editFormData.reason} onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })} rows={3} required className="mt-1.5 border-slate-200" /></div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">Update Application</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
