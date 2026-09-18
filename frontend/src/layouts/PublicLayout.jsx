import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Sun, Moon, Laptop, Shield, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DigiVoteHelpWidget from '../components/ai/DigiVoteHelpWidget';

export default function PublicLayout({ children }) {
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Features', path: '/features' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Security', path: '/security' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] dark:bg-[#101216] text-[#101216] dark:text-[#f7f5f0] transition-colors duration-200 font-sans">
      
      {/* Top Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#171a20]/90 border-b border-stone-200/80 dark:border-[#262a33] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2.5 select-none group">
                <div className="w-9 h-9 rounded-lg bg-[#1a4231] text-emerald-300 flex items-center justify-center border border-emerald-500/20 shadow-xs">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-lg tracking-tight text-stone-900 dark:text-white">
                      DigiVote
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#262a33] uppercase">
                      Civic
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    Digital Voting Infrastructure
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
                        ? 'text-emerald-800 dark:text-emerald-300 bg-stone-100 dark:bg-[#101216]'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-[#101216]'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Right Tools: Theme Toggle + Login + Get Started */}
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                onClick={cycleTheme}
                className="p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#101216] transition-colors flex items-center gap-1.5 text-xs font-mono"
                title={`Theme: ${themeMode.toUpperCase()}`}
                aria-label="Toggle theme"
              >
                {themeMode === 'system' ? (
                  <Laptop className="h-4 w-4 text-stone-500" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                  {themeMode}
                </span>
              </button>

              <div className="h-4 w-px bg-stone-200 dark:bg-[#262a33]" />

              <Link
                to="/login"
                className="text-xs font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Create account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={cycleTheme}
                className="p-2 rounded-lg text-stone-600 dark:text-stone-400"
                aria-label="Toggle theme"
              >
                {themeMode === 'system' ? (
                  <Laptop className="h-4 w-4 text-stone-500" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-600" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMenu}
                className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#101216]"
                aria-expanded={isOpen}
                aria-label="Toggle navigation"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {isOpen && (
          <div className="md:hidden border-b border-stone-200 dark:border-[#262a33] bg-white dark:bg-[#171a20] px-4 pt-3 pb-6 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? 'text-emerald-800 dark:text-emerald-300 bg-stone-100 dark:bg-[#101216]'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216]'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-stone-200 dark:border-[#262a33] flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="w-full text-center bg-[#1a4231] text-white py-2 rounded-lg text-xs font-semibold"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#101216] text-stone-400 py-12 border-t border-[#262a33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-serif font-bold text-base">
                <Shield className="h-5 w-5 text-emerald-400" />
                <span>DigiVote</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Institutional digital voting infrastructure built to conduct verified, confidential, and auditable elections.
              </p>
              <div className="text-[11px] text-stone-500 font-mono">
                Institutional Digital Voting Platform
              </div>
            </div>
            
            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 font-mono">Navigation</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 font-mono">Platform</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/security" className="hover:text-white transition-colors">Security Architecture</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Voter & Admin Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Register Account</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 font-mono">Governance</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                DigiVote implements two-factor authentication, authorized voter roster enforcement, confidential ballot segregation, and tamper-evident audit logging.
              </p>
            </div>
          </div>

          <div className="border-t border-[#262a33] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
            <p>&copy; {new Date().getFullYear()} DigiVote Platform &middot; Institutional Electoral Trust</p>
            <div className="flex gap-6">
              <span className="text-stone-500">Privacy Standards</span>
              <span className="text-stone-500">Terms of Governance</span>
              <span className="text-stone-500">Ballot Confidentiality</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating DigiVote Help Drawer Widget */}
      <DigiVoteHelpWidget />
    </div>
  );
}
