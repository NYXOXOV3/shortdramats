
import React from 'react';
import { User, SubscriptionPlan } from '../types';
import { db } from '../services/db';
import { Icons } from '../components/Icons';

interface SubscriptionPageProps {
  user: User | null;
  onUpgrade: () => void;
  onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ user, onUpgrade, onBack }) => {
  const plans = db.getPlans();

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white mb-4">Upgrade ke Premium</h1>
        <p className="text-slate-400 max-w-xl mx-auto">Nonton semua episode eksklusif, bebas iklan, dan kualitas video HD hanya dengan berlangganan paket pilihan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p, idx) => (
          <div key={p.id} className={`p-8 rounded-[2.5rem] border-2 flex flex-col ${idx === 1 ? 'border-rose-500 bg-rose-500/5 shadow-2xl scale-105' : 'border-slate-800 bg-slate-900/40'}`}>
            <h3 className="text-xl font-black text-white mb-2">{p.name}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">{p.duration}</p>
            <div className="text-4xl font-black text-rose-500 mb-6">
              <span className="text-sm font-medium mr-1">Rp</span>
              {p.price.toLocaleString()}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-8 flex-1">{p.description}</p>
            <button 
              onClick={onUpgrade}
              className={`w-full py-4 rounded-2xl font-black transition-all ${idx === 1 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Pilih Paket
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h4 className="text-xl font-bold text-white mb-2">Status Saat Ini</h4>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${user?.isPremium ? 'bg-green-500' : 'bg-slate-500'}`} />
            <span className="font-black uppercase tracking-widest text-sm">{user?.isPremium ? 'Member Premium Aktif' : 'User Gratis'}</span>
          </div>
        </div>
        <button onClick={onBack} className="bg-slate-800 px-10 py-4 rounded-2xl font-bold text-white border border-slate-700">Kembali Menonton</button>
      </div>
    </div>
  );
};

export default SubscriptionPage;
