import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';

interface Props {
  onBack: () => void;
}

const EditProfile: React.FC<Props> = ({ onBack }) => {
  const current = db.getCurrentUser();
  const [user, setUser] = useState<User | null>(current);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    setUser(db.getCurrentUser());
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Tidak ada user.');
    if (password && password !== confirm) return alert('Password konfirmasi tidak cocok.');

    const updated: User = {
      ...user,
      name,
      avatar: avatar || user.avatar,
      password: password ? password : user.password
    };

    db.saveUser(updated);
    db.setCurrentUser(updated);
    alert('Profil berhasil diperbarui.');
    onBack();
  };

  if (!user) return <div className="pt-32 text-center text-slate-500">Silakan login terlebih dahulu.</div>;

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-md mx-auto">
      <button onClick={onBack} className="text-slate-400 mb-6">Kembali</button>
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
        <h2 className="text-2xl font-black text-white mb-4">Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nama</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Avatar URL</label>
            <input value={avatar} onChange={e=>setAvatar(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">New Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Confirm Password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-rose-600 py-3 rounded-xl font-bold">Simpan</button>
            <button type="button" onClick={onBack} className="flex-1 bg-slate-800 py-3 rounded-xl">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
