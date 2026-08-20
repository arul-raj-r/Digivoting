import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Sun, Moon, Award, ShieldAlert, BarChart3, Users, Landmark, FileCheck } from 'lucide-react';
import { AIChatBot } from './AIChatBot';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, voterProfile, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className="min-h-screen flex flex-col bg-gov-light dark:bg-gov-dark text-slate-800 dark:text-slate-100">
      {/* Official Government Header Banner */}
      <div className="bg-gov-darkblue text-white py-1 px-4 text-[10px] font-bold flex items-center justify-between border-b border-gov-blue">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gov-saffron">★</span>
          <span>GOVERNMENT OF INDIA • NATIONAL DIGITAL ELECTION PORTAL</span>
          <span className="text-gov-green">★</span>
        </div>
        <div className="hidden sm:block">
          <span>Academic Evaluation Prototype • ECI Inspired</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-white dark:bg-slate-950 border-b-3 border-gov-blue shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Crest and Portal Title */}
            <div className="flex items-center gap-3">
              {/* Stylized Emblem Placeholder */}
              <div className="bg-gov-blue p-2 rounded-lg shadow flex items-center justify-center border border-gov-saffron">
                <svg className="w-6 h-6 text-gov-saffron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2v20M2 12h20" className="text-gov-green" />
                  <polygon points="12,7 15,12 12,17 9,12" fill="currentColor" fillOpacity="0.3" />
                </svg>
              </div>
              <div>
                <Link to="/" className="font-black text-base tracking-tight text-gov-blue dark:text-white block uppercase">
                  National Digital Election Portal
                </Link>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block -mt-1">
                  Election Commission of India (Academic Design Concept)
                </span>
              </div>
            </div>

            {/* Navigation links & Controls */}
            <div className="flex items-center gap-4">
              {/* Static public links for ECI theme feel */}
              <div className="hidden lg:flex items-center gap-4 mr-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                <Link to="/" className="hover:text-gov-blue dark:hover:text-white transition-colors">Home</Link>
                <span className="text-slate-300">|</span>
                <Link to="/results" className="hover:text-gov-blue dark:hover:text-white transition-colors">Elections</Link>
                <span className="text-slate-300">|</span>
                <Link to="/dashboard" className="hover:text-gov-blue dark:hover:text-white transition-colors">Voter Services</Link>
                <span className="text-slate-300">|</span>
                <a href="#helpline" onClick={(e) => { e.preventDefault(); alert("Mock Helpline: 1800-111-MOCK (Toll-Free). Active Monday to Friday (9:00 AM - 5:00 PM)"); }} className="hover:text-gov-blue dark:hover:text-white transition-colors">Help</a>
              </div>

              {user && (
                <div className="hidden md:flex items-center gap-4 mr-4 text-xs font-bold border-l border-slate-200 dark:border-slate-800 pl-4">
                  {user.role === 'ADMIN' ? (
                    <>
                      <Link 
                        to="/admin" 
                        className={`flex items-center gap-1 py-1.5 px-3 rounded transition-colors ${location.pathname === '/admin' ? 'bg-gov-blue text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-gov-blue'}`}
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        Admin Console
                      </Link>
                      <Link 
                        to="/results" 
                        className={`flex items-center gap-1 py-1.5 px-3 rounded transition-colors ${location.pathname === '/results' ? 'bg-gov-blue text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-gov-blue'}`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Analytics
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/dashboard" 
                        className={`flex items-center gap-1 py-1.5 px-3 rounded transition-colors ${location.pathname === '/dashboard' ? 'bg-gov-blue text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-gov-blue'}`}
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Voter Dashboard
                      </Link>
                      <Link 
                        to="/results" 
                        className={`flex items-center gap-1 py-1.5 px-3 rounded transition-colors ${location.pathname === '/results' ? 'bg-gov-blue text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-gov-blue'}`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Live Turnout
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                aria-label="Toggle theme accessibility"
              >
                {isDark ? <Sun className="h-4 w-4 text-gov-gold" /> : <Moon className="h-4 w-4 text-gov-blue" />}
              </button>

              {/* User status & Logout */}
              {user ? (
                <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <div className="hidden sm:block text-right">
                    <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                      {user.full_name}
                    </span>
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-red-105 text-red-800 dark:bg-red-950/20 dark:text-red-400 font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                        Administrator
                      </span>
                    ) : voterProfile?.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-green-105 text-green-800 dark:bg-green-950/20 dark:text-green-400 font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                        Verified Voter
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-amber-105 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                        Pending Verify
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 rounded text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link 
                    to="/login"
                    className="text-xs font-bold py-1.5 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition-all border border-slate-200 dark:border-slate-800"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register"
                    className="text-xs font-bold py-1.5 px-3 bg-gov-blue hover:bg-gov-darkblue text-white rounded transition-all shadow-sm"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Scrolling ECI Announcement Strip */}
      <div className="bg-amber-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-4 text-xs font-semibold overflow-hidden whitespace-nowrap text-slate-700 dark:text-slate-350">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="flex items-center gap-1 text-gov-saffron uppercase font-black shrink-0 text-[10px] tracking-wide">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
            ECI NOTIFICATIONS:
          </span>
          <div className="overflow-hidden relative w-full flex items-center">
            <style>{`
              @keyframes marquee {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .animate-marquee {
                animation: marquee 25s linear infinite;
              }
              .animate-marquee:hover {
                animation-play-state: paused;
              }
            `}</style>
            <div className="animate-marquee whitespace-nowrap cursor-pointer">
              📢 Notice: Voter registration approval generates an official Digital Voter ID Card instantly. | 📢 OTP verification is required to complete authentication security sequence. | 📢 Academic Demo Helpline: 1800-111-MOCK (Toll-Free).
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Floating AI Support Bot */}
      <AIChatBot />

      {/* Official Government Footer */}
      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 font-semibold">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gov-blue dark:text-gov-saffron" />
              <span>National Digital Election & Voting Portal © 2026. Inspired by the Election Commission of India.</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Toll-Free Mock Helpline: 1800-111-MOCK | Email: support@mock-digital-election.gov.in
            </p>
          </div>
          <div className="flex gap-6 font-bold uppercase text-[9px] tracking-wide">
            <span className="hover:underline hover:text-gov-blue cursor-pointer">Privacy Policy</span>
            <span className="hover:underline hover:text-gov-blue cursor-pointer">Terms of Service</span>
            <span className="hover:underline hover:text-gov-blue cursor-pointer">Security Protocol & Audit Logs</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
