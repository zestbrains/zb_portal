import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Edit2, Trash2, Search, X, FileText, Download, Upload, Folder, FolderPlus, ArrowLeft, File as FileIcon, Eye } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const blankItem = () => ({
  item: '', description: '', quantity: 1, amount: 0, currency: 'USD', sac: '', tax_percent: 0,
});

const emptyForm = (type = 'export') => ({
  type,
  invoice_date: new Date().toISOString().slice(0, 10),
  country_of_origin: 'India',
  bank_id: '',
  client_id: '',
  items: [blankItem()],
  notes: '',
  discount: 0,
  tax_mode: 'cgst_sgst',
  cgst_amount: 0,
  sgst_amount: 0,
  igst_amount: 0,
  status: 'draft',
});

export default function Invoices({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('export');
  const [invoices, setInvoices] = useState([]);
  const [banks, setBanks] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm('export'));
  const [nextNumber, setNextNumber] = useState('');

  // Bank Statement upload + preview popup
  const [stmtDialogOpen, setStmtDialogOpen] = useState(false);
  const [stmtUploading, setStmtUploading] = useState(false);
  const [stmtFileName, setStmtFileName] = useState('');
  const [stmtRows, setStmtRows] = useState([]);
  const [stmtBulkBankId, setStmtBulkBankId] = useState('');
  const [stmtCreating, setStmtCreating] = useState(false);
  const [stmtCreatedNumbers, setStmtCreatedNumbers] = useState([]);
  const [stmtRemarksMonth, setStmtRemarksMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [stmtRemarksYear, setStmtRemarksYear] = useState(String(new Date().getFullYear()));

  const STATIC_ITEMS = [
    'Mobile apps development',
    'website development',
    'Graphics designing',
    'Web designing',
  ];

  // Month-Year remarks helpers
  const MONTHS = [
    { v: '01', l: 'January' }, { v: '02', l: 'February' }, { v: '03', l: 'March' },
    { v: '04', l: 'April' }, { v: '05', l: 'May' }, { v: '06', l: 'June' },
    { v: '07', l: 'July' }, { v: '08', l: 'August' }, { v: '09', l: 'September' },
    { v: '10', l: 'October' }, { v: '11', l: 'November' }, { v: '12', l: 'December' },
  ];
  const CURRENT_YEAR = new Date().getFullYear();
  const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - 2 + i));
  const formatRemarks = (ym) => {
    if (!ym || !ym.includes('-')) return ym || '';
    const [y, m] = ym.split('-');
    const month = MONTHS.find(x => x.v === m);
    return month ? `${month.l} ${y}` : ym;
  };

  const minusOneDay = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  const handleUploadStatement = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }
    setStmtUploading(true);
    setStmtFileName(file.name);
    setStmtRows([]);
    setStmtBulkBankId('');
    setStmtCreatedNumbers([]);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/invoices/parse-bank-statement`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to parse bank statement');
      }
      const data = await res.json();
      if (!data.rows || data.rows.length === 0) {
        toast.warning('No credit (deposit) rows found in this statement');
      }
      // Enrich rows with editable per-row invoice fields
      const enriched = (data.rows || []).map(r => ({
        ...r,
        client_id: '',
        bank_id: '',
        item_name: STATIC_ITEMS[0],
        invoice_date: minusOneDay(r.transaction_date),
        // override_usd allows manual edit if FX failed or user wants to tweak
        override_usd: r.usd_amount != null ? Number(r.usd_amount) : 0,
      }));
      setStmtRows(enriched);
      setStmtDialogOpen(true);
      if (data.warnings?.length) toast.warning(data.warnings.join('; '));
    } catch (e) { toast.error(e.message); }
    finally { setStmtUploading(false); }
  };

  const removeStmtRow = (idx) => {
    setStmtRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateStmtRow = (idx, field, value) => {
    setStmtRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const applyBankToAll = (bankId) => {
    setStmtBulkBankId(bankId);
    setStmtRows(prev => prev.map(r => ({ ...r, bank_id: bankId })));
  };

  const closeStmtDialog = () => {
    setStmtDialogOpen(false);
    setStmtRows([]);
    setStmtFileName('');
    setStmtBulkBankId('');
    setStmtCreatedNumbers([]);
  };

  // ============ Statements (Folders + Files) ============
  const [stFolders, setStFolders] = useState([]);
  const [stCurrentFolder, setStCurrentFolder] = useState(null); // object when inside a folder
  const [stFiles, setStFiles] = useState([]);
  const [stLoading, setStLoading] = useState(false);
  const [stNewFolderOpen, setStNewFolderOpen] = useState(false);
  const [stNewFolderName, setStNewFolderName] = useState('');
  const [stNewFolderMonth, setStNewFolderMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [stNewFolderYear, setStNewFolderYear] = useState(String(new Date().getFullYear()));
  const [stDeletingFolder, setStDeletingFolder] = useState(null);
  const [stDeletingFile, setStDeletingFile] = useState(null);
  const [stUploading, setStUploading] = useState(false);

  const fetchStFolders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load folders');
      setStFolders(await res.json());
    } catch (e) { toast.error(e.message); }
  }, []);

  const fetchStFiles = useCallback(async (folderId) => {
    try {
      setStLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-folders/${folderId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      setStFiles(data.files || []);
      setStCurrentFolder(data.folder);
    } catch (e) { toast.error(e.message); }
    finally { setStLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'statements') fetchStFolders();
  }, [activeTab, fetchStFolders]);

  const createStFolder = async () => {
    const name = stNewFolderName.trim();
    if (!name) { toast.error('Folder name is required'); return; }
    const remarks = stNewFolderYear && stNewFolderMonth ? `${stNewFolderYear}-${stNewFolderMonth}` : '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, remarks }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create folder');
      }
      toast.success('Folder created');
      setStNewFolderOpen(false);
      setStNewFolderName('');
      fetchStFolders();
    } catch (e) { toast.error(e.message); }
  };

  const deleteStFolder = async () => {
    if (!stDeletingFolder) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-folders/${stDeletingFolder.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete folder');
      }
      toast.success('Folder deleted');
      setStDeletingFolder(null);
      fetchStFolders();
    } catch (e) { toast.error(e.message); }
  };

  const uploadStFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !stCurrentFolder) return;
    setStUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/statement-folders/${stCurrentFolder.id}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }
      toast.success(`Uploaded ${file.name}`);
      fetchStFiles(stCurrentFolder.id);
      fetchStFolders();
    } catch (e) { toast.error(e.message); }
    finally { setStUploading(false); }
  };

  const viewStFile = async (f) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-files/${f.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast.error(e.message); }
  };

  const deleteStFile = async () => {
    if (!stDeletingFile) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statement-files/${stDeletingFile.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete file');
      toast.success('File deleted');
      setStDeletingFile(null);
      fetchStFiles(stCurrentFolder.id);
      fetchStFolders();
    } catch (e) { toast.error(e.message); }
  };

  const formatBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let n = b;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  };

  // ============ Send Mail tab ============
  const [smRemarksOptions, setSmRemarksOptions] = useState([]);
  const [smRemarks, setSmRemarks] = useState('');
  const [smToEmail, setSmToEmail] = useState('');
  const [smSending, setSmSending] = useState(false);
  const [smLastResult, setSmLastResult] = useState(null);

  // ============ Helpdesk tab ============
  const [hdWebhookUrl, setHdWebhookUrl] = useState('');
  const [hdSavingConfig, setHdSavingConfig] = useState(false);
  const [hdSettingsOpen, setHdSettingsOpen] = useState(false);
  const [hdMode, setHdMode] = useState(null); // 'income' | 'expense' | null
  const [hdRows, setHdRows] = useState([]);
  const [hdUploading, setHdUploading] = useState(false);
  const [hdSubmitting, setHdSubmitting] = useState(false);
  const [hdFileName, setHdFileName] = useState('');
  const [hdDialogOpen, setHdDialogOpen] = useState(false);
  const [hdLastResult, setHdLastResult] = useState(null);

  const fetchHelpdeskConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/helpdesk-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      setHdWebhookUrl(d.webhook_url || '');
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    if (activeTab === 'helpdesk') fetchHelpdeskConfig();
  }, [activeTab, fetchHelpdeskConfig]);

  const saveHelpdeskConfig = async () => {
    setHdSavingConfig(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/helpdesk-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ webhook_url: hdWebhookUrl }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Webhook URL saved');
    } catch (e) { toast.error(e.message); }
    finally { setHdSavingConfig(false); }
  };

  const handleHelpdeskUpload = async (file, mode) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }
    setHdUploading(true);
    setHdRows([]);
    setHdMode(mode);
    setHdFileName(file.name);
    setHdLastResult(null);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const apiMode = mode === 'income' ? 'deposit' : 'withdrawal';
      const res = await fetch(`${API_URL}/api/invoices/parse-bank-statement?mode=${apiMode}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to parse PDF');
      }
      const data = await res.json();
      setHdRows(data.rows || []);
      setHdDialogOpen(true);
      if (data.warnings?.length) toast.warning(data.warnings.join('; '));
    } catch (e) { toast.error(e.message); }
    finally { setHdUploading(false); }
  };

  const removeHdRow = (idx) => {
    setHdRows(prev => prev.filter((_, i) => i !== idx));
  };

  const submitHelpdeskRows = async () => {
    if (hdRows.length === 0) { toast.error('No rows to submit'); return; }
    if (!hdWebhookUrl.trim()) { toast.error('Configure Helpdesk webhook URL first (top-right Settings)'); return; }
    setHdSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        type: hdMode,
        rows: hdRows.map(r => ({
          transaction_date: r.transaction_date || '',
          amount: Number(r.amount || r.deposit_amount || 0),
          transaction_remarks: r.transaction_remarks || '',
        })),
      };
      const res = await fetch(`${API_URL}/api/helpdesk/submit-to-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Submit failed');
      }
      const data = await res.json();
      setHdLastResult(data);
      const wr = data.webhook_response || {};
      if (wr.ok === false) {
        toast.error(`Apps Script error: ${wr.error || 'unknown'}`);
      } else {
        toast.success(`Submitted ${data.sent} rows to Google Sheet`);
        setHdDialogOpen(false);
        setHdRows([]);
      }
    } catch (e) { toast.error(e.message); }
    finally { setHdSubmitting(false); }
  };

  const closeHelpdeskDialog = () => {
    setHdDialogOpen(false);
    setHdRows([]);
    setHdMode(null);
    setHdFileName('');
    setHdLastResult(null);
  };

  const fetchRemarksOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statements/remarks-options`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      setSmRemarksOptions(d.options || []);
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    if (activeTab === 'send-mail') fetchRemarksOptions();
  }, [activeTab, fetchRemarksOptions]);

  const handleSendMail = async () => {
    const to = (smToEmail || '').trim();
    if (!to || !to.includes('@')) { toast.error('Please enter a valid recipient email'); return; }
    if (!smRemarks) { toast.error('Please select a remarks (Month-Year)'); return; }
    setSmSending(true);
    setSmLastResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/statements/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to_email: to, remarks: smRemarks }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to send mail');
      }
      const data = await res.json();
      setSmLastResult(data);
      toast.success(`Email sent: ${data.invoices_attached} invoice(s) + ${data.files_attached} statement file(s)`);
    } catch (e) { toast.error(e.message); }
    finally { setSmSending(false); }
  };

  const handleCreateStmtInvoices = async () => {
    if (stmtRows.length === 0) {
      toast.error('No rows to create invoices for');
      return;
    }
    // Validate
    const missing = stmtRows.findIndex(r => !r.bank_id || !r.client_id || !r.item_name);
    if (missing >= 0) {
      toast.error(`Row ${missing + 1}: Bank, Client and Item are required`);
      return;
    }
    setStmtCreating(true);
    const created = [];
    const failures = [];
    try {
      const token = localStorage.getItem('token');
      // Create sequentially so backend auto-increment stays in order
      for (let i = 0; i < stmtRows.length; i++) {
        const r = stmtRows[i];
        const usdAmount = Number(r.override_usd || 0);
        if (!usdAmount) {
          failures.push({ row: i + 1, error: 'Missing USD amount (FX rate not available)' });
          continue;
        }
        const payload = {
          type: 'export',
          invoice_date: r.invoice_date || minusOneDay(r.transaction_date),
          country_of_origin: 'India',
          bank_id: r.bank_id,
          client_id: r.client_id,
          items: [{
            item: r.item_name,
            description: r.transaction_remarks || '',
            quantity: 1,
            amount: usdAmount,
            currency: 'USD',
            sac: '998314',
            tax_percent: 0,
          }],
          notes: r.fx_rate
            ? `Converted from INR ${Number(r.inr_amount).toFixed(2)} @ ${r.fx_rate} (USD on ${r.transaction_date})`
            : '',
          remarks: stmtRemarksYear && stmtRemarksMonth ? `${stmtRemarksYear}-${stmtRemarksMonth}` : '',
          discount: 0,
          tax_mode: 'cgst_sgst',
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
          status: 'draft',
        };
        try {
          const res = await fetch(`${API_URL}/api/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Failed (HTTP ${res.status})`);
          }
          const inv = await res.json();
          created.push(inv.invoice_number);
        } catch (e) {
          failures.push({ row: i + 1, error: e.message });
        }
      }
      setStmtCreatedNumbers(created);
      if (failures.length === 0) {
        toast.success(`Created ${created.length} invoice${created.length !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Created ${created.length}, failed ${failures.length}. ${failures.map(f => `Row ${f.row}: ${f.error}`).join('; ')}`);
      }
      fetchAll();
      if (failures.length === 0) closeStmtDialog();
    } finally {
      setStmtCreating(false);
    }
  };


  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [iRes, bRes, cRes] = await Promise.all([
        fetch(`${API_URL}/api/invoices`, { headers }),
        fetch(`${API_URL}/api/banks`, { headers }),
        fetch(`${API_URL}/api/clients`, { headers }),
      ]);
      setInvoices(iRes.ok ? await iRes.json() : []);
      setBanks(bRes.ok ? await bRes.json() : []);
      setClients(cRes.ok ? await cRes.json() : []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchNextNumber = async (type, date) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/invoices/next-number?type=${type}&invoice_date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      setNextNumber(d.invoice_number);
    }
  };

  const filtered = invoices
    .filter(i => i.type === activeTab)
    .filter(i => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const client = clients.find(c => c.id === i.client_id);
      return (
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (client?.name || '').toLowerCase().includes(q)
      );
    });

  const openAdd = async () => {
    setEditingInvoice(null);
    const f = emptyForm(activeTab);
    setFormData(f);
    await fetchNextNumber(activeTab, f.invoice_date);
    setIsDialogOpen(true);
  };

  const openEdit = (inv) => {
    setEditingInvoice(inv);
    setFormData({
      type: inv.type,
      invoice_date: inv.invoice_date,
      country_of_origin: inv.country_of_origin || 'India',
      bank_id: inv.bank_id,
      client_id: inv.client_id,
      items: inv.items?.length ? inv.items : [blankItem()],
      notes: inv.notes || '',
      discount: inv.discount || 0,
      tax_mode: inv.tax_mode || 'cgst_sgst',
      cgst_amount: inv.cgst_amount || 0,
      sgst_amount: inv.sgst_amount || 0,
      igst_amount: inv.igst_amount || 0,
      status: inv.status || 'draft',
    });
    setNextNumber(inv.invoice_number);
    setIsDialogOpen(true);
  };

  const updateItem = (idx, key, value) => {
    const next = [...formData.items];
    next[idx] = { ...next[idx], [key]: value };
    setFormData({ ...formData, items: next });
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, blankItem()] });
  const removeItem = (idx) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.bank_id) { toast.error('Please select "Billed By" (bank)'); return; }
    if (!formData.client_id) { toast.error('Please select "Billed To" (client)'); return; }
    if (!formData.items.length || !formData.items.some(it => it.item.trim())) {
      toast.error('Please add at least one item'); return;
    }

    const payload = {
      ...formData,
      discount: parseFloat(formData.discount || 0),
      cgst_amount: parseFloat(formData.cgst_amount || 0),
      sgst_amount: parseFloat(formData.sgst_amount || 0),
      igst_amount: parseFloat(formData.igst_amount || 0),
      items: formData.items.map(it => ({
        ...it,
        quantity: parseFloat(it.quantity || 0),
        amount: parseFloat(it.amount || 0),
        tax_percent: parseFloat(it.tax_percent || 0),
      })),
    };

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = editingInvoice ? `${API_URL}/api/invoices/${editingInvoice.id}` : `${API_URL}/api/invoices`;
      const res = await fetch(url, {
        method: editingInvoice ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save invoice');
      }
      toast.success(editingInvoice ? 'Invoice updated' : 'Invoice created');
      setIsDialogOpen(false);
      setEditingInvoice(null);
      fetchAll();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/invoices/${deletingInvoice.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete invoice');
      toast.success('Invoice deleted');
      setIsDeleteDialogOpen(false);
      setDeletingInvoice(null);
      fetchAll();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  // Bulk selection helpers (scoped to current tab/filter)
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (visibleIds) => {
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/invoices/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to bulk delete');
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} invoice${data.deleted !== 1 ? 's' : ''}`);
      setBulkDeleteOpen(false);
      clearSelection();
      fetchAll();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  // Clear selection when switching tabs
  useEffect(() => { clearSelection(); }, [activeTab]);

  const downloadPdf = async (inv) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/invoices/${inv.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast.error(e.message); }
  };

  // Live totals
  const isGst = formData.type === 'gst';
  const subtotal = formData.items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.amount || 0)), 0);
  const totalTax = isGst ? formData.items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.amount || 0)) * (parseFloat(it.tax_percent || 0) / 100), 0) : 0;
  let cgst = parseFloat(formData.cgst_amount || 0);
  let sgst = parseFloat(formData.sgst_amount || 0);
  let igst = parseFloat(formData.igst_amount || 0);
  if (isGst && (cgst + sgst + igst === 0) && totalTax > 0) {
    if (formData.tax_mode === 'igst') { igst = totalTax; }
    else { cgst = totalTax / 2; sgst = totalTax / 2; }
  }
  const discount = parseFloat(formData.discount || 0);
  const grandTotal = subtotal + cgst + sgst + igst - discount;
  const currency = formData.items.find(it => it.currency)?.currency || '';

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6" data-testid="invoices-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
            <p className="text-slate-500 mt-1">Manage Export and GST invoices</p>
          </div>
          <Button onClick={openAdd} className="gap-2" data-testid="add-invoice-btn">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>

        {/* Bank Statement upload action bar (only on Export/GST tabs) */}
        {(activeTab === 'export' || activeTab === 'gst') && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3" data-testid="stmt-upload-bar">
          <Upload className="w-4 h-4 text-slate-500" />
          <div className="flex-1 text-sm text-slate-700">
            <span className="font-medium">Upload Bank Statement</span>
            <span className="text-slate-500"> &nbsp;— ICICI Detailed Statement PDF, view deposit (credit) rows only</span>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUploadStatement}
              data-testid="stmt-upload-input"
              disabled={stmtUploading}
            />
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                stmtUploading
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-slate-900 hover:bg-slate-100 border-slate-300'
              }`}
              data-testid="stmt-upload-btn"
            >
              <Upload className="w-3.5 h-3.5" />
              {stmtUploading ? 'Parsing...' : 'Upload PDF'}
            </span>
          </label>
        </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
          <TabsList>
            <TabsTrigger value="export" data-testid="tab-export">Export Invoices</TabsTrigger>
            <TabsTrigger value="gst" data-testid="tab-gst">GST Invoices</TabsTrigger>
            <TabsTrigger value="statements" data-testid="tab-statements">Statements</TabsTrigger>
            <TabsTrigger value="send-mail" data-testid="tab-send-mail">Send Mail</TabsTrigger>
            <TabsTrigger value="helpdesk" data-testid="tab-helpdesk">Helpdesk</TabsTrigger>
          </TabsList>

          {activeTab === 'helpdesk' ? (
            <TabsContent value="helpdesk" className="mt-6 space-y-4" data-testid="helpdesk-panel">
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Helpdesk — Push to Google Sheets</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                      Upload an ICICI bank statement. Each row is reviewed in a popup; on Submit the system clears columns G, M, N of the destination sheet and writes the kept rows.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setHdSettingsOpen(o => !o)} data-testid="hd-toggle-settings">
                    ⚙ Settings
                  </Button>
                </div>

                {hdSettingsOpen && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="hd-webhook">Apps Script Webhook URL</Label>
                      <Input
                        id="hd-webhook"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={hdWebhookUrl}
                        onChange={(e) => setHdWebhookUrl(e.target.value)}
                        data-testid="hd-webhook-input"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={saveHelpdeskConfig} disabled={hdSavingConfig} data-testid="hd-save-config-btn">
                          {hdSavingConfig ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                    <details className="text-xs text-slate-600">
                      <summary className="cursor-pointer font-semibold text-slate-700">📜 How to deploy the Apps Script (5 min, one-time)</summary>
                      <ol className="list-decimal ml-5 mt-2 space-y-1">
                        <li>Open <a className="underline text-blue-600" href="https://script.google.com" target="_blank" rel="noreferrer">script.google.com</a> → New project</li>
                        <li>Paste the script below into <code>Code.gs</code></li>
                        <li>Click <b>Deploy → New deployment → Web app</b></li>
                        <li>Execute as: <b>Me</b> · Who has access: <b>Anyone</b></li>
                        <li>Copy the deployment URL (ends with <code>/exec</code>) and paste it above ☝️</li>
                        <li>Authorise the script when prompted</li>
                      </ol>
                      <pre className="mt-3 bg-slate-900 text-emerald-300 text-[11px] p-3 rounded overflow-auto whitespace-pre">{`const SHEETS = {
  income:  { id: '1JHnXCPvQeH4_aMiQR3qsmwIGJbY9MNaXsE0rfQCX_e4', gid: '1212899483' },
  expense: { id: '1SeUGHcjCr9H0Amy78Z340beyUw0Pjc9v7--Ai-6XeIg', gid: '0' },
};
const COLS = { amount: 7 /* G */, date: 13 /* M */, remarks: 14 /* N */ };

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const target = SHEETS[data.type];
    if (!target) throw new Error('Invalid type: ' + data.type);
    const ss = SpreadsheetApp.openById(target.id);
    const sheet = ss.getSheets().filter(s => String(s.getSheetId()) === target.gid)[0] || ss.getSheets()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, COLS.amount,  lastRow - 1, 1).clearContent();
      sheet.getRange(2, COLS.date,    lastRow - 1, 1).clearContent();
      sheet.getRange(2, COLS.remarks, lastRow - 1, 1).clearContent();
    }
    const rows = data.rows || [];
    rows.forEach((r, i) => {
      const row = 2 + i;
      sheet.getRange(row, COLS.amount).setValue(r.amount);
      sheet.getRange(row, COLS.date).setValue(r.transaction_date);
      sheet.getRange(row, COLS.remarks).setValue(r.transaction_remarks);
    });
    return ContentService.createTextOutput(JSON.stringify({ok: true, count: rows.length}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, error: String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                    </details>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`cursor-pointer border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg p-6 text-center transition ${hdUploading ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="hd-income-card">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={hdUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleHelpdeskUpload(f, 'income'); }}
                      data-testid="hd-income-input"
                    />
                    <Upload className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="mt-2 font-semibold text-emerald-900">Upload Invoice PDF</div>
                    <div className="text-xs text-emerald-700 mt-1">Income — writes Deposit (Cr) rows to the Income sheet</div>
                  </label>

                  <label className={`cursor-pointer border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 rounded-lg p-6 text-center transition ${hdUploading ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="hd-expense-card">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={hdUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleHelpdeskUpload(f, 'expense'); }}
                      data-testid="hd-expense-input"
                    />
                    <Upload className="w-8 h-8 text-amber-600 mx-auto" />
                    <div className="mt-2 font-semibold text-amber-900">Upload Expense PDF</div>
                    <div className="text-xs text-amber-700 mt-1">Expense — writes Withdrawal (Dr) rows to the Expense sheet</div>
                  </label>
                </div>
              </div>

              {/* Helpdesk preview dialog */}
              <Dialog open={hdDialogOpen} onOpenChange={(o) => { if (!o) closeHelpdeskDialog(); }}>
                <DialogContent className="lg:!max-w-3xl" data-testid="hd-preview-dialog">
                  <DialogHeader>
                    <DialogTitle>
                      {hdMode === 'income' ? 'Invoice (Income)' : 'Expense'} — Review rows
                      {hdFileName && <span className="block text-xs text-slate-500 font-normal mt-1 truncate">{hdFileName}</span>}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-2 max-h-[55vh] overflow-y-auto">
                    {hdRows.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">No rows.</div>
                    ) : (
                      <table className="w-full text-sm border border-slate-200 rounded">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase w-10">#</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Date</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                              {hdMode === 'income' ? 'Deposit (Cr)' : 'Withdrawal (Dr)'}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Remarks</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {hdRows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 align-top" data-testid={`hd-row-${idx}`}>
                              <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono text-slate-800">{r.transaction_date || '-'}</td>
                              <td className={`px-3 py-2 text-right font-mono font-semibold ${hdMode === 'income' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {Number(r.amount || r.deposit_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-[11px] leading-snug max-w-[260px] break-words" title={r.transaction_remarks || ''}>
                                {(r.transaction_remarks || '-').slice(0, 90)}
                                {(r.transaction_remarks || '').length > 90 ? '…' : ''}
                              </td>
                              <td className="px-1 py-2 text-right">
                                <Button variant="ghost" size="sm" onClick={() => removeHdRow(idx)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" data-testid={`hd-remove-row-${idx}`}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-200">
                            <td colSpan="2" className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                              Total ({hdRows.length} row{hdRows.length !== 1 ? 's' : ''})
                            </td>
                            <td className={`px-3 py-2 text-right font-mono font-bold whitespace-nowrap ${hdMode === 'income' ? 'text-emerald-800' : 'text-amber-800'}`}>
                              {hdRows.reduce((s, r) => s + Number(r.amount || r.deposit_amount || 0), 0)
                                .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={closeHelpdeskDialog} data-testid="hd-close-btn">Cancel</Button>
                    <Button onClick={submitHelpdeskRows} disabled={hdSubmitting || hdRows.length === 0} data-testid="hd-submit-btn">
                      {hdSubmitting ? 'Submitting...' : `Submit ${hdRows.length} Row${hdRows.length !== 1 ? 's' : ''} to Sheet`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          ) : activeTab === 'send-mail' ? (
            <TabsContent value="send-mail" className="mt-6" data-testid="send-mail-panel">
              <div className="bg-white rounded-lg border shadow-sm p-6 max-w-2xl">
                <h2 className="text-lg font-semibold text-slate-900">Send Statements & Invoices via Email</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Bundles all invoices and statement folder files matching the selected remarks into a single email.
                  Uses your Project SMTP from <span className="font-medium">Settings &gt; Email Settings</span>.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sm-to-email">Recipient Email</Label>
                    <Input
                      id="sm-to-email"
                      type="email"
                      placeholder="accountant@example.com"
                      value={smToEmail}
                      onChange={(e) => setSmToEmail(e.target.value)}
                      data-testid="sm-to-email-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sm-remarks">Remarks (Month-Year)</Label>
                    <Select value={smRemarks} onValueChange={setSmRemarks}>
                      <SelectTrigger id="sm-remarks" data-testid="sm-remarks-select">
                        <SelectValue placeholder={smRemarksOptions.length === 0 ? 'No remarks yet — tag invoices/folders first' : 'Select remarks'} />
                      </SelectTrigger>
                      <SelectContent>
                        {smRemarksOptions.map(o => (
                          <SelectItem key={o} value={o}>{formatRemarks(o)} <span className="text-xs text-slate-400 ml-2">({o})</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSendMail}
                    disabled={smSending || !smToEmail || !smRemarks}
                    className="gap-2"
                    data-testid="sm-send-btn"
                  >
                    <Upload className="w-4 h-4 rotate-90" />
                    {smSending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>

                {smLastResult && smLastResult.sent && (
                  <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-md p-4 text-sm">
                    <div className="font-semibold text-emerald-900">Sent successfully to {smLastResult.to}</div>
                    <ul className="mt-2 text-emerald-800 text-xs list-disc list-inside">
                      <li>{smLastResult.invoices_attached} invoice PDF(s) attached</li>
                      <li>{smLastResult.files_attached} statement file(s) attached</li>
                      <li>Subject: Statements & Invoices for {smLastResult.month_label}</li>
                      {smLastResult.cc?.length > 0 && <li>CC: {smLastResult.cc.join(', ')}</li>}
                    </ul>
                    {smLastResult.failures?.length > 0 && (
                      <div className="mt-2 text-amber-800 text-xs">
                        {smLastResult.failures.length} attachment failure(s): {smLastResult.failures.slice(0, 3).join('; ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ) : activeTab === 'statements' ? (
            <TabsContent value="statements" className="mt-6 space-y-4" data-testid="statements-panel">
              {/* Statements toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  {stCurrentFolder ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setStCurrentFolder(null); setStFiles([]); }}
                        className="gap-1 h-8 px-2"
                        data-testid="st-back-btn"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                      <span className="text-slate-400">/</span>
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-900">{stCurrentFolder.name}</span>
                      <span className="text-slate-400 text-xs">({stFiles.length} file{stFiles.length !== 1 ? 's' : ''})</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Organise bank statements into folders — view only</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {stCurrentFolder ? (
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={uploadStFile} data-testid="st-upload-input" disabled={stUploading} />
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${stUploading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        data-testid="st-upload-btn"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {stUploading ? 'Uploading...' : 'Upload File'}
                      </span>
                    </label>
                  ) : (
                    <Button size="sm" onClick={() => setStNewFolderOpen(true)} className="gap-1" data-testid="st-new-folder-btn">
                      <FolderPlus className="w-4 h-4" /> Create Folder
                    </Button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                {!stCurrentFolder ? (
                  // Folder grid
                  stFolders.length === 0 ? (
                    <div className="px-6 py-16 text-center text-slate-500 text-sm">
                      <Folder className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      No folders yet. Create one to start organising statements.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                      {stFolders.map(f => (
                        <div
                          key={f.id}
                          className="group border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm cursor-pointer transition relative bg-white"
                          onClick={() => fetchStFiles(f.id)}
                          data-testid={`st-folder-${f.id}`}
                        >
                          <Folder className="w-8 h-8 text-blue-500" fill="currentColor" fillOpacity="0.1" />
                          <div className="mt-2 font-semibold text-slate-900 truncate" title={f.name}>{f.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {f.file_count || 0} file{f.file_count !== 1 ? 's' : ''}
                          </div>
                          {f.remarks && (
                            <div className="text-[10px] font-mono text-purple-700 bg-purple-50 inline-block px-1.5 py-0.5 rounded mt-1">
                              {formatRemarks(f.remarks)}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setStDeletingFolder(f); }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            data-testid={`st-delete-folder-${f.id}`}
                            title="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Files in folder
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">File</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Size</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stLoading ? (
                          <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                        ) : stFiles.length === 0 ? (
                          <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500">
                            <FileIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            No files in this folder. Click &ldquo;Upload File&rdquo; to add one.
                          </td></tr>
                        ) : (
                          stFiles.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50" data-testid={`st-file-${f.id}`}>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <FileIcon className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-900">{f.filename}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-slate-600 text-xs">{formatBytes(f.size)}</td>
                              <td className="px-6 py-3 text-slate-600 text-xs">
                                {f.uploaded_at ? new Date(f.uploaded_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => viewStFile(f)} className="text-blue-600 hover:text-blue-700 h-7 w-7 p-0" title="View" data-testid={`st-view-file-${f.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setStDeletingFile(f)} className="text-red-600 hover:text-red-700 h-7 w-7 p-0" title="Delete" data-testid={`st-delete-file-${f.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          ) : (
          <TabsContent value={activeTab} className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by invoice no. or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="invoices-search-input"
                />
              </div>

              {/* Bulk action bar — visible whenever any row is selected */}
              {(() => {
                const visibleIds = filtered.map(i => i.id);
                const selectedInTab = visibleIds.filter(id => selectedIds.has(id));
                if (selectedInTab.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="bulk-action-bar">
                    <span className="text-sm font-medium text-red-900" data-testid="bulk-selected-count">
                      {selectedInTab.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      className="h-8"
                      data-testid="bulk-clear-btn"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      className="h-8 bg-red-600 hover:bg-red-700 text-white gap-1"
                      data-testid="bulk-delete-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Selected
                    </Button>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="invoices-table">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="pl-6 pr-2 py-3 w-10">
                        <Checkbox
                          checked={filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))}
                          onCheckedChange={() => toggleSelectAll(filtered.map(i => i.id))}
                          aria-label="Select all"
                          data-testid="select-all-checkbox"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billed To</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading && invoices.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                        {searchTerm ? 'No invoices found' : 'No invoices yet'}
                      </td></tr>
                    ) : (
                      filtered.map(inv => {
                        const client = clients.find(c => c.id === inv.client_id);
                        const itemSub = (inv.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.amount || 0), 0);
                        const tax = (inv.cgst_amount || 0) + (inv.sgst_amount || 0) + (inv.igst_amount || 0);
                        const totalShown = itemSub + tax - (inv.discount || 0);
                        const curr = (inv.items || []).find(it => it.currency)?.currency || '';
                        const isSelected = selectedIds.has(inv.id);
                        return (
                          <tr key={inv.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-blue-50/40' : ''}`} data-testid={`invoice-row-${inv.id}`}>
                            <td className="pl-6 pr-2 py-4">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectOne(inv.id)}
                                aria-label={`Select ${inv.invoice_number}`}
                                data-testid={`select-invoice-${inv.id}`}
                              />
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-900">{inv.invoice_number}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">{client?.name || '-'}</td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                              {curr} {totalShown.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                inv.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>{inv.status || 'draft'}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => downloadPdf(inv)} className="text-emerald-600 hover:text-emerald-700" data-testid={`pdf-invoice-${inv.id}`}>
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(inv)} className="text-blue-600 hover:text-blue-700" data-testid={`edit-invoice-${inv.id}`}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setDeletingInvoice(inv); setIsDeleteDialogOpen(true); }} className="text-red-600 hover:text-red-700" data-testid={`delete-invoice-${inv.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          )}
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'} — <span className="font-mono text-blue-700">{nextNumber}</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Type</Label>
                    <Select value={formData.type} onValueChange={(v) => { setFormData({ ...formData, type: v }); if (!editingInvoice) fetchNextNumber(v, formData.invoice_date); }} disabled={!!editingInvoice}>
                      <SelectTrigger data-testid="invoice-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="gst">GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Date</Label>
                    <Input type="date" value={formData.invoice_date} onChange={(e) => { setFormData({ ...formData, invoice_date: e.target.value }); if (!editingInvoice) fetchNextNumber(formData.type, e.target.value); }} data-testid="invoice-date-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Country of Origin</Label>
                    <Input value={formData.country_of_origin} onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })} data-testid="country-of-origin-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger data-testid="invoice-status-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Billed By (Bank)</Label>
                    <Select value={formData.bank_id} onValueChange={(v) => setFormData({ ...formData, bank_id: v })}>
                      <SelectTrigger data-testid="bank-select"><SelectValue placeholder="Select bank..." /></SelectTrigger>
                      <SelectContent>
                        {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billed To (Client)</Label>
                    <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                      <SelectTrigger data-testid="client-select"><SelectValue placeholder="Select client..." /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="add-item-btn">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.items.map((it, idx) => (
                      <div key={idx} className="border rounded-md p-3 bg-slate-50 space-y-2" data-testid={`item-row-${idx}`}>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-xs">Item</Label>
                            <Input placeholder="Item name" value={it.item} onChange={(e) => updateItem(idx, 'item', e.target.value)} />
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <Label className="text-xs">SAC</Label>
                            <Input placeholder="SAC code" value={it.sac} onChange={(e) => updateItem(idx, 'sac', e.target.value)} />
                          </div>
                          <div className="col-span-3 md:col-span-1">
                            <Label className="text-xs">Qty</Label>
                            <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <Label className="text-xs">Rate</Label>
                            <Input type="number" step="0.01" value={it.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} />
                          </div>
                          <div className="col-span-6 md:col-span-2">
                            <Label className="text-xs">Currency</Label>
                            <Input placeholder="USD" value={it.currency} onChange={(e) => updateItem(idx, 'currency', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-end">
                          <div className={isGst ? 'col-span-9 md:col-span-9' : 'col-span-11 md:col-span-11'}>
                            <Label className="text-xs">Description</Label>
                            <Input placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                          </div>
                          {isGst && (
                            <div className="col-span-2">
                              <Label className="text-xs">Tax %</Label>
                              <Input type="number" step="0.01" value={it.tax_percent} onChange={(e) => updateItem(idx, 'tax_percent', e.target.value)} />
                            </div>
                          )}
                          <div className="col-span-1 flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-600">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                          Line Total: <span className="font-semibold text-slate-900">{it.currency} {((parseFloat(it.quantity || 0)) * (parseFloat(it.amount || 0))).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {isGst && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-3">
                    <div className="space-y-2">
                      <Label>Tax Mode</Label>
                      <Select value={formData.tax_mode} onValueChange={(v) => setFormData({ ...formData, tax_mode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cgst_sgst">CGST + SGST (Intra-state)</SelectItem>
                          <SelectItem value="igst">IGST (Inter-state)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>CGST Amount (override)</Label>
                      <Input type="number" step="0.01" value={formData.cgst_amount} onChange={(e) => setFormData({ ...formData, cgst_amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>SGST Amount (override)</Label>
                      <Input type="number" step="0.01" value={formData.sgst_amount} onChange={(e) => setFormData({ ...formData, sgst_amount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>IGST Amount (override)</Label>
                      <Input type="number" step="0.01" value={formData.igst_amount} onChange={(e) => setFormData({ ...formData, igst_amount: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input placeholder="Optional notes / payment terms" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input type="number" step="0.01" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 border rounded-lg p-4 ml-auto md:w-1/2 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{currency} {subtotal.toFixed(2)}</span></div>
                  {isGst && cgst > 0 && <div className="flex justify-between"><span>CGST</span><span>{currency} {cgst.toFixed(2)}</span></div>}
                  {isGst && sgst > 0 && <div className="flex justify-between"><span>SGST</span><span>{currency} {sgst.toFixed(2)}</span></div>}
                  {isGst && igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{currency} {igst.toFixed(2)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>- {currency} {discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between border-t pt-2 mt-2 text-base font-bold text-slate-900"><span>Grand Total</span><span>{currency} {grandTotal.toFixed(2)}</span></div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingInvoice(null); }}>Cancel</Button>
                <Button type="submit" disabled={loading} data-testid="save-invoice-btn">
                  {loading ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deletingInvoice?.invoice_number}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingInvoice(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent data-testid="bulk-delete-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} Invoice{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected invoices. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
                data-testid="bulk-delete-confirm-btn"
              >
                {loading ? 'Deleting...' : `Delete ${selectedIds.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Statements: create folder dialog */}
        <Dialog open={stNewFolderOpen} onOpenChange={setStNewFolderOpen}>
          <DialogContent data-testid="st-new-folder-dialog">
            <DialogHeader>
              <DialogTitle>Create Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="st-folder-name">Folder name</Label>
                <Input
                  id="st-folder-name"
                  placeholder="e.g. May 2026 ICICI"
                  value={stNewFolderName}
                  onChange={(e) => setStNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createStFolder(); }}
                  autoFocus
                  data-testid="st-new-folder-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks (Month & Year)</Label>
                <div className="flex items-center gap-2">
                  <Select value={stNewFolderMonth} onValueChange={setStNewFolderMonth}>
                    <SelectTrigger className="flex-1" data-testid="st-folder-month"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={stNewFolderYear} onValueChange={setStNewFolderYear}>
                    <SelectTrigger className="w-28" data-testid="st-folder-year"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">Used by Send Mail to bundle statements + invoices.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setStNewFolderOpen(false); setStNewFolderName(''); }}>Cancel</Button>
              <Button onClick={createStFolder} data-testid="st-new-folder-save-btn">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Statements: delete folder confirm */}
        <AlertDialog open={!!stDeletingFolder} onOpenChange={(o) => { if (!o) setStDeletingFolder(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete folder &ldquo;{stDeletingFolder?.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                The folder must be empty. If it contains files, please delete the files first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteStFolder} className="bg-red-600 hover:bg-red-700" data-testid="st-confirm-delete-folder-btn">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Statements: delete file confirm */}
        <AlertDialog open={!!stDeletingFile} onOpenChange={(o) => { if (!o) setStDeletingFile(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete file &ldquo;{stDeletingFile?.filename}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the file. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteStFile} className="bg-red-600 hover:bg-red-700" data-testid="st-confirm-delete-file-btn">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bank Statement Preview Dialog */}
        <Dialog open={stmtDialogOpen} onOpenChange={(o) => { if (!o) closeStmtDialog(); }}>
          <DialogContent className="lg:!max-w-6xl" data-testid="stmt-preview-dialog">
            <DialogHeader>
              <DialogTitle>
                Auto-Create Invoices from Bank Statement
                {stmtFileName && <span className="block text-xs text-slate-500 font-normal mt-1 truncate">{stmtFileName}</span>}
              </DialogTitle>
            </DialogHeader>

            {/* Remarks (Month-Year) for these invoices */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="text-sm text-slate-700 font-semibold whitespace-nowrap">Remarks</div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-xs text-slate-600">Month</Label>
                <Select value={stmtRemarksMonth} onValueChange={setStmtRemarksMonth}>
                  <SelectTrigger className="h-8 w-36" data-testid="stmt-remarks-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="text-xs text-slate-600">Year</Label>
                <Select value={stmtRemarksYear} onValueChange={setStmtRemarksYear}>
                  <SelectTrigger className="h-8 w-24" data-testid="stmt-remarks-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-slate-500">
                Saved on every invoice as <span className="font-mono">{stmtRemarksYear}-{stmtRemarksMonth}</span> — used by Send Mail.
              </div>
            </div>

            {/* Bulk-set toolbar */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="text-sm text-slate-700">
                <span className="font-semibold">Apply to all rows:</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-xs whitespace-nowrap">Billed By (Bank)</Label>
                <Select value={stmtBulkBankId} onValueChange={applyBankToAll}>
                  <SelectTrigger className="h-8 max-w-xs" data-testid="stmt-bulk-bank-select">
                    <SelectValue placeholder="Select bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-slate-500">
                Defaults: Type = Export · Currency = USD · SAC = 998314 · Invoice Date = Txn Date − 1
              </div>
            </div>

            <div className="py-2 max-h-[55vh] overflow-y-auto">
              {stmtRows.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No remaining rows.
                </div>
              ) : (
                <table className="w-full text-sm border border-slate-200 rounded">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase w-10">#</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Txn Date</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Invoice Date</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">INR</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap" title="INR -> USD rate on txn date">Rate</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">USD</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Item</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Billed To (Client)</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Remarks</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stmtRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 align-top" data-testid={`stmt-row-${idx}`}>
                        <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-2 font-medium text-slate-900 whitespace-nowrap">
                          {r.transaction_date
                            ? new Date(r.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="date"
                            value={r.invoice_date || ''}
                            onChange={(e) => updateStmtRow(idx, 'invoice_date', e.target.value)}
                            className="h-8 text-xs"
                            data-testid={`stmt-invoice-date-${idx}`}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-slate-700 whitespace-nowrap text-xs">
                          {Number(r.inr_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap text-xs" title="INR to USD on txn date">
                          {r.fx_rate ? Number(r.fx_rate).toFixed(5) : '—'}
                        </td>
                        <td className="px-2 py-2 w-28">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={r.override_usd || ''}
                            onChange={(e) => updateStmtRow(idx, 'override_usd', e.target.value)}
                            className={`h-8 text-xs text-right font-mono font-semibold ${r.fx_rate ? 'text-emerald-700' : 'text-amber-700'}`}
                            data-testid={`stmt-usd-${idx}`}
                            placeholder={r.fx_rate ? '' : 'enter USD'}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[160px]">
                          <Select value={r.item_name} onValueChange={(v) => updateStmtRow(idx, 'item_name', v)}>
                            <SelectTrigger className="h-8 text-xs" data-testid={`stmt-item-${idx}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATIC_ITEMS.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 min-w-[150px]">
                          <Select value={r.client_id} onValueChange={(v) => updateStmtRow(idx, 'client_id', v)}>
                            <SelectTrigger className="h-8 text-xs" data-testid={`stmt-client-${idx}`}>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 text-slate-600 text-[11px] leading-snug max-w-[200px] break-words" title={r.transaction_remarks || ''}>
                          {(r.transaction_remarks || '-').slice(0, 70)}
                          {(r.transaction_remarks || '').length > 70 ? '…' : ''}
                        </td>
                        <td className="px-1 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStmtRow(idx)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            title="Remove this row (won't be invoiced)"
                            data-testid={`stmt-remove-row-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan="3" className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                        Total ({stmtRows.length} row{stmtRows.length !== 1 ? 's' : ''})
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-xs">
                        {stmtRows.reduce((s, r) => s + Number(r.inr_amount || 0), 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap text-xs">
                        {stmtRows.reduce((s, r) => s + Number(r.override_usd || 0), 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan="4"></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {stmtCreatedNumbers.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-900">
                <span className="font-semibold">Created invoices:</span>{' '}
                {stmtCreatedNumbers.join(', ')}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeStmtDialog} data-testid="stmt-close-btn">Cancel</Button>
              <Button
                onClick={handleCreateStmtInvoices}
                disabled={stmtCreating || stmtRows.length === 0}
                data-testid="stmt-create-invoices-btn"
              >
                {stmtCreating
                  ? `Creating... (${stmtCreatedNumbers.length}/${stmtRows.length})`
                  : `Create ${stmtRows.length} Invoice${stmtRows.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
