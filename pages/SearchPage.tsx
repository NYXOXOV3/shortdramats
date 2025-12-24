
import React, { useState, useEffect } from 'react';
import { Drama } from '../types';
import { db } from '../services/db';
import VideoCard from '../components/VideoCard';
import { Icons } from '../components/Icons';

interface SearchPageProps {
  filter: { type: 'genre' | 'region' | 'search', value: string } | null;
  onSelectDrama: (id: string) => void;
  onBack: () => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ filter, onSelectDrama, onBack }) => {
  const [results, setResults] = useState<Drama[]>([]);

  useEffect(() => {
    const dramas = db.getDramas();
    if (!filter) {
      setResults(dramas);
      return;
    }

    let filtered = dramas;
    if (filter.type === 'genre') {
      // Fix: drama.genre is a string array, use .some() for case-insensitive matching
      filtered = dramas.filter(d => d.genre.some(g => g.toLowerCase() === filter.value.toLowerCase()));
    } else if (filter.type === 'region') {
      // Fix: drama.region is a string array, use .some() for case-insensitive matching
      filtered = dramas.filter(d => d.region.some(r => r.toLowerCase() === filter.value.toLowerCase()));
    } else {
      const q = filter.value.toLowerCase();
      filtered = dramas.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.description.toLowerCase().includes(q) ||
        d.genre.some(g => g.toLowerCase().includes(q)) ||
        d.region.some(r => r.toLowerCase().includes(q))
      );
    }
    setResults(filtered);
  }, [filter]);

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">
            {filter?.type === 'search' ? `Hasil Cari: "${filter.value}"` : 
             filter?.type === 'genre' ? `Genre: ${filter.value}` : 
             filter?.type === 'region' ? `Region: ${filter.value}` : 'Semua Drama'}
          </h1>
          <p className="text-slate-500 font-medium">{results.length} drama ditemukan.</p>
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-white font-bold flex items-center gap-2">
           <Icons.X className="w-5 h-5" /> Tutup
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {results.map(drama => (
          <VideoCard key={drama.id} drama={drama} onClick={onSelectDrama} />
        ))}
      </div>

      {results.length === 0 && (
        <div className="py-32 text-center">
           <Icons.Search className="w-16 h-16 text-slate-800 mx-auto mb-4" />
           <p className="text-slate-500 font-bold text-xl italic">Ups! Tidak ada drama yang cocok.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
