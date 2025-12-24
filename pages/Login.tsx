
import React, { useState } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { Icons } from '../components/Icons';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();

    if (isRegister) {
      const exists = users.find(u => u.email === email);
      if (exists) return alert("Email sudah terdaftar!");
      const newUser = db.registerUser({ name, email, password });
      db.setCurrentUser(newUser);
      onLoginSuccess(newUser);
    } else {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        db.setCurrentUser(user);
        onLoginSuccess(user);
      } else {
        alert("Email atau password salah!");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md animate-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-4 mb-8 cursor-pointer" onClick={onBack}>
          <div className="bg-gradient-to-tr from-rose-500 to-amber-500 p-3 rounded-2xl shadow-xl shadow-rose-600/30">
            <Icons.Play className="w-10 h-10 text-white fill-current" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">DramaShort</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">{isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}</h2>
          <p className="text-slate-400 text-sm mb-8">Silakan isi data Anda untuk melanjutkan.</p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Lengkap</label>
                <input 
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-xl font-black text-lg shadow-xl shadow-rose-600/20 transition-all mt-4">
              {isRegister ? 'Daftar Sekarang' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} 
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="text-rose-500 font-bold ml-1 hover:underline"
              >
                {isRegister ? 'Masuk di sini' : 'Daftar di sini'}
              </button>
            </p>
        </div>
      </div>

      </div>
    </div>
  );
};

export default Login;
