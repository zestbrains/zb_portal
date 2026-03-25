import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
  const pastHolidays = holidays.filter(h => !isUpcoming(h.date));

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="holidays-page">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Festival Holidays</h1>
            <p className="text-gray-600">Manage company holidays and festivals</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="add-holiday-btn">
            <Plus size={18} className="mr-2" />
            Add Holiday
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <PartyPopper size={24} />
                <div>
                  <p className="text-sm opacity-80">Upcoming Holidays</p>
                  <p className="text-2xl font-bold">{upcomingHolidays.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar size={24} />
                <div>
                  <p className="text-sm opacity-80">Total Holidays</p>
                  <p className="text-2xl font-bold">{holidays.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holidays List */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              All Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : holidays.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <PartyPopper size={48} className="mx-auto mb-4 opacity-50" />
                <p>No holidays added yet</p>
                <p className="text-sm">Click "Add Holiday" to add festival holidays</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Holiday Name</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.sort((a, b) => new Date(a.date) - new Date(b.date)).map((holiday) => {
                      const upcoming = isUpcoming(holiday.date);
                      return (
                        <tr key={holiday.id} className={upcoming ? 'bg-purple-50' : ''}>
                          <td className="font-semibold">{holiday.name}</td>
                          <td>{formatDate(holiday.date)}</td>
                          <td className="text-gray-600">{holiday.description || '-'}</td>
                          <td>
                            {upcoming ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                                Upcoming
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                Past
                              </span>
                            )}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(holiday.id, holiday.name)}
                              data-testid={`delete-holiday-${holiday.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Holiday Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
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
              <Button type="submit" className="w-full" data-testid="submit-holiday-btn">
                Add Holiday
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
