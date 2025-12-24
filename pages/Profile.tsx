
import React from 'react';
import { User } from '../types';
import { Icons } from '../components/Icons';

interface ProfileProps {
  user: User | null;
  onLogout: () => void;
  onBack: () => void;
}

const ProfilePage: React.FC<ProfileProps> = ({ user, onLogout, onBack }) => {
  if (!user) return <div className="pt-32 text-center text-slate-500">Silakan login terlebih dahulu.</div>;

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-2xl mx-auto animate-in slide-in-from-bottom duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
        <Icons.ChevronRight className="w-5 h-5 rotate-180" /> Kembali ke Home
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="h-32 bg-gradient-to-r from-rose-600 to-amber-600" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6">
            <img src={user.avatar} className="w-32 h-32 rounded-full border-8 border-slate-900 shadow-xl" />
            <div className={`absolute bottom-2 left-24 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg ${user.isPremium ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
              {user.isPremium ? 'Premium' : 'Free Account'}
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-1">{user.name}</h1>
          <p className="text-slate-400 font-medium mb-8">{user.email}</p>

          <div className="space-y-4">
            <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icons.User className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-bold text-slate-300">Account Role</span>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white">{user.role}</span>
            </div>
            <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icons.Clock className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-bold text-slate-300">Joined Since</span>
              </div>
              <span className="text-xs font-bold text-white">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="w-full mt-10 bg-slate-800 hover:bg-rose-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border border-slate-700"
          >
            <Icons.LogOut className="w-5 h-5" /> Logout dari Akun
          </button>
          <button
            onClick={() => window.location.hash = '#/edit-profile'}
            className="w-full mt-4 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-3 border border-rose-700"
          >
            <Icons.Edit className="w-5 h-5" /> Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
