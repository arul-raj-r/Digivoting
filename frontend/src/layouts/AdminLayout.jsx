import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Calendar,
  UserPlus,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Admin Overview', path: '/admin', icon: ShieldAlert },
    { name: 'Voters Directory', path: '/admin/voters', icon: Users },
    { name: 'Elections Center', path: '/admin/elections', icon: Calendar },
    { name: 'Candidates Registry', path: '/admin/candidates', icon: UserPlus },
    { name: 'Results Audits', path: '/admin/results', icon: TrendingUp },
    { name: 'System Audit Logs', path: '/admin/audit', icon: FileSpreadsheet },
    { name: 'Security Monitor', path: '/admin/security', icon: Settings },
  ];

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return [
      { name: 'Admin Portal', path: '/admin' },
      ...paths.slice(1).map((path, idx) => {
        const url = `/admin/${paths.slice(1, idx + 2).join('/')}`;
        const name = path
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return { name, path: url };
      }),
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gov-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-350 shrink-0 border-r border-slate-850">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <Link to="/" className="flex items-center gap-2 font-bold text-white">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <div className="flex flex-col leading-none">
              <span className="tracking-wide">DigiVote Admin</span>
              <span className="text-[10px] text-slate-500 font-normal">Security & Operations</span>
            </div>
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-505 bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Admin Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-8 w-8 rounded bg-amber-550 bg-amber-600/20 flex items-center justify-center font-bold text-amber-500 text-xs">
              AD
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-semibold truncate text-slate-200">Administrator</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-medium text-rose-455 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay and Menu) */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={toggleSidebar} />
          {/* Drawer Menu */}
          <div className="relative flex flex-col w-64 bg-slate-900 text-slate-350 p-4 z-50">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
                <span className="font-bold">Admin Portal</span>
              </div>
              <button onClick={toggleSidebar} className="p-1 rounded-md text-slate-500 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-grow space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t border-slate-805 pt-4 mt-4">
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-800 rounded-lg text-sm font-medium text-rose-455"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Work Area */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-gov-cardDark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-105 dark:hover:bg-slate-800"
              aria-label="Open administration menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center space-x-1 text-xs text-slate-400" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1" />}
                  <Link
                    to={crumb.path}
                    className={`hover:text-slate-650 dark:hover:text-slate-200 font-medium ${
                      idx === breadcrumbs.length - 1 ? 'text-amber-600 dark:text-amber-500 font-semibold' : ''
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Admin Badge */}
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900 select-none">
              Super Admin Mode
            </span>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                aria-label="View security logs"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500"></span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gov-cardDark border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-2 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 font-semibold flex justify-between items-center text-slate-800 dark:text-slate-100">
                    <span>Admin Operations</span>
                    <Link to="/admin/security" onClick={() => setIsNotificationsOpen(false)} className="text-xs text-amber-600 dark:text-amber-550 hover:underline">
                      Security Dashboard
                    </Link>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800/30">
                      <p className="font-semibold text-xs text-rose-600 dark:text-rose-455">Failed Admin Authentication</p>
                      <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-0.5">Attempted admin access from IP: 192.168.1.42 blocked.</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">System Checklist Cleared</p>
                      <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-0.5">All verification services report functional.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
