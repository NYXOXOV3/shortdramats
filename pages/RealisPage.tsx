import React from 'react';
import { db } from '../services/db';

// "Realis" page - lists dramas grouped by director/creator if such meta exists.
// In this project there's no director field, so this page lists dramas grouped by region as a proxy.

const RealisPage: React.FC = () => {
  const dramas = db.getDramas();
  const regions = Array.from(new Set(dramas.flatMap(d => d.region || []))).sort();

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-4">Realis / Crew (by region)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regions.map(r => (
          <div key={r} className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-white mb-2">{r}</h3>
            <div className="text-slate-400 text-sm">
              {dramas.filter(d => d.region?.includes(r)).map(d => (
                <div key={d.id} className="flex items-center justify-between py-1">
                  <div>{d.title}</div>
                  <button onClick={() => window.location.hash = `#/details/${d.id}`} className="text-rose-500 font-bold text-sm">Tonton</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealisPage;
