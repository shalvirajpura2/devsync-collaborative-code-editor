import devsyncLogo from '@/assets/devsync-logo.png';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { LogOut, Users, Home, Plus, Settings, History, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';

const navItems = [
  { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/app' },
  { label: 'Create Room', icon: <Plus className="w-5 h-5" />, path: '/app?new=1' },
  { label: 'Room History', icon: <History className="w-5 h-5" />, path: '/app/history' },
  { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/app/settings' },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useFirebaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  // (simple implementation for now)
  function handleProfileBlur(e) {
    if (!profileRef.current?.contains(e.relatedTarget)) {
      setProfileOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-20 md:w-64 bg-zinc-900/90 border-r border-zinc-800 py-6 px-2 md:px-6 gap-4 shadow-2xl transition-all duration-300">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center md:justify-start">
          <img src={devsyncLogo} alt="DevSync Logo" className="w-10 h-10 rounded-lg shadow-md" />
          <span className="hidden md:inline text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent ml-2 tracking-tight" style={{ fontFamily: 'Inter, JetBrains Mono, monospace' }}>DevSync</span>
        </div>
        {/* Nav Items */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all duration-150 text-left ${location.pathname === item.path ? 'bg-indigo-700/40 text-indigo-300' : 'hover:bg-zinc-800/80 hover:text-indigo-200'} ${location.pathname === item.path ? 'font-bold' : ''}`}
              onClick={() => navigate(item.path)}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {item.icon}
              <span className="hidden md:inline text-base">{item.label}</span>
            </button>
          ))}
        </nav>
        {/* User Profile (bottom) */}
        <div className="mt-auto flex flex-col items-center md:items-start relative" tabIndex={0} ref={profileRef} onBlur={handleProfileBlur}>
          {user && (
            <button
              className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-zinc-800/80 transition-all duration-150 w-full"
              onClick={() => setProfileOpen((v) => !v)}
              tabIndex={0}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-lg font-bold text-white shadow-md">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  user.email?.[0]?.toUpperCase()
                )}
              </div>
              <div className="hidden md:flex flex-col items-start ml-2">
                <span className="font-semibold text-zinc-100 text-sm" style={{ fontFamily: 'Inter, JetBrains Mono, monospace' }}>{user.displayName || user.email}</span>
                <span className="text-xs text-zinc-400 font-mono">{user.email}</span>
              </div>
              <ChevronDown className="w-4 h-4 hidden md:inline ml-1 text-zinc-400" />
            </button>
          )}
          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute left-0 bottom-14 md:bottom-auto md:left-12 md:top-0 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-2 w-48 animate-fade-in-up">
              <div className="px-4 py-2 border-b border-zinc-800">
                <div className="font-semibold text-zinc-100 text-base mb-1">{user.displayName || user.email}</div>
                <div className="text-xs text-zinc-400 font-mono mb-1">{user.email}</div>
              </div>
              <button className="w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors text-sm" onClick={() => { setProfileOpen(false); navigate('/app/profile'); }}>View Profile</button>
              <button className="w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors text-sm" onClick={() => { setProfileOpen(false); navigate('/app/settings'); }}>Edit Profile</button>
              <button className="w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors text-sm text-red-400 flex items-center gap-2" onClick={logout}><LogOut className="w-4 h-4" />Logout</button>
            </div>
          )}
        </div>
      </aside>
      {/* Main content area (TopNavbar + children) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopNavbar placeholder - to be implemented next */}
        <div className="sticky top-0 z-20 bg-zinc-900/80 border-b border-zinc-800 px-4 md:px-10 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 shadow-lg">
          {/* Title and subtitle */}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ fontFamily: 'Inter, JetBrains Mono, monospace' }}>Your Coding Rooms</h1>
            <p className="text-zinc-400 text-sm" style={{ fontFamily: 'Inter, JetBrains Mono, monospace' }}>Manage and join collaborative coding sessions</p>
          </div>
          {/* Homepage button */}
          <Button variant="outline" className="ml-auto" onClick={() => navigate('/')}>Go to Homepage</Button>
        </div>
        {/* Main content */}
        <main className="flex-1 flex flex-col p-2 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
} 