import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, Shield, Landmark } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Security', path: '/security' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Contact', path: '/contact' },
    { name: 'Help', path: '/help' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gov-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gov-cardDark/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 text-gov-blue dark:text-slate-100 font-bold text-lg select-none">
                <Shield className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
                <div className="flex flex-col leading-none">
                  <span className="tracking-wide">DigiVote</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Secure Digital Voting Platform</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {links.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-gov-blue dark:text-gov-slate bg-slate-100 dark:bg-slate-800/50'
                        : 'text-slate-600 dark:text-slate-300 hover:text-gov-blue dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link
                    to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    className="bg-gov-blue hover:bg-gov-darkblue text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="border border-slate-350 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gov-blue hover:bg-gov-darkblue text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-expanded={isOpen}
                aria-label="Toggle main menu"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-gov-cardDark px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? 'text-gov-blue dark:text-gov-slate bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-gov-blue dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <div className="pt-4 pb-2 border-t border-slate-200 dark:border-slate-800 mt-2 px-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center bg-gov-blue hover:bg-gov-darkblue text-white px-4 py-2 rounded-md text-base font-medium"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center border border-slate-350 dark:border-slate-700 text-slate-650 dark:text-slate-300 px-4 py-2 rounded-md text-base font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center border border-slate-300 dark:border-slate-700 text-slate-605 dark:text-slate-300 px-4 py-2 rounded-md text-base font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center bg-gov-blue hover:bg-gov-darkblue text-white px-4 py-2 rounded-md text-base font-medium"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Landmark className="h-6 w-6 text-gov-slate" />
                <span className="tracking-wide">DigiVote</span>
              </div>
              <p className="text-xs text-slate-400">
                Secure Digital Voting Platform designed for secure, auditable, and accessible public elections.
              </p>
              <div className="text-[11px] text-slate-500">
                This is a secure citizen service demo portal. Not affiliated with any government agency.
              </div>
            </div>
            
            <div>
              <h3 className="text-white text-sm font-semibold mb-4">Service Links</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/about" className="hover:text-white transition-colors">About the Platform</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white transition-colors">How it Works</Link></li>
                <li><Link to="/security" className="hover:text-white transition-colors">Security Architecture</Link></li>
                <li><Link to="/results" className="hover:text-white transition-colors">Public Election Results</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-4">Voter Support</h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
                <li><Link to="/help" className="hover:text-white transition-colors">Voter Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Election Support</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white text-sm font-semibold mb-4">Security Standards</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                DigiVote uses client-side Device Biometric / WebAuthn and Face Verification in coordination with multi-factor OTP tokens.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <p>&copy; {new Date().getFullYear()} DigiVote. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="hover:text-slate-350">Privacy Policy</a>
              <a href="#" className="hover:text-slate-355">Terms of Service</a>
              <a href="#" className="hover:text-slate-360">Accessibility Statement</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
