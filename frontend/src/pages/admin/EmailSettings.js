import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Mail, Send, Save, Settings, Eye, EyeOff } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { api } from '../../utils/api';
import { toast } from 'sonner';

export default function EmailSettings({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [config, setConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_email: 'hr.zestbrains@gmail.com',
    smtp_password: '',
    enable_ssl: true,
    cc_emails: '',
    is_enabled: false
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/email-config');
      setConfig(response.data);
    } catch (error) {
      toast.error('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/email-config', config);
      toast.success('Email configuration saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.smtp_password || config.smtp_password === '••••••••') {
      toast.error('Please enter SMTP password first');
      return;
    }
    
    // Save config first, then test
    setTesting(true);
    try {
      await api.put('/email-config', config);
      const response = await api.post('/email-config/test');
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="p-8 text-center">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-4 sm:p-6 lg:p-8" data-testid="email-settings-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1">Email Configuration</h1>
          <p className="text-sm sm:text-base text-gray-600">Configure SMTP settings for leave approval notifications</p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} />
                SMTP Settings
              </CardTitle>
              <CardDescription>
                Configure your email server settings. For Gmail, use an App Password instead of your regular password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">Enable Email Notifications</Label>
                  <p className="text-sm text-gray-500">Send email when leave is approved/rejected</p>
                </div>
                <Switch
                  checked={config.is_enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
                  data-testid="email-toggle"
                />
              </div>

              {/* SMTP Host */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={config.smtp_host}
                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    data-testid="smtp-host"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={config.smtp_port}
                    onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    data-testid="smtp-port"
                  />
                </div>
              </div>

              {/* SMTP Email */}
              <div>
                <Label htmlFor="smtp_email">Sender Email</Label>
                <Input
                  id="smtp_email"
                  type="email"
                  value={config.smtp_email}
                  onChange={(e) => setConfig({ ...config, smtp_email: e.target.value })}
                  placeholder="hr.zestbrains@gmail.com"
                  data-testid="smtp-email"
                />
                <p className="text-xs text-gray-500 mt-1">This email will appear as the sender</p>
              </div>

              {/* SMTP Password */}
              <div>
                <Label htmlFor="smtp_password">SMTP Password / App Password</Label>
                <div className="relative">
                  <Input
                    id="smtp_password"
                    type={showPassword ? "text" : "password"}
                    value={config.smtp_password}
                    onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                    placeholder="Enter app password"
                    className="pr-10"
                    data-testid="smtp-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  For Gmail, create an App Password at: 
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1">
                    Google App Passwords
                  </a>
                </p>
              </div>

              {/* SSL Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable TLS/SSL</Label>
                  <p className="text-xs text-gray-500">Required for most email providers</p>
                </div>
                <Switch
                  checked={config.enable_ssl}
                  onCheckedChange={(checked) => setConfig({ ...config, enable_ssl: checked })}
                  data-testid="ssl-toggle"
                />
              </div>

              {/* CC Emails */}
              <div>
                <Label htmlFor="cc_emails">CC Email List</Label>
                <Input
                  id="cc_emails"
                  value={config.cc_emails}
                  onChange={(e) => setConfig({ ...config, cc_emails: e.target.value })}
                  placeholder="admin@company.com, hr2@company.com"
                  data-testid="cc-emails"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated email addresses to CC on all notifications</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="save-config">
                  <Save size={16} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button 
                  onClick={handleTest} 
                  disabled={testing || !config.is_enabled} 
                  variant="outline" 
                  className="flex-1"
                  data-testid="test-email"
                >
                  <Send size={16} className="mr-2" />
                  {testing ? 'Sending...' : 'Send Test Email'}
                </Button>
              </div>

              {!config.is_enabled && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <strong>Note:</strong> Email notifications are currently disabled. Enable the toggle above to start sending emails.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail size={18} />
                When are emails sent?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>Email notifications are sent when:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Admin/HR <strong>approves</strong> a leave application</li>
                <li>Admin/HR <strong>rejects</strong> a leave application</li>
                <li>Admin/HR <strong>partially approves</strong> (some dates approved, some rejected)</li>
              </ul>
              <p className="mt-3">The email includes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Employee name and applied dates</li>
                <li>Approved dates with leave type</li>
                <li>Rejected dates with reason</li>
                <li>Approved by (Admin/HR name)</li>
                <li>Timestamp in IST</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
