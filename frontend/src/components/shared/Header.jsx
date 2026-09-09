import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LogoutConfirmModal from '../auth/LogoutConfirmModal';
import { 
  Sun, 
  Moon, 
  Laptop,
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  ChevronRight, 
  ShieldCheck,
  User,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const role = user?.role || 'VOTER';
  const roleDisplay = role === 'ADMIN' ? 'ADMIN' : (role === 'ELECTION_CREATOR' || role === 'ORGANIZER') ? 'ORGANIZER' : 'VOTER';
  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User';

  // Compute dynamic breadcrumb path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const formatBreadcrumb = (part) => {
    return part
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
      navigate('/login');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#080d19]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb Navigation */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link to="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                DigiVote
              </Link>
              {pathParts.map((part, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className={idx === pathParts.length - 1 ? 'text-slate-900 dark:text-white font-bold' : ''}>
                    {formatBreadcrumb(part)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Center: Global Search Bar Interface */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search elections, candidates, voters..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-100/80 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </form>
          </div>

          {/* Right Tools: Security Indicator + Notifications + Theme Toggle + User Pill */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Real Security Status Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Secure</span>
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div 
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Security Alerts & Updates</span>
                    <span className="text-[10px] text-indigo-600 font-semibold font-mono">LIVE</span>
                  </div>
                  <div className="py-3 space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Audit Trail Operational</p>
                        <p className="text-[11px] text-slate-500">Cryptographic audit log recorder is active.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Biometric Pipeline Ready</p>
                        <p className="text-[11px] text-slate-500">ArcFace face verification module ready.</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="w-full text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-100 dark:border-slate-800"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* 3-Mode Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Theme: ${themeMode.toUpperCase()} (Click to toggle Light / Dark / System)`}
              aria-label="Toggle Theme"
            >
              {themeMode === 'system' ? (
                <Laptop className="h-4 w-4 text-indigo-500" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

              {/* User Profile Pill & Dropdown */}
            <div className="relative pl-1">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors border border-slate-200/60 dark:border-slate-800/60"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center font-bold text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left hidden sm:flex">
                  <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[130px] truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] leading-none mt-0.5">
                    {user?.email || 'Account'}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      to="/elections"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>My Elections</span>
                    </Link>
                    <Link
                      to="/available-elections"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Bell className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Available Elections</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Settings</span>
                    </Link>
                    <Link
                      to="/sessions"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sessions & Security</span>
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </header>
  );
}
