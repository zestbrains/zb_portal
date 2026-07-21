import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Trash2, Plus, Loader2, Calendar } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

const LETTER_TYPES = [
  { key: 'offer_letter', label: 'Offer Letter', icon: '📄' },
  { key: 'appointment_letter', label: 'Appointment Letter', icon: '📋' },
  { key: 'experience_letter', label: 'Experience Letter', icon: '📜' },
  { key: 'relieving_letter', label: 'Relieving Letter', icon: '📤' },
  { key: 'internship_appointment', label: 'Internship Appointment', icon: '🎓' },
  { key: 'internship_completion', label: 'Internship Completion', icon: '🏆' },
  { key: 'increment_letter', label: 'Increment Letter', icon: '📈' },
];

const LETTER_FIELDS = {
  offer_letter: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'designation', label: 'Designation Offered', type: 'text', required: true },
    { key: 'department', label: 'Department', type: 'text', required: true },
    { key: 'offered_salary', label: 'Monthly CTC Offered (Rs.)', type: 'number', required: true },
    { key: 'joining_date', label: 'Joining Date', type: 'date', required: true },
    { key: 'probation_period', label: 'Probation Period', type: 'text', placeholder: '6 Months' },
    { key: 'work_location', label: 'Work Location', type: 'text', placeholder: 'Ahmedabad' },
  ],
  appointment_letter: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'designation', label: 'Designation', type: 'text', required: true },
    { key: 'department', label: 'Department', type: 'text', required: true },
    { key: 'salary', label: 'Monthly CTC (Rs.)', type: 'number', required: true },
    { key: 'joining_date', label: 'Joining Date', type: 'date', required: true },
    { key: 'probation_period', label: 'Probation Period', type: 'text', placeholder: '6 Months' },
    { key: 'work_location', label: 'Work Location', type: 'text', placeholder: 'Ahmedabad' },
    { key: 'working_hours', label: 'Working Hours', type: 'text', placeholder: '9:30 AM to 6:30 PM, Monday to Friday' },
  ],
  experience_letter: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'designation', label: 'Designation Held', type: 'text', required: true },
    { key: 'joining_date', label: 'Joining Date', type: 'date', required: true },
    { key: 'last_working_date', label: 'Last Working Date', type: 'date', required: true },
    { key: 'performance_note', label: 'Performance Note (optional)', type: 'textarea' },
  ],
  relieving_letter: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'designation', label: 'Designation', type: 'text', required: true },
    { key: 'joining_date', label: 'Joining Date', type: 'date', required: true },
    { key: 'last_working_date', label: 'Last Working Date', type: 'date', required: true },
  ],
  internship_appointment: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'department', label: 'Department', type: 'text', required: true },
    { key: 'internship_duration', label: 'Duration (e.g. 3 Months)', type: 'text', required: true },
    { key: 'start_date', label: 'Start Date', type: 'date', required: true },
    { key: 'end_date', label: 'End Date', type: 'date', required: true },
    { key: 'stipend', label: 'Monthly Stipend (Rs.)', type: 'number' },
    { key: 'work_location', label: 'Work Location', type: 'text', placeholder: 'Ahmedabad' },
    { key: 'working_hours', label: 'Working Hours', type: 'text', placeholder: '9:30 AM to 6:30 PM, Monday to Friday' },
  ],
  internship_completion: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'department', label: 'Department', type: 'text', required: true },
    { key: 'start_date', label: 'Internship Start Date', type: 'date', required: true },
    { key: 'end_date', label: 'Internship End Date', type: 'date', required: true },
    { key: 'project_details', label: 'Project Details', type: 'textarea' },
    { key: 'performance_note', label: 'Performance Note', type: 'textarea' },
  ],
  increment_letter: [
    { key: 'letter_date', label: 'Letter Date', type: 'date', required: true },
    { key: 'salutation', label: 'Salutation', type: 'select', options: ['Mr', 'Miss', 'Mrs'], required: true },
    { key: 'designation', label: 'Current Designation', type: 'text', required: true },
    { key: 'new_designation', label: 'New Designation (if changed)', type: 'text' },
    { key: 'old_salary', label: 'Previous Monthly CTC (Rs.)', type: 'number', required: true },
    { key: 'new_salary', label: 'Revised Monthly CTC (Rs.)', type: 'number', required: true },
    { key: 'increment_percentage', label: 'Increment %', type: 'number' },
    { key: 'effective_date', label: 'Effective From', type: 'date', required: true },
  ],
};

export default function EmployeeDetail({ user, onLogout }) {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedLetterType, setSelectedLetterType] = useState(null);
  const [formInputs, setFormInputs] = useState({});
  const [generating, setGenerating] = useState(false);
  const currentDate = new Date();
  // Auto-gen supported only from March 2026 onwards
  const AUTO_MIN_Y = 2026, AUTO_MIN_M = 3;
  const defaultAuto = (() => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    // clamp to March 2026
    if (prev.getFullYear() < AUTO_MIN_Y || (prev.getFullYear() === AUTO_MIN_Y && prev.getMonth() + 1 < AUTO_MIN_M)) {
      return { y: AUTO_MIN_Y, m: AUTO_MIN_M };
    }
    return { y: prev.getFullYear(), m: prev.getMonth() + 1 };
  })();
  const [slipMonth, setSlipMonth] = useState(defaultAuto.m);
  const [slipYear, setSlipYear] = useState(defaultAuto.y);
  const [generatingSlip, setGeneratingSlip] = useState(false);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualPrefill, setManualPrefill] = useState(null);
  const [manualValues, setManualValues] = useState({
    working_days: 30, present_days: 22, weekoff: 8, pay_holiday: 0,
    cl: 0, pl: 0, sl: 0, ml: 0, lwp: 0,
    basic_a: 0, basic_p: 0, hra_a: 0, hra_p: 0, sp_a: 0, sp_p: 0, incentive_a: 0, incentive_p: 0,
    pf: 0, esi: 0, pt: 0, it: 0, lwf: 0, advance: 0, loan: 0, oth: 0, food: 0, emmbill: 0,
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  const isFutureOrCurrent = (y, m) => {
    return (y > currentDate.getFullYear()) || (y === currentDate.getFullYear() && m >= currentDate.getMonth() + 1);
  };
  const isBeforeAutoMin = (y, m) => {
    return (y < AUTO_MIN_Y) || (y === AUTO_MIN_Y && m < AUTO_MIN_M);
  };
  const isMonthLocked = (y, m) => isFutureOrCurrent(y, m) || isBeforeAutoMin(y, m);

  const handleGenerateSalarySlip = async () => {
    if (slipYear < 2021) {
      toast.error('Year must be 2021 or later');
      return;
    }
    if (isFutureOrCurrent(slipYear, slipMonth)) {
      toast.error('Only past months allowed (not current or future)');
      return;
    }
    setGeneratingSlip(true);
    try {
      const res = await api.post('/documents/salary-slip', {
        employee_id: employeeId,
        year: slipYear,
        month: slipMonth,
      });
      if (res.data.needs_manual) {
        // Prefill defaults from employee record and split CTC
        const pf = res.data.prefill || {};
        const salary = Number(pf.salary || 0);
        setManualPrefill(pf);
        setManualValues(v => ({
          ...v,
          basic_a: Math.round(salary * 0.5), basic_p: Math.round(salary * 0.5),
          hra_a: Math.round(salary * 0.2), hra_p: Math.round(salary * 0.2),
          sp_a: Math.round(salary * 0.3), sp_p: Math.round(salary * 0.3),
          pf: pf.epf || 0, esi: pf.esic || 0, pt: pf.pt || 0,
        }));
        setManualFormOpen(true);
        toast.info(res.data.message || 'No auto data — please fill values manually.');
        return;
      }
      const pdfBytes = Uint8Array.from(atob(res.data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee?.name}_${res.data.letter_title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Salary slip generated!');
      const docsRes = await api.get(`/documents/${employeeId}`);
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate salary slip');
    } finally {
      setGeneratingSlip(false);
    }
  };

  const submitManualSalarySlip = async () => {
    const v = manualValues;
    const gross = (Number(v.basic_p) || 0) + (Number(v.hra_p) || 0) + (Number(v.sp_p) || 0) + (Number(v.incentive_p) || 0);
    const totalDed = ['pf','esi','pt','it','lwf','advance','loan','oth','food','emmbill'].reduce((a,k)=>a+(Number(v[k])||0),0);
    const net = Math.max(gross - totalDed, 0);
    const p = manualPrefill || {};
    const payload = {
      year: slipYear, month: slipMonth,
      employee_id: employeeId,
      company: { name: p.company_name || 'ZESTBRAINS', address: p.company_address || '' },
      employee: {
        emp_id: p.employee_id || '', name: (p.name || employee?.name || '').toUpperCase(),
        designation: p.designation || '', department: p.department || '',
        location: p.location || 'Ahmedabad', doj: p.doj || '',
        bank_name: p.bank_name || '', account_no: p.account_no || '',
        pan: p.pan || '', pf_no: p.pf_no || '', uan: p.uan || '', esi_no: p.esi_no || '',
      },
      working: [
        { label: 'Working Days', value: Number(v.working_days) || 0 },
        { label: 'Weekoff', value: Number(v.weekoff) || 0 },
        { label: 'Pay Holiday', value: Number(v.pay_holiday) || 0 },
        { label: 'Present Days', value: Number(v.present_days) || 0 },
        { label: 'CL', value: Number(v.cl) || 0 },
        { label: 'PL', value: Number(v.pl) || 0 },
        { label: 'SL', value: Number(v.sl) || 0 },
        { label: 'M.L.', value: Number(v.ml) || 0 },
        { label: 'LWP', value: Number(v.lwp) || 0 },
      ],
      earnings: [
        { label: 'Basic', actual: Number(v.basic_a) || 0, payable: Number(v.basic_p) || 0 },
        { label: 'DA', actual: 0, payable: 0 },
        { label: 'HRA', actual: Number(v.hra_a) || 0, payable: Number(v.hra_p) || 0 },
        { label: 'SP. ALL.', actual: Number(v.sp_a) || 0, payable: Number(v.sp_p) || 0 },
        { label: 'INCENTIVE', actual: Number(v.incentive_a) || 0, payable: Number(v.incentive_p) || 0 },
      ],
      deductions: [
        { label: 'P.F', value: Number(v.pf) || 0 },
        { label: 'ESI', value: Number(v.esi) || 0 },
        { label: 'P.T.', value: Number(v.pt) || 0 },
        { label: 'I.T.', value: Number(v.it) || 0 },
        { label: 'L.W.F', value: Number(v.lwf) || 0 },
        { label: 'Advance', value: Number(v.advance) || 0 },
        { label: 'Loan Installment', value: Number(v.loan) || 0 },
        { label: 'Oth. Ded', value: Number(v.oth) || 0 },
        { label: 'Food', value: Number(v.food) || 0 },
        { label: 'E/Mbill', value: Number(v.emmbill) || 0 },
      ],
      totals: { gross_income: gross, total_deduction: totalDed, net_amount: net },
    };
    setSubmittingManual(true);
    try {
      const res = await api.post('/documents/salary-slip/manual', payload);
      const pdfBytes = Uint8Array.from(atob(res.data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee?.name}_${res.data.letter_title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Manual salary slip generated!');
      setManualFormOpen(false);
      const docsRes = await api.get(`/documents/${employeeId}`);
      setDocuments(docsRes.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate');
    } finally {
      setSubmittingManual(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, bankRes, allEmpRes, docsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/banks'),
        api.get('/employees'),
        api.get(`/documents/${employeeId}`),
      ]);
      const emp = empRes.data.find(e => e.employee_id === employeeId);
      setEmployee(emp || null);
      setDepartments(deptRes.data);
      setBanks(bankRes.data.filter(b => b.is_active));
      setEmployees(allEmpRes.data);
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error('Error loading employee data');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentNames = (emp) => {
    if (!emp?.department_ids?.length) return 'N/A';
    return emp.department_ids.map(id => {
      const dept = departments.find(d => d.id === id);
      return dept ? dept.name : id;
    }).join(', ');
  };

  const openLetterForm = (type) => {
    setSelectedLetterType(type);
    const defaults = {};
    const today = new Date().toISOString().split('T')[0];
    defaults.letter_date = today;
    if (employee) {
      const deptName = getDepartmentNames(employee);
      const fields = LETTER_FIELDS[type] || [];
      for (const f of fields) {
        if (f.key === 'department' && deptName !== 'N/A') defaults.department = deptName;
        if (f.key === 'joining_date' && employee.joining_date) defaults.joining_date = employee.joining_date.split('T')[0];
        if (f.key === 'salary' || f.key === 'offered_salary') {
          if (employee.salary) defaults[f.key] = employee.salary;
        }
        if (f.key === 'old_salary' && employee.salary) defaults.old_salary = employee.salary;
        if (f.key === 'designation' && employee.designation) defaults.designation = employee.designation;
      }
    }
    setFormInputs(defaults);
    setGenerateDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!selectedLetterType) return;
    const fields = LETTER_FIELDS[selectedLetterType] || [];
    for (const f of fields) {
      if (f.required && !formInputs[f.key]) {
        toast.error(`Please fill in: ${f.label}`);
        return;
      }
    }
    setGenerating(true);
    try {
      const res = await api.post('/documents/generate', {
        employee_id: employeeId,
        letter_type: selectedLetterType,
        inputs: formInputs,
      });
      // Download the PDF
      const pdfBytes = Uint8Array.from(atob(res.data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${employee?.name}_${res.data.letter_title}_${res.data.created_at?.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${res.data.letter_title} generated and downloaded!`);
      setGenerateDialogOpen(false);
      // Refresh document list
      const docsRes = await api.get(`/documents/${employeeId}`);
      setDocuments(docsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (docId, title, empName, date) => {
    try {
      const res = await api.get(`/documents/download/${docId}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${empName}_${title}_${date?.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="text-center py-16">
          <p className="text-slate-500">Employee not found.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft size={16} className="mr-2" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="max-w-5xl mx-auto" data-testid="employee-detail-page">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-slate-500 hover:text-slate-700" data-testid="back-button">
          <ArrowLeft size={16} className="mr-2" /> Back to Employees
        </Button>

        {/* Employee Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-indigo-600">{employee.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900" data-testid="employee-name">{employee.name}</h1>
              <p className="text-slate-500 text-sm">Employee ID: {employee.employee_id}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={employee.status === 'active' ? 'default' : 'destructive'} className={employee.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                  {employee.status?.toUpperCase()}
                </Badge>
                {employee.status === 'ex-employee' && employee.last_working_date && (
                  <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">
                    Last Working: {new Date(employee.last_working_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                )}
                <span className="text-xs text-slate-400">|</span>
                <span className="text-sm text-slate-500">{employee.role || 'Employee'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-5 bg-white border border-slate-200" data-testid="employee-tabs">
            <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
            <TabsTrigger value="work" className="text-xs">Work</TabsTrigger>
            <TabsTrigger value="bank" className="text-xs">Bank</TabsTrigger>
            <TabsTrigger value="salary" className="text-xs">Salary</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs" data-testid="documents-tab">Documents</TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard label="Email" value={employee.email} />
                <InfoCard label="Phone" value={employee.phone} />
                <InfoCard label="Password" value={employee.plain_password || 'Not set'} highlight="amber" />
                <InfoCard label="Birth Date" value={employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} />
              </div>
            </div>
          </TabsContent>

          {/* Work Tab */}
          <TabsContent value="work">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard label="Department(s)" value={getDepartmentNames(employee)} />
                <InfoCard label="Experience" value={employee.experience || 'N/A'} />
                <InfoCard label="Joining Date" value={employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} />
                {employee.status === 'ex-employee' && employee.last_working_date && (
                  <InfoCard label="Last Working Date" value={new Date(employee.last_working_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                )}
                <InfoCard label="Probation End Date" value={employee.probation_end_date ? new Date(employee.probation_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} />
                <div className="sm:col-span-2">
                  <InfoCard label="Team Leaders" value={
                    employee.team_leader_ids?.length > 0
                      ? employee.team_leader_ids.map(id => employees.find(e => e.employee_id === id)?.name || id).join(', ')
                      : 'None assigned'
                  } />
                </div>
              </div>
              {/* Leave Summary */}
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-700 font-semibold mb-2">Leave Summary</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xl font-bold text-indigo-600">{employee.annual_pl_allocation || 16}</p>
                    <p className="text-xs text-slate-500">Annual PL</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xl font-bold text-orange-600">{employee.pl_taken || 0}</p>
                    <p className="text-xs text-slate-500">PL Taken</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xl font-bold text-red-600">{employee.cl_taken || 0}</p>
                    <p className="text-xs text-slate-500">CL Taken</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="grid grid-cols-1 gap-3">
                <InfoCard label="Bank Name" value={employee.bank_id ? (banks.find(b => b.id === employee.bank_id)?.name || 'Unknown Bank') : 'Not assigned'} />
                <InfoCard label="Account Number" value={employee.bank_account_number || 'N/A'} mono />
                <InfoCard label="IFSC Code" value={employee.ifsc_code || 'N/A'} mono />
              </div>
            </div>
          </TabsContent>

          {/* Salary Tab */}
          <TabsContent value="salary">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-xs text-green-700 mb-1">Monthly Salary (CTC)</p>
                <p className="text-3xl font-bold text-green-800">
                  Rs. {employee.salary ? Number(employee.salary).toLocaleString('en-IN') : '0'}
                </p>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Deductions</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Professional Tax (PT)" value={`Rs. ${employee.pt || '0'}`} />
                <InfoCard label="ESIC" value={`Rs. ${employee.esic || '0'}`} />
                <InfoCard label="EPF (Employee)" value={`Rs. ${employee.epf || '0'}`} />
                <InfoCard label="CPF (Company)" value={`Rs. ${employee.cpf || '0'}`} />
              </div>
              <div className="mt-4 p-4 bg-slate-100 border rounded-lg flex justify-between items-center">
                <span className="text-sm text-slate-600">Estimated Net Salary</span>
                <span className="font-bold text-lg text-slate-900">
                  Rs. {(Number(employee.salary || 0) - Number(employee.pt || 0) - Number(employee.esic || 0) - Number(employee.epf || 0) - Number(employee.cpf || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" data-testid="documents-tab-content">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-800">Generate Letters</h3>
              </div>

              {/* Letter Type Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {LETTER_TYPES.map(lt => (
                  <button
                    key={lt.key}
                    onClick={() => openLetterForm(lt.key)}
                    className="p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all group"
                    data-testid={`generate-${lt.key}`}
                  >
                    <span className="text-2xl block mb-2">{lt.icon}</span>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700">{lt.label}</p>
                  </button>
                ))}
              </div>

              {/* Salary Slip Generator */}
              <div className="mb-6 p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl" data-testid="salary-slip-section">
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" /> Salary Slip (Month-wise)
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs text-slate-500 mb-1">Month</Label>
                    <select
                      value={slipMonth}
                      onChange={e => setSlipMonth(Number(e.target.value))}
                      className="w-full h-9 px-2 border border-slate-200 rounded-md text-sm bg-white"
                      data-testid="salary-slip-month"
                    >
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
                        const disabled = isMonthLocked(slipYear, i+1);
                        return <option key={i+1} value={i+1} disabled={disabled}>{m}{disabled ? ' (locked)' : ''}</option>;
                      })}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs text-slate-500 mb-1">Year</Label>
                    <select
                      value={slipYear}
                      onChange={e => setSlipYear(Number(e.target.value))}
                      className="w-full h-9 px-2 border border-slate-200 rounded-md text-sm bg-white"
                      data-testid="salary-slip-year"
                    >
                      {Array.from({length: currentDate.getFullYear() - 2021 + 1}, (_, i) => 2021 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={handleGenerateSalarySlip}
                    disabled={generatingSlip}
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="generate-salary-slip-btn"
                  >
                    {generatingSlip ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                    Generate Slip
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Auto-generation supports Mar 2026 → previous month. For earlier months, use <strong>Settings → Manual Salary Slip</strong>.</p>
              </div>

              {/* Previously Generated Documents */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} /> Generated Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No documents generated yet. Click a letter type above to generate.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg" data-testid={`doc-${doc.id}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText size={18} className="text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.letter_title}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {doc.generated_by ? ` by ${doc.generated_by}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id, doc.letter_title, doc.employee_name, doc.created_at)} className="h-7 text-xs" data-testid={`download-${doc.id}`}>
                            <Download size={12} className="mr-1" /> PDF
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" data-testid={`delete-${doc.id}`}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer timestamps */}
        <div className="mt-4 text-xs text-slate-400 flex justify-between px-1 pb-4">
          <span>Created: {employee.created_at ? new Date(employee.created_at).toLocaleDateString('en-IN') : 'N/A'}</span>
          <span>Updated: {employee.updated_at ? new Date(employee.updated_at).toLocaleDateString('en-IN') : 'N/A'}</span>
        </div>

        {/* Generate Letter Dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText size={18} />
                Generate {LETTER_TYPES.find(l => l.key === selectedLetterType)?.label || 'Letter'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="p-3 bg-slate-50 rounded-lg border text-xs text-slate-600">
                <span className="font-semibold">Employee:</span> {employee.name} (ID: {employee.employee_id})
              </div>
              {selectedLetterType && (LETTER_FIELDS[selectedLetterType] || []).map(field => (
                <div key={field.key}>
                  <Label className="text-xs font-medium text-slate-600">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 min-h-[60px]"
                      value={formInputs[field.key] || ''}
                      placeholder={field.placeholder || ''}
                      onChange={e => setFormInputs({ ...formInputs, [field.key]: e.target.value })}
                      data-testid={`input-${field.key}`}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 h-9"
                      value={formInputs[field.key] || ''}
                      onChange={e => setFormInputs({ ...formInputs, [field.key]: e.target.value })}
                      data-testid={`input-${field.key}`}
                    >
                      <option value="">Select {field.label}</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={field.type}
                      value={formInputs[field.key] || ''}
                      placeholder={field.placeholder || ''}
                      onChange={e => setFormInputs({ ...formInputs, [field.key]: e.target.value })}
                      className="mt-1"
                      data-testid={`input-${field.key}`}
                    />
                  )}
                </div>
              ))}
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                data-testid="generate-pdf-button"
              >
                {generating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download size={16} className="mr-2" />}
                {generating ? 'Generating PDF...' : 'Generate & Download PDF'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Manual Salary Slip Dialog */}
        <Dialog open={manualFormOpen} onOpenChange={setManualFormOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="manual-slip-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText size={18} className="text-emerald-600" />
                Manual Salary Slip — {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][slipMonth-1]} {slipYear}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2 text-sm">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                {manualPrefill && (
                  <>
                    <strong>{manualPrefill.name}</strong> · {manualPrefill.designation || '—'} · {manualPrefill.department || '—'}
                  </>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Working Details</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {[['working_days','Working'], ['weekoff','Weekoff'], ['pay_holiday','Pay Hol'], ['present_days','Present'], ['cl','CL'], ['pl','PL'], ['sl','SL'], ['ml','M.L.'], ['lwp','LWP']].map(([k, lbl]) => (
                    <div key={k}>
                      <Label className="text-[10px] text-slate-500">{lbl}</Label>
                      <Input type="number" value={manualValues[k]} onChange={e => setManualValues({...manualValues, [k]: e.target.value})} className="h-8 text-xs" data-testid={`ms-${k}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Earnings (Actual / Payable)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[['basic','Basic'], ['hra','HRA'], ['sp','SP.ALL'], ['incentive','Incentive']].map(([k, lbl]) => (
                    <div key={k} className="col-span-1 grid grid-cols-2 gap-1">
                      <div>
                        <Label className="text-[10px] text-slate-500">{lbl} Actual</Label>
                        <Input type="number" value={manualValues[k+'_a']} onChange={e => setManualValues({...manualValues, [k+'_a']: e.target.value})} className="h-8 text-xs" data-testid={`ms-${k}-a`} />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500">{lbl} Payable</Label>
                        <Input type="number" value={manualValues[k+'_p']} onChange={e => setManualValues({...manualValues, [k+'_p']: e.target.value})} className="h-8 text-xs" data-testid={`ms-${k}-p`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Deductions</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {[['pf','P.F'], ['esi','ESI'], ['pt','P.T.'], ['it','I.T.'], ['lwf','L.W.F'], ['advance','Advance'], ['loan','Loan'], ['oth','Oth'], ['food','Food'], ['emmbill','E/Mbill']].map(([k, lbl]) => (
                    <div key={k}>
                      <Label className="text-[10px] text-slate-500">{lbl}</Label>
                      <Input type="number" value={manualValues[k]} onChange={e => setManualValues({...manualValues, [k]: e.target.value})} className="h-8 text-xs" data-testid={`ms-${k}`} />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={submitManualSalarySlip} disabled={submittingManual} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="submit-manual-slip">
                {submittingManual ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Download size={14} className="mr-2" />}
                {submittingManual ? 'Generating...' : 'Generate & Download Slip'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function InfoCard({ label, value, highlight, mono }) {
  const bg = highlight === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200';
  const textColor = highlight === 'amber' ? 'text-amber-800' : 'text-slate-900';
  return (
    <div className={`p-3 border rounded-lg ${bg}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`font-medium text-sm ${textColor} ${mono ? 'font-mono' : ''} break-all`}>{value || 'N/A'}</p>
    </div>
  );
}
