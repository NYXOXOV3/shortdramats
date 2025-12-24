
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onSearch: (val: string) => void;
  siteName?: string;
  logoUrl?: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onNavigate, currentPage, onSearch, siteName, logoUrl }) => {
  const [searchVal, setSearchVal] = useState('');
  const [settings, setSettings] = useState<any>(() => db.getSiteSettings());
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setSettings(db.getSiteSettings());
    const handler = () => setSettings(db.getSiteSettings());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) onSearch(searchVal);
  };

  return (
    <>
    <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => onNavigate('home')}
      >
        { (logoUrl || settings.logoUrl) ? (
          <img src={(logoUrl || settings.logoUrl) as string} alt={(siteName || settings.siteName) as string} className="w-8 h-8 rounded-lg border border-slate-700 object-cover" />
        ) : (
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Icons.Play className="w-6 h-6 text-white fill-current" />
          </div>
        )}
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          {siteName || settings.siteName || 'DramaShort'}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex items-center gap-2 transition-colors ${currentPage === 'home' ? 'text-rose-500' : 'text-slate-400 hover:text-white'}`}
        >
          <Icons.Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </button>
        <button onClick={() => onNavigate('new')} className={`flex items-center gap-2 transition-colors ${currentPage === 'new' ? 'text-rose-500' : 'text-slate-400 hover:text-white'}`}>
          <Icons.Zap className="w-5 h-5" />
          <span className="font-medium">New</span>
        </button>
        <button onClick={() => onNavigate('popular')} className={`flex items-center gap-2 transition-colors ${currentPage === 'popular' ? 'text-rose-500' : 'text-slate-400 hover:text-white'}`}>
          <Icons.Star className="w-5 h-5" />
          <span className="font-medium">Popular</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative group hidden sm:block">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search dramas..." 
            value={searchVal}
            onChange={e=>setSearchVal(e.target.value)}
            className="bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:w-64 focus:ring-2 focus:ring-rose-500/50 transition-all outline-none"
          />
        </form>

        {user ? (
          <div className="flex items-center gap-4">
            {user.role === UserRole.ADMIN && (
              <button 
                onClick={() => onNavigate('admin')}
                className={`p-2 rounded-lg transition-all ${currentPage === 'admin' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                title="Admin Panel"
              >
                <Icons.LayoutDashboard className="w-5 h-5" />
              </button>
            )}
            <div className="relative group">
              <button className="flex items-center gap-2 bg-slate-800 p-1 pr-3 rounded-full hover:bg-slate-700 transition-all border border-slate-700">
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-slate-600 shadow-lg" />
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">{user.name}</span>
              </button>
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[100]">
                <button onClick={() => onNavigate('profile')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
                  <Icons.User className="w-4 h-4" /> Profile
                </button>
                <button onClick={() => onNavigate('edit-profile')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
                  <Icons.Edit className="w-4 h-4" /> Edit Profile
                </button>
                <button onClick={() => onNavigate('subscription')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors font-bold">
                  <Icons.Zap className="w-4 h-4" /> Subscription
                </button>
                <hr className="my-1 border-slate-800" />
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-bold"
                >
                  <Icons.LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onNavigate('login')}
            className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg shadow-rose-600/20"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
    {/* Mobile search overlay */}
    {mobileSearchOpen && (
      <div className="fixed top-14 left-4 right-4 z-50 md:hidden">
        <form onSubmit={(e) => { e.preventDefault(); if (searchVal.trim()) { onSearch(searchVal); setMobileSearchOpen(false); setSearchVal(''); } }} className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <Icons.Search className="w-5 h-5 text-slate-400" />
          <input autoFocus value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Search dramas..." className="flex-1 bg-transparent outline-none text-sm text-slate-100" />
          <button type="button" onClick={() => { setMobileSearchOpen(false); }} className="text-slate-400 px-2">Close</button>
        </form>
      </div>
    )}

    {/* Mobile bottom nav */}
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/95 border-t border-slate-800 py-2 flex justify-around z-50">
      <button onClick={() => onNavigate('home')} aria-label="Home" className="flex flex-col items-center text-slate-300 hover:text-white">
        <Icons.Home className="w-6 h-6" />
        <span className="text-[10px] mt-1">Home</span>
      </button>
      <button onClick={() => setMobileSearchOpen(true)} aria-label="Search" className="flex flex-col items-center text-slate-300 hover:text-white">
        <Icons.Search className="w-6 h-6" />
        <span className="text-[10px] mt-1">Search</span>
      </button>
      <button onClick={() => onNavigate('genres')} aria-label="Genres" className="flex flex-col items-center text-slate-300 hover:text-white">
        <Icons.Menu className="w-6 h-6" />
        <span className="text-[10px] mt-1">Genres</span>
      </button>
      <button onClick={() => onNavigate('new')} aria-label="New" className="flex flex-col items-center text-slate-300 hover:text-white">
        <Icons.Zap className="w-6 h-6" />
        <span className="text-[10px] mt-1">New</span>
      </button>
      <button onClick={() => onNavigate('popular')} aria-label="Popular" className="flex flex-col items-center text-slate-300 hover:text-white">
        <Icons.Star className="w-6 h-6" />
        <span className="text-[10px] mt-1">Popular</span>
      </button>
      <button onClick={() => onNavigate('profile')} aria-label="Profile" className="flex flex-col items-center text-slate-300 hover:text-white">
        <img src={(user && user.avatar) || '/'} className="w-6 h-6 rounded-full border border-slate-700 object-cover" />
        <span className="text-[10px] mt-1">Profile</span>
      </button>
    </div>
    </>
  );
};

export default Navbar;
