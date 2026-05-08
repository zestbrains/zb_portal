import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Plus, Trash2, PartyPopper } from 'lucide-react';

export default function Holidays({ user, onLogout }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: ''
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await api.get('/holidays');
      setHolidays(response.data);
    } catch (error) {
      console.error('Error fetching holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/holidays', formData);
      toast.success('Holiday added successfully');
      setFormData({ name: '', date: '', description: '' });
      setAddDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adding holiday');
    }
  };

  const handleDelete = async (holidayId, holidayName) => {
    if (!window.confirm(`Are you sure you want to delete "${holidayName}"?`)) {
      return;
    }
    try {
      await api.delete(`/holidays/${holidayId}`);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (error) {
      toast.error('Error deleting holiday');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateStr);
    return holidayDate >= today;
  };

  const upcomingHolidays = holidays.filter(h => isUpcoming(h.date));

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 md:p-8 lg:p-10" data-testid="holidays-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Festival Holidays</h1>
            <p className="text-sm text-slate-500 mt-1">Manage company holidays and festivals</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-xs" size="sm" data-testid="add-holiday-btn">
            <Plus size={14} className="mr-1" />
            Add Holiday
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600"><PartyPopper size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming</p><p className="text-2xl font-bold text-amber-600">{upcomingHolidays.length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-700"><Calendar size={20} /></div>
              <div><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Holidays</p><p className="text-2xl font-bold text-slate-900">{holidays.length}</p></div>
            </div>
          </div>
        </div>

        {/* Holidays Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">All Holidays</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : holidays.length === 0 ? (
            <div className="p-12 text-center">
              <PartyPopper size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No holidays added yet</p>
              <p className="text-xs text-slate-300 mt-1">Click "Add Holiday" to add festival holidays</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Holiday Name</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Date</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Description</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.sort((a, b) => new Date(a.date) - new Date(b.date)).map((holiday) => {
                    const upcoming = isUpcoming(holiday.date);
                    return (
                      <tr key={holiday.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-sm text-slate-800">{holiday.name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{formatDate(holiday.date)}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{holiday.description || '-'}</td>
                        <td className="py-3 px-4">
                          {upcoming ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-100 text-amber-700 border-amber-200">
                              Upcoming
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-500 border-slate-200">
                              Past
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(holiday.id, holiday.name)}
                            className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50"
                            data-testid={`delete-holiday-${holiday.id}`}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Holiday Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <PartyPopper size={20} />
                Add Festival Holiday
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Holiday Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Diwali, Holi, Christmas"
                  required
                  data-testid="holiday-name-input"
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="holiday-date-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Festival of lights"
                  data-testid="holiday-description-input"
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" data-testid="submit-holiday-btn">
                Add Holiday
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
