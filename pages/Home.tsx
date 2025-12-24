
import React, { useState, useEffect } from 'react';
import { Drama } from '../types';
import { db } from '../services/db';
import VideoCard from '../components/VideoCard';
import { Icons } from '../components/Icons';

interface HomeProps {
  onSelectDrama: (id: string) => void;
  onFilter: (type: 'genre' | 'region' | 'search', val: string) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectDrama, onFilter }) => {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'Genre' | 'Region'>('Genre');
  const [siteSettings, setSiteSettings] = useState<any>(() => db.getSiteSettings());

  useEffect(() => {
    setDramas(db.getDramas());
    setGenres(db.getGenres().sort());
    setRegions(db.getRegions().sort());
    db.checkPremiumExpiries();
    setSiteSettings(db.getSiteSettings());
    const handler = () => setSiteSettings(db.getSiteSettings());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const hotDramas = dramas.filter(d => d.isHot);
  const newDramas = dramas.filter(d => d.isNew);
  const sulihDramas = dramas.filter(d => (d.genre || []).some(g => g.toLowerCase().includes('sulih')));
  const recentDramas = [...dramas].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const featuredDrama = ([...newDramas].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]) || recentDramas[0] || null;
  const carouselItems = (newDramas.length ? newDramas : recentDramas).slice(0, 6);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (carouselItems.length <= 1) return;
    const t = setInterval(() => {
      if (!isPaused) setSlideIndex(s => (s + 1) % carouselItems.length);
    }, 4000);
    return () => clearInterval(t);
  }, [carouselItems.length, isPaused]);

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Hero Carousel Section */}
      <section className="relative h-[420px] md:h-[520px] rounded-[2rem] overflow-hidden mb-12 shadow-2xl">
        <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} className="h-full w-full">
          <div className="h-full w-full flex transition-transform duration-700" style={{ transform: `translateX(-${slideIndex * 100}%)` }}>
            {carouselItems.map(item => (
              <div key={item.id} className="min-w-full h-full relative">
                <img src={item.thumbnail || "https://picsum.photos/seed/hero/1200/600"} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
                <div className="absolute left-6 md:left-12 top-1/3 max-w-3xl p-6 md:p-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-rose-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 tracking-widest uppercase">
                      <Icons.Zap className="w-3 h-3 fill-current" /> TOP SELECTION
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight tracking-tighter">{item.title}</h2>
                  <p className="text-slate-300 text-sm md:text-lg mb-6 line-clamp-2 max-w-lg">{item.description}</p>
                  <div className="flex gap-3">
                    <button onClick={() => onSelectDrama(item.id)} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl font-black">Watch</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {carouselItems.map((_, i) => (
              <button key={i} onClick={() => setSlideIndex(i)} className={`w-3 h-3 rounded-full ${i === slideIndex ? 'bg-rose-500' : 'bg-slate-700'}`} />
            ))}
          </div>

          {/* Prev/Next */}
          <button onClick={() => setSlideIndex(s => (s - 1 + carouselItems.length) % carouselItems.length)} className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-800/60 p-2 rounded-full">
            <Icons.ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button onClick={() => setSlideIndex(s => (s + 1) % carouselItems.length)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-800/60 p-2 rounded-full">
            <Icons.ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>


      {/* New Releases Section */}
      {newDramas.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
               <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                 <Icons.Zap className="text-amber-500 w-5 h-5 fill-current" />
               </div>
               New Releases
             </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {newDramas.map(drama => (
              <VideoCard key={drama.id} drama={drama} onClick={onSelectDrama} onFilter={onFilter} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
             <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
               <Icons.Flame className="text-rose-500 w-5 h-5 fill-current" />
             </div>
             Most Popular
           </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {hotDramas.slice(0, 5).map(drama => (
            <VideoCard key={drama.id} drama={drama} onClick={onSelectDrama} onFilter={onFilter} />
          ))}
        </div>
      </section>

      {/* Sulih Suara Section */}
      {sulihDramas.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
               <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                 <Icons.Zap className="text-violet-500 w-5 h-5 fill-current" />
               </div>
               Sulih Suara
             </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {sulihDramas.map(drama => (
              <VideoCard key={drama.id} drama={drama} onClick={onSelectDrama} onFilter={onFilter} />
            ))}
          </div>
        </section>
      )}

      {/* All Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
             <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
               <Icons.Film className="text-blue-500 w-5 h-5" />
             </div>
             Recommended
           </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {recentDramas.map(drama => (
            <VideoCard key={drama.id} drama={drama} onClick={onSelectDrama} onFilter={onFilter} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
