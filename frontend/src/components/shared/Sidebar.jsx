import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutConfirmModal from '../auth/LogoutConfirmModal';
import { 
  LayoutDashboard, 
  Vote, 
  PlusCircle, 
  UserCheck, 
  Sliders, 
  BarChart2, 
  ShieldCheck, 
  Terminal, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut
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

  // Unified Platform Navigation per Section 41 architecture
  const sections = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      ]
    },
    {
      title: 'ELECTIONS',
      items: [
        { to: '/elections', label: 'My Elections', icon: PlusCircle },
        { to: '/available-elections', label: 'Available Elections', icon: Vote },
      ]
    },
    {
      title: 'VOTING',
      items: [
        { to: '/voter-verification', label: 'Voter Verification', icon: UserCheck },
        { to: '/voting', label: 'Voting Booth', icon: Vote },
      ]
    },
    {
      title: 'RESULTS',
      items: [
        { to: '/results', label: 'Results & Reports', icon: BarChart2 },
      ]
    },
    {
      title: 'SECURITY',
      items: [
        { to: '/sessions', label: 'Sessions & Security', icon: ShieldCheck },
        { to: '/audit-logs', label: 'Audit Logs', icon: Terminal },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const renderNavSection = (section, idx) => (
    <div key={idx} className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
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
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none">
      
      {/* Top Brand Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    DigiVote
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                    PLATFORM
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  Secure Digital Voting
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed && setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <nav className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {sections.map(renderNavSection)}
        </nav>
      </div>

      {/* Footer: User Role Pill & Logout */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          title={isCollapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        {!isCollapsed && (
          <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Security Core</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified
            </span>
          </div>
        )}
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
        className={`hidden md:block bg-white dark:bg-[#080d19] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'w-20 p-3' : 'w-64 p-4'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#080d19] p-5 shadow-2xl z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
