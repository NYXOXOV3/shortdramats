
import React from 'react';
import { Drama } from '../types';
import { Icons } from './Icons';

interface VideoCardProps {
  drama: Drama;
  onClick: (id: string) => void;
  onFilter?: (type: 'genre' | 'region' | 'search', val: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ drama, onClick, onFilter }) => {
  return (
    <div className="group relative bg-slate-800/20 rounded-[2.5rem] overflow-hidden border border-slate-700/50 hover:border-rose-500 transition-all cursor-pointer shadow-2xl hover:-translate-y-2">
      <div className="aspect-[2/3] overflow-hidden relative" onClick={() => onClick(drama.id)}>
        <img 
          src={drama.thumbnail} 
          alt={drama.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {drama.isNew && (
            <div className="bg-amber-500 text-white text-[8px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xl uppercase tracking-widest animate-pulse">
              <Icons.Zap className="w-3 h-3 fill-current" /> NEW
            </div>
          )}
          {drama.isHot && (
            <div className="bg-rose-600 text-white text-[8px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xl uppercase tracking-widest">
              <Icons.Flame className="w-3 h-3 fill-current" /> HOT
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
           <button className="w-full bg-white text-slate-950 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 text-[10px] shadow-2xl uppercase tracking-widest">
            <Icons.Play className="w-4 h-4 fill-current" /> PLAY DRAMA
           </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap gap-1 mb-3">
          {drama.genre.map(g => (
            <button 
              key={g}
              onClick={(e) => { e.stopPropagation(); onFilter?.('genre', g); }}
              className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-2 py-0.5 rounded-md hover:bg-rose-500 hover:text-white transition-all"
            >
              {g}
            </button>
          ))}
        </div>
        
        <h3 className="font-bold text-slate-100 text-sm truncate group-hover:text-rose-400 transition-colors" onClick={() => onClick(drama.id)}>
          {drama.title}
        </h3>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-1 text-amber-500 text-[10px] font-black">
            <Icons.Star className="w-3 h-3 fill-current" /> {drama.rating.toFixed(1)}
          </div>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">
            {drama.episodes.length} Episodes
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
