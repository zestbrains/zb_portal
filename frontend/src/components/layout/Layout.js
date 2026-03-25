import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Building2, FolderKanban, Clock, Calendar, CheckSquare, History, UserCog, ChevronDown, ChevronRight, PartyPopper, Menu, X, CalendarClock, Mail, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [leaveMenuOpen, setLeaveMenuOpen] = useState(
    location.pathname.includes('leave')
  );
  const [workingHoursMenuOpen, setWorkingHoursMenuOpen] = useState(
    location.pathname.includes('working-hours') || location.pathname.includes('weekend-approvals')
  );
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(
    location.pathname.includes('admin-management') || location.pathname.includes('email-settings')
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const getMenuItems = () => {
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/departments', label: 'Departments', icon: Building2 },
        { path: '/admin/employees', label: 'Employees', icon: Users },
        { path: '/admin/projects', label: 'Projects', icon: FolderKanban },
        { 
          type: 'submenu',
          id: 'working-hours',
          label: 'Working Hours',
          icon: Clock,
          children: [
            { path: '/admin/working-hours', label: 'All Entries' },
            { path: '/admin/weekend-approvals', label: 'Weekend/Holiday Approvals' },
          ]
        },
        { 
          type: 'submenu',
          id: 'leave',
          label: 'Leave',
          icon: Calendar,
          children: [
            { path: '/admin/leave-tracker', label: 'Leave Tracker' },
            { path: '/admin/leave-approval', label: 'Leave Approval' },
            { path: '/admin/leave-history', label: 'Leave History' },
          ]
        },
        { path: '/admin/holidays', label: 'Holidays', icon: PartyPopper },
        { 
          type: 'submenu',
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          children: [
            { path: '/admin/admin-management', label: 'Admin Management' },
            { path: '/admin/email-settings', label: 'Email Settings' },
          ]
        },
      ];
    } else if (user.role === 'hr') {
      return [
        { path: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/hr/employees', label: 'Employees', icon: Users },
        { 
          type: 'submenu',
          id: 'working-hours',
          label: 'Working Hours',
          icon: Clock,
          children: [
            { path: '/hr/working-hours', label: 'All Entries' },
            { path: '/hr/weekend-approvals', label: 'Weekend/Holiday Approvals' },
          ]
        },
        { 
          type: 'submenu',
          id: 'leave',
          label: 'Leave',
          icon: Calendar,
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
      ];
    }
  };

  const menuItems = getMenuItems();

  const isSubMenuActive = (children) => {
    return children?.some(child => location.pathname === child.path);
  };

  const getSubMenuState = (item) => {
    if (item.id === 'leave') return leaveMenuOpen;
    if (item.id === 'working-hours') return workingHoursMenuOpen;
    if (item.id === 'settings') return settingsMenuOpen;
    return false;
  };

  const toggleSubMenu = (item) => {
    if (item.id === 'leave') setLeaveMenuOpen(!leaveMenuOpen);
    if (item.id === 'working-hours') setWorkingHoursMenuOpen(!workingHoursMenuOpen);
    if (item.id === 'settings') setSettingsMenuOpen(!settingsMenuOpen);
  };

  const SidebarContent = ({ onItemClick }) => (
    <>
      <div className="p-4 md:p-6 border-b border-white/20 flex flex-col items-center">
        <img src="https://customer-assets.emergentagent.com/job_zesttrack/artifacts/qcccfvpf_logo1.png" alt="Zestbrains" className="h-10 md:h-12 bg-white rounded p-1" />
        <p className="text-xs md:text-sm text-indigo-200 mt-2 md:mt-3" data-testid="user-role">{user.role.toUpperCase()}</p>
      </div>
      
      <nav className="flex-1 p-3 md:p-4 sidebar-nav overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.type === 'submenu') {
            const Icon = item.icon;
            const isSubActive = isSubMenuActive(item.children);
            const isOpen = getSubMenuState(item);
            
            return (
              <div key={index} className="mb-1 md:mb-2">
                <button
                  onClick={() => toggleSubMenu(item)}
                  className={`w-full flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-sm md:text-base ${isSubActive ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <Icon size={18} className="md:w-5 md:h-5" />
                    <span>{item.label}</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {isOpen && (
                  <div className="ml-3 md:ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onItemClick}
                          data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm ${isActive ? 'bg-white/20 font-semibold' : 'hover:bg-white/10 opacity-80'}`}
                        >
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/50"></span>
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg mb-1 md:mb-2 text-sm md:text-base ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="md:w-5 md:h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-3 md:p-4 border-t border-white/20">
        <div className="mb-2 md:mb-3 px-3 md:px-4">
          <p className="text-xs md:text-sm opacity-80">Logged in as:</p>
          <p className="font-semibold text-sm md:text-base truncate" data-testid="user-name">{user.username}</p>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full text-white border-white/30 hover:bg-white/10 text-sm md:text-base py-2 md:py-2.5"
          data-testid="logout-button"
        >
          <LogOut size={16} className="mr-2 md:w-[18px] md:h-[18px]" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex items-center justify-between px-4 z-50 md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-indigo-600 to-purple-700 text-white border-0">
              <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <img src="https://customer-assets.emergentagent.com/job_zesttrack/artifacts/qcccfvpf_logo1.png" alt="Zestbrains" className="h-8 bg-white rounded p-0.5" />
        </div>
        <span className="text-sm font-medium">{user.role.toUpperCase()}</span>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-indigo-600 to-purple-700 text-white flex-col fixed h-full">
        <SidebarContent onItemClick={() => {}} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 md:ml-64">
        {children}
      </main>
    </div>
  );
}
