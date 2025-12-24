import React from 'react';
import { db } from '../services/db';
import VideoCard from '../components/VideoCard';

const NewReleases: React.FC = () => {
  const dramas = db.getDramas().filter(d => d.isNew);

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-4">New Releases</h1>
      {dramas.length === 0 ? (
        <div className="text-slate-400">Tidak ada release baru saat ini.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {dramas.map(d => (
            <VideoCard key={d.id} drama={d} onClick={(id) => window.location.hash = `#/details/${id}`} onFilter={() => window.location.hash = '#/search'} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NewReleases;
