import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Sun, Moon, Laptop, Shield, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function PublicLayout({ children }) {
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Features', path: '/features' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Security', path: '/security' },
    { name: 'Contact Us', path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#070b14]/85 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-3 select-none group">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                      DigiVote
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                      SECURE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Secure Digital Voting Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {links.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  end={link.path === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Right Tools: Theme Toggle + Login + Get Started */}
            <div className="hidden md:flex items-center gap-3">
              {/* 3-Mode Theme Button */}
              <button
                type="button"
                onClick={cycleTheme}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
                title={`Theme: ${themeMode.toUpperCase()} (Click to cycle Light / Dark / System)`}
                aria-label="Toggle Theme"
              >
                {themeMode === 'system' ? (
                  <Laptop className="h-4 w-4 text-indigo-500" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
                  {themeMode}
                </span>
              </button>

              <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />

              <Link
                to="/login"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-3.5 py-2 rounded-xl transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all hover:shadow-indigo-600/35"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={cycleTheme}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Toggle theme"
              >
                {themeMode === 'system' ? (
                  <Laptop className="h-4 w-4 text-indigo-500" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-expanded={isOpen}
                aria-label="Toggle main menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] px-4 pt-3 pb-6 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="w-full text-center bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Professional Footer */}
      <footer className="bg-slate-900 dark:bg-[#050811] text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Shield className="h-5 w-5 text-indigo-400" />
                <span>DigiVote</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Secure Digital Voting Platform built for modern organizations to conduct verified, confidential, and auditable digital elections.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Institutional Digital Voting Platform
              </div>
            </div>
            
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Navigation</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Platform</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/security" className="hover:text-white transition-colors">Security Architecture</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Voter & Organizer Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Security Principles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                DigiVote integrates Email OTP MFA, webcam face verification, confidential ballot handling with time-truncated submission records, and end-to-end audit logging.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} DigiVote. Secure Digital Voting Platform. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="text-slate-500">Privacy Policy</span>
              <span className="text-slate-500">Terms of Service</span>
              <span className="text-slate-500">Security Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

