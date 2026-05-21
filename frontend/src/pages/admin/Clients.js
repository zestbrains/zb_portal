import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const emptyForm = {
  name: '', address: '', country: '', city: '',
  pancard: '', gst: '', email: '', phone: '',
  extra_params: [],
};

export default function Clients({ user, onLogout }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch clients');
      setClients(await res.json());
    } catch (e) {
      toast.error('Failed to load clients');
    } finally { setLoading(false); }
  };

  const filtered = clients.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.country || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateExtra = (idx, key, value) => {
    const next = [...formData.extra_params];
    next[idx] = { ...next[idx], [key]: value };
    setFormData({ ...formData, extra_params: next });
  };

  const addExtra = () => setFormData({ ...formData, extra_params: [...formData.extra_params, { key: '', value: '' }] });
  const removeExtra = (idx) => setFormData({ ...formData, extra_params: formData.extra_params.filter((_, i) => i !== idx) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Client name is required'); return; }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = editingClient ? `${API_URL}/api/clients/${editingClient.id}` : `${API_URL}/api/clients`;
      const res = await fetch(url, {
        method: editingClient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save client');
      }
      toast.success(editingClient ? 'Client updated' : 'Client created');
      setIsDialogOpen(false);
      setFormData(emptyForm);
      setEditingClient(null);
      fetchClients();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleEdit = (c) => {
    setEditingClient(c);
    setFormData({
      name: c.name || '', address: c.address || '', country: c.country || '', city: c.city || '',
      pancard: c.pancard || '', gst: c.gst || '', email: c.email || '', phone: c.phone || '',
      extra_params: c.extra_params || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/clients/${deletingClient.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to delete client');
      }
      toast.success('Client deleted');
      setIsDeleteDialogOpen(false);
      setDeletingClient(null);
      fetchClients();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6" data-testid="clients-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Clients</h1>
            <p className="text-slate-500 mt-1">Manage your customer master for invoicing</p>
          </div>
          <Button onClick={openAdd} className="gap-2" data-testid="add-client-btn">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>

        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by name, country, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="clients-search-input"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="clients-table">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">GST / PAN</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && clients.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    {searchTerm ? 'No clients found' : 'No clients added yet'}
                  </td></tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50" data-testid={`client-row-${c.id}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.address || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{c.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{c.country || '-'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">
                        {c.gst && <div>GST: {c.gst}</div>}
                        {c.pancard && <div>PAN: {c.pancard}</div>}
                        {!c.gst && !c.pancard && '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-700" data-testid={`edit-client-${c.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setDeletingClient(c); setIsDeleteDialogOpen(true); }} className="text-red-600 hover:text-red-700" data-testid={`delete-client-${c.id}`}>
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
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Client Name *</Label>
                    <Input id="name" data-testid="client-name-input" placeholder="e.g. Acme Corp" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" data-testid="client-address-input" placeholder="Street, building..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" data-testid="client-city-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" data-testid="client-country-input" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pancard">PAN</Label>
                    <Input id="pancard" value={formData.pancard} onChange={(e) => setFormData({ ...formData, pancard: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST</Label>
                    <Input id="gst" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Extra Parameters (Custom Fields)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addExtra} data-testid="add-extra-param-btn">
                      <Plus className="w-3 h-3 mr-1" /> Add Field
                    </Button>
                  </div>
                  {formData.extra_params.length === 0 && (
                    <p className="text-xs text-slate-500">No extra fields. Add custom key/value pairs that will appear on the invoice (e.g. Contact Person, Tax ID).</p>
                  )}
                  {formData.extra_params.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-center" data-testid={`extra-param-row-${idx}`}>
                      <Input placeholder="Field name (e.g. Contact)" value={p.key} onChange={(e) => updateExtra(idx, 'key', e.target.value)} />
                      <Input placeholder="Value" value={p.value} onChange={(e) => updateExtra(idx, 'value', e.target.value)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(idx)} className="text-red-600">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingClient(null); setFormData(emptyForm); }}>Cancel</Button>
                <Button type="submit" disabled={loading} data-testid="save-client-btn">
                  {loading ? 'Saving...' : editingClient ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deletingClient?.name}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingClient(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
