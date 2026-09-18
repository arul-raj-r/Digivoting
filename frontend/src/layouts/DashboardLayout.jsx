import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Landmark,
  Shield,
  BarChart3,
  HelpCircle,
  User,
  Bell,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // A unified DigiVote account can organize one election and vote in another.
  const navItems = [
    { name: 'Voter Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Elections', path: '/elections', icon: Landmark },
    { name: 'Create Election', path: '/elections/create', icon: PlusCircle },
    { name: 'AI Assistant', path: '/ai-assistant', icon: HelpCircle },
    { name: 'Active Sessions', path: '/sessions', icon: Shield },
    { name: 'Voter Profile', path: '/profile', icon: User },
    { name: 'Help & Support', path: '/help', icon: HelpCircle },
  ];

  // Helper to construct breadcrumbs based on route
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return [
      { name: 'Home', path: '/' },
      ...paths.map((path, idx) => {
        const url = `/${paths.slice(0, idx + 1).join('/')}`;
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
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gov-cardDark border-r border-slate-200 dark:border-slate-800 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2 font-bold text-gov-blue dark:text-slate-100">
            <Shield className="h-6 w-6 text-gov-slate" />
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="tracking-wide">DigiVote</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                  isCreatorOrAdmin
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {isCreatorOrAdmin ? 'Creator' : 'Citizen'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                {isCreatorOrAdmin ? 'Creator Dashboard' : 'Citizen Voter Portal'}
              </span>
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
                end={item.path === '/elections' || item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gov-blue text-white shadow-sm dark:bg-gov-slate dark:text-slate-900 font-semibold'
                      : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 rounded-full bg-gov-blue/10 dark:bg-gov-slate/10 flex items-center justify-center font-bold text-gov-blue dark:text-gov-slate text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{user?.full_name}</p>
              <p className="text-[10px] text-slate-450 dark:text-slate-450 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-455 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay and Menu) */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={toggleSidebar}
            aria-hidden="true"
          />
          {/* Drawer Menu */}
          <div className="relative flex flex-col w-64 bg-white dark:bg-gov-cardDark border-r border-slate-200 dark:border-slate-800 p-4 z-50">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-gov-slate" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gov-blue dark:text-white">DigiVote</span>
                    <span className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded ${
                      isCreatorOrAdmin ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isCreatorOrAdmin ? 'Creator' : 'Citizen'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isCreatorOrAdmin ? 'Creator Dashboard' : 'Citizen Voter Portal'}
                  </span>
                </div>
              </div>
              <button 
                onClick={toggleSidebar} 
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label="Close menu"
              >
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
                          ? 'bg-gov-blue text-white shadow-sm dark:bg-gov-slate dark:text-slate-900'
                          : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-805'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
                Logout
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
            {/* Mobile Hamburger */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar menu"
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
                    className={`hover:text-slate-600 dark:hover:text-slate-200 font-medium ${
                      idx === breadcrumbs.length - 1 ? 'text-slate-600 dark:text-slate-200 font-semibold' : ''
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

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileDropdownOpen(false);
                }}
                className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gov-blue dark:bg-gov-gold"></span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gov-cardDark border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-2 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 font-semibold flex justify-between items-center">
                    <span>Notifications</span>
                    <Link to="/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-xs text-gov-blue dark:text-gov-slate hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800/30">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Official Session Active</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Your protected session is securely authenticated.</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Security Notice: 2FA Active</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Two-factor login verified successfully.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Profile actions"
              >
                <div className="h-8 w-8 rounded-full bg-gov-blue text-white flex items-center justify-center font-bold text-xs select-none">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-750 dark:text-slate-200 pr-1">{user?.full_name}</span>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gov-cardDark border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 z-50 text-sm">
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="block px-4 py-2 text-slate-650 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-805 transition-colors"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/security"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="block px-4 py-2 text-slate-650 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  >
                    Security Settings
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Sign Out
                  </button>
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
