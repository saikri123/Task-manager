import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, LogOut } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef  = useRef(null);
  const navigate = useNavigate();

  const handleMenuToggle = () => setMenuOpen((prev) => !prev);

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200 font-sans">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 max-w-7xl mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 shadow-lg group-hover:shadow-sky-300/50 group-hover:scale-105 transition duration-300">
            <span className="text-white text-xl font-bold">TF</span>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full shadow-md animate-pulse"></div>
          </div>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent tracking-wide">
            Task Flow
          </span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 rounded-full transition-all duration-300"
            aria-label="Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={handleMenuToggle}
              className="flex items-center gap-3 px-3 py-1.5 rounded-full cursor-pointer hover:bg-sky-50 border border-transparent hover:border-sky-100 transition duration-300"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold shadow-sm">
                {userInitial}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name || 'User'}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{user?.email || 'No Email'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 md:hidden">
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <ul className="py-1">
                  <li>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-700 text-sm hover:bg-sky-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-sky-500" />
                      Profile Settings
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-rose-600 text-sm hover:bg-rose-50 transition-colors border-t border-slate-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;