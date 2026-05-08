import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, FolderKanban, Clock, Calendar, ChevronDown, ChevronRight, Menu, Settings, CalendarCheck, PartyPopper, IndianRupee, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(location.pathname.includes('leave'));
  const [workingHoursMenuOpen, setWorkingHoursMenuOpen] = useState(location.pathname.includes('working-hours') || location.pathname.includes('weekend-approvals'));
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(location.pathname.includes('admin-management') || location.pathname.includes('email-settings') || location.pathname.includes('departments') || location.pathname.includes('holidays') || location.pathname.includes('banks'));
  const [salaryMenuOpen, setSalaryMenuOpen] = useState(location.pathname.includes('salary') || location.pathname.includes('late-marks'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getMenuItems = () => {
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/employees', label: 'Employees', icon: Users },
        { path: '/admin/projects', label: 'Projects', icon: FolderKanban },
        {
          type: 'submenu', id: 'working-hours', label: 'Working Hours', icon: Clock,
          children: [
            { path: '/admin/working-hours', label: 'All Entries' },
            { path: '/admin/weekend-approvals', label: 'Weekend/Holiday Approvals' },
          ]
        },
        {
          type: 'submenu', id: 'leave', label: 'Leave', icon: Calendar,
          children: [
            { path: '/admin/leave-tracker', label: 'Leave Tracker' },
            { path: '/admin/leave-approval', label: 'Leave Approval' },
            { path: '/admin/leave-history', label: 'Leave History' },
          ]
        },
        { path: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
        {
          type: 'submenu', id: 'salary', label: 'Salary', icon: IndianRupee,
          children: [
            { path: '/admin/salary', label: 'Salary Overview' },
            { path: '/admin/late-marks', label: 'Late Marks' },
          ]
        },
        {
          type: 'submenu', id: 'settings', label: 'Settings', icon: Settings,
          children: [
            { path: '/admin/admin-management', label: 'Admin Management' },
            { path: '/admin/departments', label: 'Departments' },
            { path: '/admin/holidays', label: 'Holidays' },
            { path: '/admin/email-settings', label: 'Email Settings' },
            { path: '/admin/banks', label: 'Banks' },
          ]
        },
      ];
    } else if (user.role === 'hr') {
      return [
        { path: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/hr/employees', label: 'Employees', icon: Users },
        {
          type: 'submenu', id: 'working-hours', label: 'Working Hours', icon: Clock,
          children: [
            { path: '/hr/working-hours', label: 'All Entries' },
            { path: '/hr/weekend-approvals', label: 'Weekend/Holiday Approvals' },
          ]
        },
        {
          type: 'submenu', id: 'leave', label: 'Leave', icon: Calendar,
          children: [
            { path: '/hr/leave-tracker', label: 'Leave Tracker' },
            { path: '/hr/leave-approval', label: 'Leave Approval' },
            { path: '/hr/leave-history', label: 'Leave History' },
          ]
        },
        { path: '/hr/holidays', label: 'Holidays', icon: PartyPopper },
      ];
    } else {
      return [
        { path: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/employee/projects', label: 'Projects', icon: FolderKanban },
        { path: '/employee/work-entry', label: 'Working Hours', icon: Clock },
        { path: '/employee/leave-tracker', label: 'Leave Tracker', icon: Calendar },
        { path: '/employee/leave-apply', label: 'Apply Leave', icon: Calendar },
        { path: '/employee/attendance', label: 'My Attendance', icon: CalendarCheck },
      ];
    }
  };

  const menuItems = getMenuItems();
  const isSubMenuActive = (children) => children?.some(child => location.pathname === child.path);
  const getSubMenuState = (item) => {
    if (item.id === 'leave') return leaveMenuOpen;
    if (item.id === 'working-hours') return workingHoursMenuOpen;
    if (item.id === 'settings') return settingsMenuOpen;
    if (item.id === 'salary') return salaryMenuOpen;
    return false;
  };
  const toggleSubMenu = (item) => {
    if (item.id === 'leave') setLeaveMenuOpen(!leaveMenuOpen);
    if (item.id === 'working-hours') setWorkingHoursMenuOpen(!workingHoursMenuOpen);
    if (item.id === 'settings') setSettingsMenuOpen(!settingsMenuOpen);
    if (item.id === 'salary') setSalaryMenuOpen(!salaryMenuOpen);
  };

  const NavLink = ({ item, onItemClick }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={onItemClick}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SubMenu = ({ item, onItemClick }) => {
    const Icon = item.icon;
    const isSubActive = isSubMenuActive(item.children);
    const isOpen = getSubMenuState(item);
    return (
      <div className="mb-0.5">
        <button
          onClick={() => toggleSubMenu(item)}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isSubActive ? 'text-slate-900 bg-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={18} strokeWidth={1.5} />
            <span>{item.label}</span>
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {isOpen && (
          <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-slate-200 pl-3">
            {item.children.map((child) => {
              const childActive = location.pathname === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={onItemClick}
                  data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    childActive ? 'text-slate-900 font-semibold bg-slate-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = ({ onItemClick }) => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200">
        <img src="https://customer-assets.emergentagent.com/job_zesttrack/artifacts/qcccfvpf_logo1.png" alt="Zestbrains" className="h-9" />
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-900 text-white" data-testid="user-role">
            {user.role}
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        {menuItems.map((item, index) =>
          item.type === 'submenu'
            ? <SubMenu key={index} item={item} onItemClick={onItemClick} />
            : <NavLink key={item.path} item={item} onItemClick={onItemClick} />
        )}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <div className="mb-3 px-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Logged in as</p>
          <p className="font-semibold text-sm text-slate-800 truncate mt-0.5" data-testid="user-name">{user.username}</p>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-sm"
          data-testid="logout-button"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 z-50 md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-700 hover:bg-slate-100" data-testid="mobile-menu-btn">
                <Menu size={22} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-white border-r border-slate-200">
              <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <img src="https://customer-assets.emergentagent.com/job_zesttrack/artifacts/qcccfvpf_logo1.png" alt="Zestbrains" className="h-7" />
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-900 text-white">
          {user.role}
        </span>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-30" data-testid="nav-sidebar">
        <SidebarContent onItemClick={() => {}} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 md:ml-64">
        {children}
      </main>
    </div>
  );
}
