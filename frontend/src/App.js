import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminDepartments from './pages/admin/Departments';
import AdminEmployees from './pages/admin/Employees';
import AdminProjects from './pages/admin/Projects';
import AdminWorkingHours from './pages/admin/WorkingHours';
import AdminWeekendApprovals from './pages/admin/WeekendApprovals';
import AdminLeaveTracker from './pages/admin/LeaveTracker';
import AdminLeaveApproval from './pages/admin/LeaveApproval';
import AdminLeaveHistory from './pages/admin/LeaveHistory';
import AdminManagement from './pages/admin/AdminManagement';
import AdminHolidays from './pages/admin/Holidays';
import AdminEmailSettings from './pages/admin/EmailSettings';
import AdminBanks from './pages/admin/Banks';
import AdminClients from './pages/admin/Clients';
import AdminInvoices from './pages/admin/Invoices';
import AdminAttendance from './pages/admin/Attendance';
import AdminSalary from './pages/admin/Salary';
import AdminLateMarks from './pages/admin/LateMarks';
import AdminEmployeeDetail from './pages/admin/EmployeeDetail';
import HRDashboard from './pages/hr/Dashboard';
import HREmployees from './pages/hr/Employees';
import HRWorkingHours from './pages/hr/WorkingHours';
import HRWeekendApprovals from './pages/admin/WeekendApprovals'; // Reuse admin component
import HRLeaveTracker from './pages/hr/LeaveTracker';
import HRLeaveApproval from './pages/hr/LeaveApproval';
import HRLeaveHistory from './pages/hr/LeaveHistory';
import HRHolidays from './pages/admin/Holidays'; // Reuse admin component
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeProjects from './pages/employee/Projects';
import EmployeeWorkEntry from './pages/employee/WorkEntry';
import EmployeeLeaveApply from './pages/employee/LeaveApply';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeaveTracker from './pages/employee/LeaveTracker';
import { Toaster } from './components/ui/sonner';
import { api } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session with server on app load - SECURITY FIX
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Verify token and get actual user data from server
        const response = await api.get('/auth/me');
        const serverUser = response.data;
        
        // Use server-verified user data (not localStorage which can be tampered)
        localStorage.setItem('user', JSON.stringify(serverUser));
        setUser(serverUser);
      } catch (error) {
        // Token is invalid or expired - clear session
        console.error('Session validation failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    validateSession();
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role}/dashboard`} />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/departments" element={user?.role === 'admin' ? <AdminDepartments user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/employees" element={user?.role === 'admin' ? <AdminEmployees user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/projects" element={user?.role === 'admin' ? <AdminProjects user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/working-hours" element={user?.role === 'admin' ? <AdminWorkingHours user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/weekend-approvals" element={user?.role === 'admin' ? <AdminWeekendApprovals user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/leave-tracker" element={user?.role === 'admin' ? <AdminLeaveTracker user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/leave-approval" element={user?.role === 'admin' ? <AdminLeaveApproval user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/leave-history" element={user?.role === 'admin' ? <AdminLeaveHistory user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/admin-management" element={user?.role === 'admin' ? <AdminManagement user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/holidays" element={user?.role === 'admin' ? <AdminHolidays user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/email-settings" element={user?.role === 'admin' ? <AdminEmailSettings user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/banks" element={user?.role === 'admin' ? <AdminBanks user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/clients" element={user?.role === 'admin' ? <AdminClients user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/invoices" element={user?.role === 'admin' ? <AdminInvoices user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/attendance" element={user?.role === 'admin' ? <AdminAttendance user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/salary" element={user?.role === 'admin' ? <AdminSalary user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/late-marks" element={user?.role === 'admin' ? <AdminLateMarks user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/admin/employee/:employeeId" element={user?.role === 'admin' ? <AdminEmployeeDetail user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          
          {/* HR Routes */}
          <Route path="/hr/dashboard" element={user?.role === 'hr' ? <HRDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/employees" element={user?.role === 'hr' ? <HREmployees user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/working-hours" element={user?.role === 'hr' ? <HRWorkingHours user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/weekend-approvals" element={user?.role === 'hr' ? <HRWeekendApprovals user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/leave-tracker" element={user?.role === 'hr' ? <HRLeaveTracker user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/leave-approval" element={user?.role === 'hr' ? <HRLeaveApproval user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/leave-history" element={user?.role === 'hr' ? <HRLeaveHistory user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/hr/holidays" element={user?.role === 'hr' ? <AdminHolidays user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          
          {/* Employee Routes */}
          <Route path="/employee/dashboard" element={user?.role === 'employee' ? <EmployeeDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/employee/projects" element={user?.role === 'employee' ? <EmployeeProjects user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/employee/work-entry" element={user?.role === 'employee' ? <EmployeeWorkEntry user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/employee/leave-tracker" element={user?.role === 'employee' ? <EmployeeLeaveTracker user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/employee/leave-apply" element={user?.role === 'employee' ? <EmployeeLeaveApply user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/employee/attendance" element={user?.role === 'employee' ? <EmployeeAttendance user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
