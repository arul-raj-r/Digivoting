import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmModal from '../auth/LogoutConfirmModal';
import { 
  LayoutDashboard, 
  Vote, 
  PlusCircle, 
  FolderKanban,
  BarChart3, 
  Settings, 
  User,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Bot,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ 
  mobileMenuOpen, 
  setMobileMenuOpen,
  isCollapsed,
  setIsCollapsed 
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLinkClick = () => {
    if (setMobileMenuOpen) setMobileMenuOpen(false);
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

  // Canonical Global Navigation
  const sections = [
    {
      title: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      ]
    },
    {
      title: 'Elections',
      items: [
        { to: '/available-elections', label: 'Available elections', icon: Vote },
        { to: '/elections', label: 'My elections', icon: FolderKanban },
        { to: '/elections/create', label: 'Create election', icon: PlusCircle },
      ]
    },
    {
      title: 'Voting',
      items: [
        { to: '/voting-history', label: 'Voting history', icon: History },
      ]
    },
    {
      title: 'Results',
      items: [
        { to: '/results', label: 'Results & reports', icon: BarChart3 },
      ]
    },
    {
      title: 'Account',
      items: [
        { to: '/profile', label: 'Profile', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    },
    {
      title: 'Support',
      items: [
        { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
        { to: '/help', label: 'Help & FAQ', icon: HelpCircle },
      ]
    }
  ];

  const renderNavSection = (section, idx) => (
    <div key={idx} className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 tracking-wide uppercase font-sans">
            {section.title}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={handleLinkClick}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all group ${
                  isActive
                    ? 'bg-[#1a4231] text-white shadow-xs font-semibold dark:bg-[#1a4231] dark:text-white dark:border dark:border-[#2e7356]/40'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-[#e8ede9] dark:hover:bg-[#1a1d24] hover:text-stone-900 dark:hover:text-white font-medium'
                } ${isCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate font-sans">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none font-sans">
      
      {/* Top Brand Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Vote className="w-4 h-4 text-emerald-300" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm tracking-tight text-stone-900 dark:text-stone-100">
                    DigiVote
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/60 dark:border-amber-900/50">
                    CIVIC
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate">
                  Digital Voting Platform
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
          {sections.map(renderNavSection)}
        </nav>
      </div>

      {/* Footer: User & Logout */}
      <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          title={isCollapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:block bg-[#ffffff] dark:bg-[#14171b] border-r border-[#e6e2d8] dark:border-[#272b34] transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'w-20 p-3' : 'w-64 p-4'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 w-72 bg-[#ffffff] dark:bg-[#14171b] p-5 shadow-2xl z-50 overflow-y-auto border-r border-[#e6e2d8] dark:border-[#272b34]"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
