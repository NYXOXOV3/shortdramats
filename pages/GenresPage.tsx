import React, { useState } from 'react';
import { db } from '../services/db';
import { Drama } from '../types';
import VideoCard from '../components/VideoCard';

const GenresPage: React.FC = () => {
  const genres = db.getGenres().sort();
  const [selected, setSelected] = useState<string | null>(null);
  const dramas: Drama[] = db.getDramas();

  const list = selected ? dramas.filter(d => d.genre?.includes(selected)) : [];

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-4">Genres</h1>
      <div className="flex gap-3 flex-wrap mb-6">
        {genres.map(g => (
          <button key={g} onClick={() => setSelected(g)} className={`px-3 py-1 rounded-full font-bold ${selected === g ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            {g}
          </button>
        ))}
        <button onClick={() => setSelected(null)} className="px-3 py-1 rounded-full font-bold bg-slate-700 text-slate-300">All</button>
      </div>

      {selected ? (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Dramas in “{selected}”</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {list.map(d => (
              <VideoCard key={d.id} drama={d} onClick={(id) => window.location.hash = `#/details/${id}`} onFilter={() => window.location.hash = '#/search'} />
            ))}
            {list.length === 0 && <div className="text-slate-400 italic">Tidak ada drama di genre ini.</div>}
          </div>
        </div>
      ) : (
        <div className="text-slate-400">Pilih sebuah genre untuk melihat daftar dramanya.</div>
      )}
    </div>
  );
};

export default GenresPage;
