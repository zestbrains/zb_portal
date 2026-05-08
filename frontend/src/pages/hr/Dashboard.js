// HR Dashboard uses the same analytics as Admin Dashboard
import AdminDashboard from '../admin/Dashboard';

export default function HRDashboard(props) {
  return <AdminDashboard {...props} />;
}
