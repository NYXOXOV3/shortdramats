import React, { useEffect, useState } from 'react';
import { Drama, Episode, User } from '../types';
import { db } from '../services/db';
import { Icons } from '../components/Icons';

interface DramaDetailsProps {
  dramaId: string;
  user: User | null;
  onBack: () => void;
  onLogin: () => void;
  onUpgrade: () => void;
}

const DramaDetails: React.FC<DramaDetailsProps> = ({
  dramaId,
  user,
  onBack,
  onLogin,
  onUpgrade,
}) => {
  const [drama, setDrama] = useState<Drama | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  /* =========================
     LOAD DRAMA
  ========================= */
  useEffect(() => {
    const d = db.getDramas().find((x) => x.id === dramaId);
    if (!d) return;

    setDrama(d);

    const firstPlayable = d.episodes.findIndex(
      (ep) => !ep.isPremium || user?.isPremium
    );

    if (firstPlayable !== -1) {
      setSelectedIndex(firstPlayable);
      setActiveEpisode(d.episodes[firstPlayable]);
      setShowPaywall(false);
    } else {
      setActiveEpisode(null);
      setShowPaywall(true);
    }
  }, [dramaId, user]);

  /* =========================
     SELECT EPISODE
  ========================= */
  const selectEpisode = (index: number) => {
    if (!drama) return;

    const ep = drama.episodes[index];
    if (!ep) return;

    if (ep.isPremium && !user?.isPremium) {
      setShowPaywall(true);
      return;
    }

    setSelectedIndex(index);
    setActiveEpisode(ep);
    setShowPaywall(false);
  };

  const prevEpisode = () =>
    selectEpisode(Math.max(0, selectedIndex - 1));

  const nextEpisode = () =>
    selectEpisode(
      Math.min(drama!.episodes.length - 1, selectedIndex + 1)
    );

  if (!drama) {
    return (
      <div className="pt-32 text-center text-slate-400">
        Loading drama...
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ================= VIDEO AREA ================= */}
        <div className="lg:col-span-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <Icons.ChevronRight className="w-5 h-5 rotate-180" />
            Kembali
          </button>

          <div className="relative aspect-[9/16] md:aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800">

            {showPaywall ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur p-8 text-center">
                <Icons.Lock className="w-12 h-12 text-amber-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">
                  Episode Premium
                </h3>
                <p className="text-slate-400 mb-6">
                  Upgrade untuk membuka semua episode tanpa batas.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={onUpgrade}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-full font-bold"
                  >
                    Upgrade
                  </button>

                  {!user && (
                    <button
                      onClick={onLogin}
                      className="bg-slate-800 border border-slate-700 px-6 py-3 rounded-full text-white"
                    >
                      Login
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <video
                key={activeEpisode?.id}
                src={
                  activeEpisode?.videoUrl ||
                  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                }
                controls
                autoPlay
                poster={drama.thumbnail}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* ================= NAVIGATION ================= */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={prevEpisode}
              disabled={selectedIndex === 0}
              className="px-4 py-2 bg-slate-800/50 rounded-lg disabled:opacity-40"
            >
              ◀ Sebelumnya
            </button>

            <div className="text-center">
              <p className="font-bold text-white text-sm">
                Episode {drama.episodes[selectedIndex]?.order}
              </p>
              <p className="text-xs text-slate-400">
                {drama.episodes[selectedIndex]?.title}
              </p>
            </div>

            <button
              onClick={nextEpisode}
              disabled={selectedIndex === drama.episodes.length - 1}
              className="px-4 py-2 bg-rose-600 rounded-lg text-white disabled:opacity-40"
            >
              Selanjutnya ▶
            </button>
          </div>

          {/* ================= INFO ================= */}
          <div className="mt-8">
            <h1 className="text-3xl font-black text-white mb-2">
              {drama.title}
            </h1>

            <div className="flex gap-4 items-center mb-4">
              <span className="text-xs font-bold text-rose-500 uppercase">
                {drama.genre?.join(', ')}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase">
                {drama.region?.join(', ')}
              </span>
              <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                <Icons.Star className="w-4 h-4 fill-current" />
                {drama.rating.toFixed(1)}
              </span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              {drama.description}
            </p>
          </div>
        </div>

        {/* ================= EPISODE LIST ================= */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              Daftar Episode
            </h2>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {drama.episodes.map((ep, idx) => {
                const locked = ep.isPremium && !user?.isPremium;

                return (
                  <button
                    key={ep.id}
                    onClick={() => selectEpisode(idx)}
                    className={`relative h-11 rounded-lg font-bold text-sm border transition
                      ${
                        idx === selectedIndex
                          ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                          : 'bg-slate-800/40 border-transparent text-slate-400 hover:bg-slate-800'
                      }
                    `}
                  >
                    {ep.order}
                    {locked && (
                      <Icons.Lock className="w-3 h-3 absolute top-1 right-1 text-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {!user?.isPremium && (
              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600">
                <h4 className="font-black text-white mb-1">
                  AKSES UNLIMITED
                </h4>
                <p className="text-xs text-white/80 mb-4">
                  Semua episode tersedia tanpa batasan.
                </p>
                <button
                  onClick={onUpgrade}
                  className="w-full bg-white text-rose-600 py-2 rounded-xl font-bold"
                >
                  Upgrade Sekarang
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DramaDetails;
