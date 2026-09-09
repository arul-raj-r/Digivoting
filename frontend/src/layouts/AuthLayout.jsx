import { Shield, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function AuthLayout({ children, title, subtitle }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gov-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar for Desktop - Security Notice */}
      <div className="hidden lg:flex lg:w-1/2 bg-gov-blue dark:bg-gov-darkblue text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gov-slate/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gov-slate/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div>
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl select-none mb-12">
            <Shield className="h-7 w-7 text-gov-slate" />
            <div className="flex flex-col leading-none">
              <span className="tracking-wide text-2xl font-extrabold">DigiVote</span>
              <span className="text-[11px] text-slate-350 font-normal">Secure Digital Voting Platform</span>
            </div>
          </Link>

          <div className="max-w-md space-y-6 mt-12">
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              Verified Digital Elections, Built on Public Trust
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Log in to access your secure dashboard. Verify your voter eligibility, view candidate credentials, and participate in active public decisions securely.
            </p>
            
            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Two-Factor Authentication</h4>
                  <p className="text-xs text-slate-300">Every login session is protected by standard OTP verification.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Cryptographic Receipts</h4>
                  <p className="text-xs text-slate-300">Download auditable receipts of cast votes without revealing candidate choices.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Active Session Management</h4>
                  <p className="text-xs text-slate-300">Inspect and terminate active device sessions in real time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 border-t border-slate-700/50 pt-6">
            <p className="font-semibold text-slate-350 mb-1">Official Security Reminder</p>
            <p>Always verify the browser address bar is securely connected. DigiVote staff will never request your passwords, OTP keys, or private credentials.</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="flex lg:hidden items-center gap-2 text-gov-blue dark:text-white font-bold select-none">
            <Shield className="h-6 w-6 text-gov-slate" />
            <span className="tracking-wide">DigiVote</span>
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Exit
            </Link>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center py-6">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              {title && <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h2>}
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            
            <div className="bg-white dark:bg-gov-cardDark p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-850">
              {children}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mt-8">
          <p>&copy; {new Date().getFullYear()} DigiVote. Public Digital Voting Demo Portal.</p>
        </div>
      </div>
    </div>
  );
}
