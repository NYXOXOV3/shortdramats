import React from 'react';
import { db } from '../services/db';
import VideoCard from '../components/VideoCard';

const PopularPage: React.FC = () => {
  const dramas = db.getDramas().sort((a,b) => (b.views || 0) - (a.views || 0));
  const top = dramas.slice(0, 24);

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-4">Popular</h1>
      {top.length === 0 ? (
        <div className="text-slate-400">Belum ada data views.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {top.map(d => (
            <VideoCard key={d.id} drama={d} onClick={(id) => window.location.hash = `#/details/${id}`} onFilter={() => window.location.hash = '#/search'} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PopularPage;
