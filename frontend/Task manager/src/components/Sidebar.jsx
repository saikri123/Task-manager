import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  CheckCircle2, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Zap 
} from 'lucide-react';

const Sidebar = ({ user, task = [], onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // --- STATS LOGIC ---
  // FIX: was `tasks` (undefined), now correctly uses `task`
  const totalTask = (task || []).length;
  const completedTask = task.filter(t => 
    t.completed === true || 
    t.completed === 1 || 
    (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')
  ).length;
  
  const productivity = totalTask > 0 ? Math.round((completedTask / totalTask) * 100) : 0;

  // --- MOBILE SCROLL LOCK ---
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : 'auto';
    return () => (document.body.style.overflow = 'auto');
  }, [mobileOpen]);

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  const menuItems = [
    { text: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    { text: 'Pending Tasks', path: '/pending', icon: <Clock className="w-5 h-5" /> },
    { text: 'Completed', path: '/complete', icon: <CheckCircle2 className="w-5 h-5" /> },
    { text: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  // Common NavLink Style
  const navLinkClass = ({ isActive }) => `
    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
    ${isActive 
      ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
      : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'}
  `;

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-purple-100 p-6 hidden xl:flex flex-col z-40">
        
        {/* User Profile Header */}
        <div className="flex items-center gap-3 mb-10 p-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg">
            {userInitial}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 truncate">{user?.name || 'User'}</h2>
            <p className="text-xs font-medium text-purple-500 truncate lowercase">{user?.email || 'Member'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map(({ text, path, icon }) => (
              <li key={text}>
                <NavLink to={path} className={navLinkClass}>
                  {icon}
                  <span className="font-bold text-sm tracking-tight">{text}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Productivity Widget */}
        <div className="mt-auto mb-6 p-4 bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-2xl border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Productivity</span>
            <Zap className="w-3 h-3 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-800">{productivity}%</div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-full transition-all duration-1000" 
              style={{ width: `${productivity}%` }}
            />
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={onLogout} 
          className="flex items-center gap-3 w-full px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* MOBILE TRIGGER */}
      <button 
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-2xl xl:hidden active:scale-90 transition-transform" 
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-center mb-10">
              <span className="text-xl font-black bg-gradient-to-r from-fuchsia-500 to-purple-600 bg-clip-text text-transparent">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 bg-gray-50 rounded-xl text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1">
              <ul className="space-y-3">
                {menuItems.map(({ text, path, icon }) => (
                  <li key={text}>
                    <NavLink to={path} onClick={() => setMobileOpen(false)} className={navLinkClass}>
                      {icon}
                      <span className="font-bold text-sm">{text}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <button 
              onClick={() => { setMobileOpen(false); onLogout(); }} 
              className="mt-auto flex items-center justify-center gap-3 w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;