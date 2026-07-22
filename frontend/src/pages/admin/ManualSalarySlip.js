import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Download, Loader2, FileText } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NumField = ({ label, value, onChange, testid }) => (
  <div>
    <Label className="text-xs text-slate-500">{label}</Label>
    <Input type="number" value={value} onChange={e => onChange(e.target.value)} className="h-9 text-sm" data-testid={testid} />
  </div>
);
const TextField = ({ label, value, onChange, testid, required }) => (
  <div>
    <Label className="text-xs text-slate-500">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</Label>
    <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 text-sm" data-testid={testid} />
  </div>
);

export default function ManualSalarySlip({ user, onLogout }) {
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState(lastMonthDate.getMonth() + 1);
  const [year, setYear] = useState(lastMonthDate.getFullYear());
  const [busy, setBusy] = useState(false);

  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [banks, setBanks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [autoAdjustPayable, setAutoAdjustPayable] = useState(true);

  const [company, setCompany] = useState({ name: 'ZESTBRAINS', address: '' });
  const [emp, setEmp] = useState({
    emp_id: '', name: '', designation: '', department: '',
    location: 'Ahmedabad', doj: '',
    bank_name: '', account_no: '', pan: '',
    pf_no: '', uan: '', esi_no: '',
  });
  const [working, setWorking] = useState({
    working_days: 30, weekoff: 8, pay_holiday: 0, present_days: 22,
    cl: 0, pl: 0, sl: 0, ml: 0, lwp: 0,
  });
  const [earnings, setEarnings] = useState({
    basic_a: 0, basic_p: 0,
    da_a: 0, da_p: 0,
    hra_a: 0, hra_p: 0,
    sp_a: 0, sp_p: 0,
    incentive_a: 0, incentive_p: 0,
  });
  const [ded, setDed] = useState({
    pf: 0, esi: 0, pt: 0, it: 0, lwf: 0, advance: 0, loan: 0, oth: 0, food: 0, emmbill: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [empRes, bankRes, deptRes, holRes] = await Promise.all([
          api.get('/employees'),
          api.get('/banks'),
          api.get('/departments'),
          api.get('/holidays'),
        ]);
        setEmployeesList(empRes.data || []);
        setBanks(bankRes.data || []);
        setDepartments(deptRes.data || []);
        setHolidays(holRes.data || []);
      } catch (e) {
        toast.error('Failed to load initial data');
      }
    })();
  }, []);

  // Auto-compute Working Days / Weekoff / Pay Holiday / Present Days based on selected month, year and CL/LWP
  useEffect(() => {
    const mm = String(month).padStart(2, '0');
    const yPrefix = `${year}-${mm}`;
    const numDays = new Date(year, month, 0).getDate();
    let weekoffCount = 0;
    let holidayCount = 0;
    const holidaySet = new Set((holidays || []).filter(h => (h.date || '').startsWith(yPrefix)).map(h => h.date));
    for (let d = 1; d <= numDays; d++) {
      const dt = new Date(year, month - 1, d);
      const dow = dt.getDay();
      const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`;
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = holidaySet.has(dateStr);
      if (isWeekend) weekoffCount++;
      else if (isHoliday) holidayCount++;
    }
    setWorking(w => {
      const cl = Number(w.cl) || 0;
      const pl = Number(w.pl) || 0;
      const sl = Number(w.sl) || 0;
      const ml = Number(w.ml) || 0;
      const lwp = Number(w.lwp) || 0;
      const presentDays = Math.max(numDays - weekoffCount - holidayCount - cl - pl - sl - ml - lwp, 0);
      return {
        ...w,
        working_days: numDays,
        weekoff: weekoffCount,
        pay_holiday: holidayCount,
        present_days: presentDays,
      };
    });
  }, [month, year, holidays]);

  // Recompute Present Days when unpaid/paid leave counts change
  useEffect(() => {
    setWorking(w => {
      const numDays = Number(w.working_days) || 0;
      const weekoff = Number(w.weekoff) || 0;
      const holiday = Number(w.pay_holiday) || 0;
      const cl = Number(w.cl) || 0;
      const pl = Number(w.pl) || 0;
      const sl = Number(w.sl) || 0;
      const ml = Number(w.ml) || 0;
      const lwp = Number(w.lwp) || 0;
      const presentDays = Math.max(numDays - weekoff - holiday - cl - pl - sl - ml - lwp, 0);
      if (presentDays === w.present_days) return w;
      return { ...w, present_days: presentDays };
    });
  }, [working.cl, working.pl, working.sl, working.ml, working.lwp, working.working_days, working.weekoff, working.pay_holiday]);

  // Auto-adjust Payable earnings when Actual or CL/LWP change (only when toggle is on)
  useEffect(() => {
    if (!autoAdjustPayable) return;
    const numDays = Number(working.working_days) || 0;
    if (numDays <= 0) return;
    const cl = Number(working.cl) || 0;
    const lwp = Number(working.lwp) || 0;
    const paidDays = Math.max(numDays - cl - lwp, 0);
    const ratio = paidDays / numDays;
    setEarnings(e => ({
      ...e,
      basic_p: Math.round((Number(e.basic_a) || 0) * ratio),
      da_p: Math.round((Number(e.da_a) || 0) * ratio),
      hra_p: Math.round((Number(e.hra_a) || 0) * ratio),
      sp_p: Math.round((Number(e.sp_a) || 0) * ratio),
    }));
  }, [earnings.basic_a, earnings.da_a, earnings.hra_a, earnings.sp_a, working.cl, working.lwp, working.working_days, autoAdjustPayable]);

  const handleEmployeeSelect = (id) => {
    setSelectedEmpId(id);
    if (!id) return;
    const e = employeesList.find(x => x.employee_id === id || x.id === id);
    if (!e) return;
    const bank = banks.find(b => b.id === e.bank_id);
    const deptNames = (e.department_ids || []).map(did => (departments.find(d => d.id === did) || {}).name).filter(Boolean);
    setEmp({
      emp_id: e.employee_id || '',
      name: (e.name || '').toUpperCase(),
      designation: e.designation || '',
      department: deptNames.join(', '),
      location: e.location || 'Ahmedabad',
      doj: (e.joining_date || '').slice(0, 10),
      bank_name: bank ? bank.name : '',
      account_no: e.bank_account_number || '',
      pan: e.pan || '',
      pf_no: e.pf_no || '',
      uan: e.uan || '',
      esi_no: e.esi_no || '',
    });
    if (bank) {
      setCompany({ name: bank.name || 'ZESTBRAINS', address: bank.address || '' });
    }
    // Prefill CTC split
    const s = Number(e.salary || 0);
    setEarnings(v => ({
      ...v,
      basic_a: Math.round(s * 0.5), basic_p: Math.round(s * 0.5),
      hra_a: Math.round(s * 0.2), hra_p: Math.round(s * 0.2),
      sp_a: Math.round(s * 0.3), sp_p: Math.round(s * 0.3),
    }));
    setDed(v => ({
      ...v,
      pf: Number(e.epf || 0),
      esi: Number(e.esic || 0),
      pt: Number(e.pt || 0),
    }));
  };

  const gross = ['basic_p','da_p','hra_p','sp_p','incentive_p'].reduce((a, k) => a + (Number(earnings[k]) || 0), 0);
  const totalDed = Object.values(ded).reduce((a, b) => a + (Number(b) || 0), 0);
  const net = Math.max(gross - totalDed, 0);

  const isFutureOrCurrent = (y, m) => (y > now.getFullYear()) || (y === now.getFullYear() && m >= now.getMonth() + 1);

  const handleGenerate = async () => {
    if (!emp.name.trim()) {
      toast.error('Employee Name is required');
      return;
    }
    if (isFutureOrCurrent(year, month)) {
      toast.error('Only past months are allowed');
      return;
    }

    const payload = {
      year, month,
      company,
      employee: { ...emp, name: (emp.name || '').toUpperCase() },
      working: [
        { label: 'Working Days', value: Number(working.working_days) || 0 },
        { label: 'Weekoff', value: Number(working.weekoff) || 0 },
        { label: 'Pay Holiday', value: Number(working.pay_holiday) || 0 },
        { label: 'Present Days', value: Number(working.present_days) || 0 },
        { label: 'CL', value: Number(working.cl) || 0 },
        { label: 'PL', value: Number(working.pl) || 0 },
        { label: 'SL', value: Number(working.sl) || 0 },
        { label: 'M.L.', value: Number(working.ml) || 0 },
        { label: 'LWP', value: Number(working.lwp) || 0 },
      ],
      earnings: [
        { label: 'Basic', actual: Number(earnings.basic_a) || 0, payable: Number(earnings.basic_p) || 0 },
        { label: 'DA', actual: Number(earnings.da_a) || 0, payable: Number(earnings.da_p) || 0 },
        { label: 'HRA', actual: Number(earnings.hra_a) || 0, payable: Number(earnings.hra_p) || 0 },
        { label: 'SP. ALL.', actual: Number(earnings.sp_a) || 0, payable: Number(earnings.sp_p) || 0 },
        { label: 'INCENTIVE', actual: Number(earnings.incentive_a) || 0, payable: Number(earnings.incentive_p) || 0 },
      ],
      deductions: [
        { label: 'P.F', value: Number(ded.pf) || 0 },
        { label: 'ESI', value: Number(ded.esi) || 0 },
        { label: 'P.T.', value: Number(ded.pt) || 0 },
        { label: 'I.T.', value: Number(ded.it) || 0 },
        { label: 'L.W.F', value: Number(ded.lwf) || 0 },
        { label: 'Advance', value: Number(ded.advance) || 0 },
        { label: 'Loan Installment', value: Number(ded.loan) || 0 },
        { label: 'Oth. Ded', value: Number(ded.oth) || 0 },
        { label: 'Food', value: Number(ded.food) || 0 },
        { label: 'E/Mbill', value: Number(ded.emmbill) || 0 },
      ],
      totals: { gross_income: gross, total_deduction: totalDed, net_amount: net },
      employee_id: emp.emp_id || '',
    };

    setBusy(true);
    try {
      const res = await api.post('/documents/salary-slip/manual', payload);
      const pdfBytes = Uint8Array.from(atob(res.data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${emp.name || 'employee'}_${res.data.letter_title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Manual salary slip generated!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate manual salary slip');
    } finally {
      setBusy(false);
    }
  };

  const N = NumField;
  const T = TextField;

  // Any year from 2015 up to current
  const availableYears = [];
  for (let y = 2015; y <= now.getFullYear(); y++) availableYears.push(y);

  const activeEmps = employeesList.filter(e => (e.status || '').toLowerCase() === 'active' || e.is_active);
  const exEmps = employeesList.filter(e => !((e.status || '').toLowerCase() === 'active' || e.is_active));

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-5 max-w-6xl">
        <div className="flex items-center gap-3">
          <FileText className="text-emerald-600" />
          <h1 className="text-xl font-semibold text-slate-800">Manual Salary Slip Generator</h1>
        </div>
        <p className="text-sm text-slate-500">Use this for months before March 2026 (when auto data isn&apos;t available) or for employees who no longer exist in the system.</p>

        {/* Month/Year + Employee picker */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3" data-testid="manual-header-panel">
          <div>
            <Label className="text-xs text-slate-500 mb-1">Month</Label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-32 h-9 px-2 border border-slate-200 rounded-md text-sm bg-white" data-testid="manual-slip-month">
              {MONTHS.map((m, i) => {
                const isDisabled = isFutureOrCurrent(year, i + 1);
                return <option key={i + 1} value={i + 1} disabled={isDisabled}>{m}{isDisabled ? ' (locked)' : ''}</option>;
              })}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1">Year</Label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-28 h-9 px-2 border border-slate-200 rounded-md text-sm bg-white" data-testid="manual-slip-year">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[280px]">
            <Label className="text-xs text-slate-500 mb-1">Pick Employee (Active + Ex — pre-fills all fields)</Label>
            <select value={selectedEmpId} onChange={e => handleEmployeeSelect(e.target.value)} className="w-full h-9 px-2 border border-slate-200 rounded-md text-sm bg-white" data-testid="manual-emp-picker">
              <option value="">— Select an employee (optional) —</option>
              {activeEmps.length > 0 && (
                <optgroup label="Active">
                  {activeEmps.map(e => <option key={e.id || e.employee_id} value={e.employee_id}>{e.name} ({e.employee_id})</option>)}
                </optgroup>
              )}
              {exEmps.length > 0 && (
                <optgroup label="Ex-Employees / Inactive">
                  {exEmps.map(e => <option key={e.id || e.employee_id} value={e.employee_id}>{e.name} ({e.employee_id})</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div className="w-full flex items-center gap-2 pt-1">
            <input
              id="auto-adjust-toggle"
              type="checkbox"
              checked={autoAdjustPayable}
              onChange={e => setAutoAdjustPayable(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
              data-testid="manual-auto-adjust-toggle"
            />
            <label htmlFor="auto-adjust-toggle" className="text-xs text-slate-600">
              Auto-adjust Payable earnings when CL / LWP change (unchecked = manual override)
            </label>
          </div>
        </div>

        {/* Company */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Company</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <T label="Company Name" value={company.name} onChange={v => setCompany({ ...company, name: v })} testid="manual-company-name" required />
            <T label="Company Address" value={company.address} onChange={v => setCompany({ ...company, address: v })} testid="manual-company-address" />
          </div>
        </section>

        {/* Employee info */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Employee Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <T label="Emp.Id" value={emp.emp_id} onChange={v => setEmp({ ...emp, emp_id: v })} testid="manual-emp-id" />
            <T label="Emp. Name" value={emp.name} onChange={v => setEmp({ ...emp, name: v })} testid="manual-emp-name" required />
            <T label="Designation" value={emp.designation} onChange={v => setEmp({ ...emp, designation: v })} testid="manual-emp-designation" />
            <T label="Department" value={emp.department} onChange={v => setEmp({ ...emp, department: v })} testid="manual-emp-department" />
            <T label="Location" value={emp.location} onChange={v => setEmp({ ...emp, location: v })} testid="manual-emp-location" />
            <T label="D.O.J" value={emp.doj} onChange={v => setEmp({ ...emp, doj: v })} testid="manual-emp-doj" />
            <T label="Bank" value={emp.bank_name} onChange={v => setEmp({ ...emp, bank_name: v })} testid="manual-emp-bank" />
            <T label="A/c No" value={emp.account_no} onChange={v => setEmp({ ...emp, account_no: v })} testid="manual-emp-acc" />
            <T label="PAN No" value={emp.pan} onChange={v => setEmp({ ...emp, pan: v })} testid="manual-emp-pan" />
            <T label="P.F. No." value={emp.pf_no} onChange={v => setEmp({ ...emp, pf_no: v })} testid="manual-emp-pf" />
            <T label="UAN No." value={emp.uan} onChange={v => setEmp({ ...emp, uan: v })} testid="manual-emp-uan" />
            <T label="ESI No." value={emp.esi_no} onChange={v => setEmp({ ...emp, esi_no: v })} testid="manual-emp-esi" />
          </div>
        </section>

        {/* Working */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            Working Details
            <span className="text-xs font-normal text-emerald-600">(Working / Weekoff / Holidays auto-filled from Settings)</span>
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <N label="Working Days" value={working.working_days} onChange={v => setWorking({ ...working, working_days: v })} testid="manual-wd" />
            <N label="Weekoff (auto)" value={working.weekoff} onChange={v => setWorking({ ...working, weekoff: v })} testid="manual-wo" />
            <N label="Pay Holiday (auto)" value={working.pay_holiday} onChange={v => setWorking({ ...working, pay_holiday: v })} testid="manual-ph" />
            <N label="Present Days" value={working.present_days} onChange={v => setWorking({ ...working, present_days: v })} testid="manual-pd" />
            <N label="CL" value={working.cl} onChange={v => setWorking({ ...working, cl: v })} testid="manual-cl" />
            <N label="PL" value={working.pl} onChange={v => setWorking({ ...working, pl: v })} testid="manual-pl" />
            <N label="SL" value={working.sl} onChange={v => setWorking({ ...working, sl: v })} testid="manual-sl" />
            <N label="M.L." value={working.ml} onChange={v => setWorking({ ...working, ml: v })} testid="manual-ml" />
            <N label="LWP" value={working.lwp} onChange={v => setWorking({ ...working, lwp: v })} testid="manual-lwp" />
          </div>
        </section>

        {/* Earnings */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Earnings (Actual / Payable)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <N label="Basic Actual" value={earnings.basic_a} onChange={v => setEarnings({ ...earnings, basic_a: v })} testid="manual-basic-a" />
            <N label="Basic Payable" value={earnings.basic_p} onChange={v => setEarnings({ ...earnings, basic_p: v })} testid="manual-basic-p" />
            <N label="DA Actual" value={earnings.da_a} onChange={v => setEarnings({ ...earnings, da_a: v })} testid="manual-da-a" />
            <N label="DA Payable" value={earnings.da_p} onChange={v => setEarnings({ ...earnings, da_p: v })} testid="manual-da-p" />
            <N label="HRA Actual" value={earnings.hra_a} onChange={v => setEarnings({ ...earnings, hra_a: v })} testid="manual-hra-a" />
            <N label="HRA Payable" value={earnings.hra_p} onChange={v => setEarnings({ ...earnings, hra_p: v })} testid="manual-hra-p" />
            <N label="SP.ALL Actual" value={earnings.sp_a} onChange={v => setEarnings({ ...earnings, sp_a: v })} testid="manual-sp-a" />
            <N label="SP.ALL Payable" value={earnings.sp_p} onChange={v => setEarnings({ ...earnings, sp_p: v })} testid="manual-sp-p" />
            <N label="Incentive Actual" value={earnings.incentive_a} onChange={v => setEarnings({ ...earnings, incentive_a: v })} testid="manual-inc-a" />
            <N label="Incentive Payable" value={earnings.incentive_p} onChange={v => setEarnings({ ...earnings, incentive_p: v })} testid="manual-inc-p" />
          </div>
        </section>

        {/* Deductions */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Deductions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <N label="P.F" value={ded.pf} onChange={v => setDed({ ...ded, pf: v })} testid="manual-pf" />
            <N label="ESI" value={ded.esi} onChange={v => setDed({ ...ded, esi: v })} testid="manual-esi" />
            <N label="P.T." value={ded.pt} onChange={v => setDed({ ...ded, pt: v })} testid="manual-pt" />
            <N label="I.T." value={ded.it} onChange={v => setDed({ ...ded, it: v })} testid="manual-it" />
            <N label="L.W.F" value={ded.lwf} onChange={v => setDed({ ...ded, lwf: v })} testid="manual-lwf" />
            <N label="Advance" value={ded.advance} onChange={v => setDed({ ...ded, advance: v })} testid="manual-adv" />
            <N label="Loan" value={ded.loan} onChange={v => setDed({ ...ded, loan: v })} testid="manual-loan" />
            <N label="Oth. Ded" value={ded.oth} onChange={v => setDed({ ...ded, oth: v })} testid="manual-oth" />
            <N label="Food" value={ded.food} onChange={v => setDed({ ...ded, food: v })} testid="manual-food" />
            <N label="E/Mbill" value={ded.emmbill} onChange={v => setDed({ ...ded, emmbill: v })} testid="manual-emm" />
          </div>
        </section>

        {/* Totals preview */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Gross Income</div>
              <div className="text-lg font-semibold text-slate-800" data-testid="manual-gross">₹ {gross.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Deduction</div>
              <div className="text-lg font-semibold text-slate-800" data-testid="manual-total-ded">₹ {totalDed.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Net Amount</div>
              <div className="text-lg font-bold text-emerald-700" data-testid="manual-net">₹ {net.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6" data-testid="manual-generate-btn">
            {busy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
            Generate Manual Slip
          </Button>
        </div>
      </div>
    </Layout>
  );
}
