import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { IndianRupee, Search, Download, Save, AlertTriangle, CheckCircle } from 'lucide-react';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const START_YEAR = 2026;
const START_MONTH = 3;

function getAvailableMonths(year) {
  if (parseInt(year) === START_YEAR) return MONTHS.filter(m => parseInt(m.value) >= START_MONTH);
  return MONTHS;
}

function getAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = START_YEAR; y <= currentYear + 1; y++) years.push(y.toString());
  return years;
}

function fmt(num) {
  if (num === 0) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Salary({ user, onLogout }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1 < START_MONTH && now.getFullYear() === START_YEAR ? START_MONTH.toString() : (now.getMonth() + 1).toString());
  const [year, setYear] = useState(now.getFullYear().toString());
  const [data, setData] = useState([]);
  const [lateMarksData, setLateMarksData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadBankId, setDownloadBankId] = useState('');
  const [downloadBankName, setDownloadBankName] = useState('');
  const [downloadBankType, setDownloadBankType] = useState('icici'); // 'icici' or 'hexeros'
  const [sheetName, setSheetName] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchSalary();
    fetchLateMarks();
    setEdits({});
  }, [month, year]);

  const fetchSalary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/salary?year=${year}&month=${month}`);
      setData(res.data.salary_data || []);
    } catch (error) {
      toast.error('Error fetching salary data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLateMarks = async () => {
    try {
      const res = await api.get(`/late-marks?year=${year}&month=${month}`);
      const statusMap = {};
      res.data.employees?.forEach(emp => {
        statusMap[emp.employee_id] = {
          salary_status: emp.salary_status,
          has_late_mark: emp.has_late_mark
        };
      });
      setLateMarksData(statusMap);
    } catch (error) {
      setLateMarksData({});
    }
  };

  const getSalaryStatus = (empId) => lateMarksData[empId] || null;

  const getEditValue = (empId, field) => {
    if (edits[empId] && edits[empId][field] !== undefined) return edits[empId][field];
    const emp = data.find(e => e.employee_id === empId);
    if (!emp) return '';
    return field === 'other_income' ? (emp.other_income || '') : (emp.extra_hours || '');
  };

  const handleEditChange = (empId, field, value) => {
    setEdits(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: value } }));
  };

  const hasEdits = (empId) => {
    if (!edits[empId]) return false;
    const emp = data.find(e => e.employee_id === empId);
    if (!emp) return false;
    const editOI = edits[empId].other_income;
    const editEH = edits[empId].extra_hours;
    if (editOI !== undefined && parseFloat(editOI || 0) !== (emp.other_income || 0)) return true;
    if (editEH !== undefined && parseFloat(editEH || 0) !== (emp.extra_hours || 0)) return true;
    return false;
  };

  const handleSave = async (empId) => {
    setSaving(prev => ({ ...prev, [empId]: true }));
    try {
      const emp = data.find(e => e.employee_id === empId);
      const editData = edits[empId] || {};
      const other_income = parseFloat(editData.other_income !== undefined ? editData.other_income : (emp?.other_income || 0)) || 0;
      const extra_hours = parseFloat(editData.extra_hours !== undefined ? editData.extra_hours : (emp?.extra_hours || 0)) || 0;
      await api.put('/salary/adjustments', { employee_id: empId, year: parseInt(year), month: parseInt(month), other_income, extra_hours });
      toast.success(`Saved adjustments for ${emp?.employee_name}`);
      setEdits(prev => { const n = { ...prev }; delete n[empId]; return n; });
      fetchSalary();
    } catch (error) {
      toast.error('Error saving adjustment');
    } finally {
      setSaving(prev => ({ ...prev, [empId]: false }));
    }
  };

  const computeLocal = (emp) => {
    const editData = edits[emp.employee_id] || {};
    const oi = parseFloat(editData.other_income !== undefined ? editData.other_income : emp.other_income) || 0;
    const eh = parseFloat(editData.extra_hours !== undefined ? editData.extra_hours : emp.extra_hours) || 0;
    const perDay = emp.salary > 0 && emp.num_days > 0 ? emp.salary / emp.num_days : 0;
    const perHour = perDay / 8.5;
    const ehAmt = Math.round(perHour * eh * 100) / 100;
    const lateDeduction = emp.late_coming_amount || 0;
    const notJoinedDeduction = emp.not_joined_amount || 0;
    const gross = Math.round((emp.salary - emp.pt - emp.esic - emp.epf - emp.cpf - emp.cl_amount - (emp.sandwich_amount || 0) - lateDeduction - notJoinedDeduction + emp.ot_amount + oi + ehAmt) * 100) / 100;
    return { oi, eh, ehAmt, gross };
  };

  const filtered = search
    ? data.filter(e => e.employee_name.toLowerCase().includes(search.toLowerCase()) || e.employee_id.toLowerCase().includes(search.toLowerCase()))
    : data;

  // Group employees by bank
  const groupedByBank = filtered.reduce((acc, emp) => {
    const bankName = emp.bank_name || 'No Bank';
    if (!acc[bankName]) {
      acc[bankName] = [];
    }
    acc[bankName].push(emp);
    return acc;
  }, {});

  // Sort bank names (No Bank at the end)
  const sortedBankNames = Object.keys(groupedByBank).sort((a, b) => {
    if (a === 'No Bank') return 1;
    if (b === 'No Bank') return -1;
    return a.localeCompare(b);
  });

  const totalGross = filtered.reduce((sum, e) => sum + computeLocal(e).gross, 0);

  const handleExport = () => {
    const monthLabel = MONTHS.find(m => m.value === month)?.label || month;
    const headers = ['Employee ID', 'Employee Name', 'Salary', 'PT', 'ESIC', 'EPF', 'CPF', 'CL Days', 'CL Amount', 'Sandwich Days', 'Sandwich Amount', 'OT Days', 'OT Amount', 'Other Income', 'Extra Hours', 'Extra Hrs Amount', 'Gross Salary'];
    const rows = filtered.map(e => {
      const c = computeLocal(e);
      return [e.employee_id, e.employee_name, e.salary, e.pt, e.esic, e.epf, e.cpf, e.cl_count, e.cl_amount, e.sandwich_days || 0, e.sandwich_amount || 0, e.ot_count, e.ot_amount, c.oi, c.eh, c.ehAmt, c.gross];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_${monthLabel}_${year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Exported successfully');
  };

  const openDownloadDialog = (bankId, bankName, bankType = 'icici') => {
    setDownloadBankId(bankId);
    setDownloadBankName(bankName);
    setDownloadBankType(bankType);
    const monthLabel = MONTHS.find(m => m.value === month)?.label || month;
    if (bankType === 'hexeros') {
      setSheetName(`Hexeros_${monthLabel}_${year}`);
    } else {
      setSheetName(`ICICI_${monthLabel}_${year}`);
    }
    setPaymentDate('');
    setDownloadDialogOpen(true);
  };

  const handleDownloadSheet = async () => {
    // Payment date is only required for ICICI
    if (downloadBankType === 'icici' && !paymentDate) {
      toast.error('Please enter payment date');
      return;
    }
    
    setDownloading(true);
    try {
      let endpoint = '/salary/download-sheet';
      let payload = {
        bank_id: downloadBankId,
        year: parseInt(year),
        month: parseInt(month),
        sheet_name: sheetName
      };
      
      if (downloadBankType === 'hexeros') {
        endpoint = '/salary/download-sheet-hexeros';
      } else {
        payload.payment_date = paymentDate;
      }
      
      const response = await api.post(endpoint, payload, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Salary sheet downloaded successfully');
      setDownloadDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to download sheet');
    } finally {
      setDownloading(false);
    }
  };

  const availableMonths = getAvailableMonths(year);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10" data-testid="salary-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Salary</h1>
            <p className="text-sm text-slate-500 mt-1">Monthly salary calculation for all employees</p>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm" className="text-xs border-green-200 text-green-700 hover:bg-green-50" data-testid="export-salary-btn">
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={month} onValueChange={(v) => setMonth(v)}>
              <SelectTrigger className="h-9 text-sm border-slate-200" data-testid="salary-month-trigger"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>{availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={(v) => { setYear(v); const avail = getAvailableMonths(v); if (!avail.find(m => m.value === month)) setMonth(avail[0].value); }}>
              <SelectTrigger className="h-9 text-sm border-slate-200" data-testid="salary-year-trigger"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>{getAvailableYears().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <div className="col-span-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 text-sm border-slate-200 pl-9" data-testid="salary-search" />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"><IndianRupee size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</p><p className="text-2xl font-bold text-slate-900">{filtered.length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 text-green-600"><IndianRupee size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Gross</p><p className="text-2xl font-bold text-green-600">{fmt(totalGross)}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600"><IndianRupee size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Month</p><p className="text-2xl font-bold text-blue-600">{MONTHS.find(m => m.value === month)?.label} {year}</p></div>
            </div>
          </div>
        </div>

        {/* Grouped Tables by Bank */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-400 text-sm">Calculating salaries...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
            <IndianRupee size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">No salary data found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedBankNames.map((bankName) => {
              const bankEmployees = groupedByBank[bankName];
              const bankTotal = bankEmployees.reduce((sum, e) => sum + computeLocal(e).gross, 0);
              let rowNum = 0;
              
              return (
                <div key={bankName} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Bank Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                        <IndianRupee size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{bankName}</h3>
                        <p className="text-xs text-slate-500">{bankEmployees.length} employee{bankEmployees.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {bankName.toLowerCase().includes('icici') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            // Find bank_id from first employee
                            const bankId = bankEmployees[0]?.bank_id;
                            if (bankId) openDownloadDialog(bankId, bankName, 'icici');
                          }}
                        >
                          <Download size={14} className="mr-1" /> Download Sheet
                        </Button>
                      )}
                      {bankName.toLowerCase().includes('hexeros') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const bankId = bankEmployees[0]?.bank_id;
                            if (bankId) openDownloadDialog(bankId, bankName, 'hexeros');
                          }}
                        >
                          <Download size={14} className="mr-1" /> Download Sheet
                        </Button>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Bank Total</p>
                        <p className="text-lg font-bold text-blue-600">{fmt(bankTotal)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">#</th>
                          <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Employee</th>
                          <th className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Status</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Salary</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">PT</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">ESIC</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">EPF</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">CPF</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">CLs Amt</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Sandwich</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Late</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Not Joined</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">OT Amt</th>
                          <th className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Other Inc</th>
                          <th className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Extra Hrs</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Extra Amt</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">Gross</th>
                          <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2">TD Salary</th>
                          <th className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankEmployees.map((emp) => {
                          rowNum++;
                          const c = computeLocal(emp);
                          const edited = hasEdits(emp.employee_id);
                          const salaryInfo = getSalaryStatus(emp.employee_id);
                          return (
                            <tr key={emp.employee_id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors ${edited ? 'bg-amber-50/40' : ''} ${salaryInfo?.salary_status === 'hold' ? 'bg-red-50/30' : ''}`} data-testid={`salary-row-${emp.employee_id}`}>
                              <td className="py-2 px-2 text-xs text-slate-400">{rowNum}</td>
                              <td className="py-2 px-2">
                                <div className="font-medium text-xs text-slate-800">{emp.employee_name}</div>
                                <div className="text-[10px] text-slate-400">{emp.employee_id}</div>
                              </td>
                              <td className="py-2 px-2 text-center">
                                {salaryInfo ? (
                                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                                    salaryInfo.salary_status === 'hold' 
                                      ? 'bg-red-100 text-red-700 border border-red-200' 
                                      : 'bg-green-100 text-green-700 border border-green-200'
                                  }`}>
                                    {salaryInfo.salary_status === 'hold' ? (
                                      <><AlertTriangle size={10} /> HOLD</>
                                    ) : (
                                      <><CheckCircle size={10} /> ACTIVE</>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right text-xs text-slate-700 font-medium">{fmt(emp.salary)}</td>
                              <td className="py-2 px-2 text-right text-xs text-red-600">{emp.pt > 0 ? `-${fmt(emp.pt)}` : '0'}</td>
                              <td className="py-2 px-2 text-right text-xs text-red-600">{emp.esic > 0 ? `-${fmt(emp.esic)}` : '0'}</td>
                              <td className="py-2 px-2 text-right text-xs text-red-600">{emp.epf > 0 ? `-${fmt(emp.epf)}` : '0'}</td>
                              <td className="py-2 px-2 text-right text-xs text-red-600">{emp.cpf > 0 ? `-${fmt(emp.cpf)}` : '0'}</td>
                              <td className="py-2 px-2 text-right text-xs">
                                <div className={emp.cl_amount > 0 ? 'text-red-600' : 'text-slate-400'}>{emp.cl_amount > 0 ? `-${fmt(emp.cl_amount)}` : '0'}</div>
                                {emp.cl_count > 0 && <div className="text-[10px] text-slate-400">{emp.cl_count}d</div>}
                              </td>
                              <td className="py-2 px-2 text-right text-xs">
                                <div className={(emp.sandwich_amount || 0) > 0 ? 'text-orange-600' : 'text-slate-400'}>{(emp.sandwich_amount || 0) > 0 ? `-${fmt(emp.sandwich_amount)}` : '0'}</div>
                                {(emp.sandwich_days || 0) > 0 && <div className="text-[10px] text-orange-400">{emp.sandwich_days}d</div>}
                              </td>
                              <td className="py-2 px-2 text-right text-xs">
                                <div className={(emp.late_coming_amount || 0) > 0 ? 'text-orange-600' : 'text-slate-400'}>{(emp.late_coming_amount || 0) > 0 ? `-${fmt(emp.late_coming_amount)}` : '0'}</div>
                                {(emp.late_coming_count || 0) > 0 && <div className="text-[10px] text-orange-400">{emp.late_coming_count} late{emp.late_coming_deduction_days > 0 ? ` (-${emp.late_coming_deduction_days}d)` : ''}</div>}
                              </td>
                              <td className="py-2 px-2 text-right text-xs">
                                <div className={(emp.not_joined_amount || 0) > 0 ? 'text-purple-600' : 'text-slate-400'}>{(emp.not_joined_amount || 0) > 0 ? `-${fmt(emp.not_joined_amount)}` : '0'}</div>
                                {(emp.not_joined_days || 0) > 0 && <div className="text-[10px] text-purple-400">{emp.not_joined_days}d</div>}
                              </td>
                              <td className="py-2 px-2 text-right text-xs">
                                <div className={emp.ot_amount > 0 ? 'text-green-600' : 'text-slate-400'}>{emp.ot_amount > 0 ? `+${fmt(emp.ot_amount)}` : '0'}</div>
                                {emp.ot_count > 0 && <div className="text-[10px] text-slate-400">{emp.ot_count}d</div>}
                              </td>
                              <td className="py-2 px-2">
                                <Input type="number" step="0.01" min="0" value={getEditValue(emp.employee_id, 'other_income')} onChange={(e) => handleEditChange(emp.employee_id, 'other_income', e.target.value)} className="h-7 w-20 text-xs text-right border-slate-200 mx-auto" placeholder="0" data-testid={`other-income-${emp.employee_id}`} />
                              </td>
                              <td className="py-2 px-2">
                                <Input type="number" step="0.5" min="0" value={getEditValue(emp.employee_id, 'extra_hours')} onChange={(e) => handleEditChange(emp.employee_id, 'extra_hours', e.target.value)} className="h-7 w-16 text-xs text-right border-slate-200 mx-auto" placeholder="0" data-testid={`extra-hours-${emp.employee_id}`} />
                              </td>
                              <td className="py-2 px-2 text-right text-xs">
                                <span className={c.ehAmt > 0 ? 'text-green-600' : 'text-slate-400'}>{c.ehAmt > 0 ? `+${fmt(c.ehAmt)}` : '0'}</span>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span className="text-xs font-bold text-blue-600">{fmt(c.gross)}</span>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span className="text-xs font-bold text-violet-600">{fmt(emp.td_salary || 0)}</span>
                                {(emp.future_days || 0) > 0 && <div className="text-[10px] text-slate-400">-{emp.future_days}d</div>}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {edited && (
                                  <Button size="sm" onClick={() => handleSave(emp.employee_id)} disabled={saving[emp.employee_id]} className="h-6 w-6 p-0 bg-slate-900 hover:bg-slate-800" title="Save" data-testid={`save-adj-${emp.employee_id}`}>
                                    <Save size={10} />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={3} className="py-3 px-2 text-xs font-bold text-slate-700">{bankName} Total</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-slate-700">{fmt(bankEmployees.reduce((s, e) => s + e.salary, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-red-600">-{fmt(bankEmployees.reduce((s, e) => s + e.pt, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-red-600">-{fmt(bankEmployees.reduce((s, e) => s + e.esic, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-red-600">-{fmt(bankEmployees.reduce((s, e) => s + e.epf, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-red-600">-{fmt(bankEmployees.reduce((s, e) => s + e.cpf, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-red-600">-{fmt(bankEmployees.reduce((s, e) => s + e.cl_amount, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-orange-600">-{fmt(bankEmployees.reduce((s, e) => s + (e.sandwich_amount || 0), 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-orange-600">-{fmt(bankEmployees.reduce((s, e) => s + (e.late_coming_amount || 0), 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-purple-600">-{fmt(bankEmployees.reduce((s, e) => s + (e.not_joined_amount || 0), 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-green-600">+{fmt(bankEmployees.reduce((s, e) => s + e.ot_amount, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-green-600">+{fmt(bankEmployees.reduce((s, e) => s + computeLocal(e).oi, 0))}</td>
                          <td className="py-3 px-2"></td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-green-600">+{fmt(bankEmployees.reduce((s, e) => s + computeLocal(e).ehAmt, 0))}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-blue-600">{fmt(bankTotal)}</td>
                          <td className="py-3 px-2 text-right text-xs font-bold text-violet-600">{fmt(bankEmployees.reduce((s, e) => s + (e.td_salary || 0), 0))}</td>
                          <td className="py-3 px-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand Total */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 text-white">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Grand Total</p>
                    <p className="text-sm text-slate-300">{filtered.length} employees across {sortedBankNames.length} bank{sortedBankNames.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{fmt(totalGross)}</p>
                  <p className="text-xs text-slate-400">Gross Salary</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Sheet Dialog */}
        <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download size={20} />
                Download Salary Sheet - {downloadBankName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="sheet-name">Sheet Name</Label>
                <Input
                  id="sheet-name"
                  placeholder="Enter sheet name"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">This will be the Excel file name</p>
              </div>
              {downloadBankType === 'icici' && (
                <div>
                  <Label htmlFor="payment-date">Payment Date *</Label>
                  <Input
                    id="payment-date"
                    placeholder="DD-MMM-YYYY (e.g., 10-Mar-2026)"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: DD-MMM-YYYY (e.g., 10-Mar-2026)</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDownloadSheet} disabled={downloading || (downloadBankType === 'icici' && !paymentDate)}>
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
