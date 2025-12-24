
import React, { useState, useEffect } from 'react';
import { Drama, Episode, User, UserRole, SubscriptionRequest, SubscriptionPlan } from '../types';
import { db } from '../services/db';
import { geminiService } from '../services/gemini';
import { Icons } from '../components/Icons';

type Tab = 'content' | 'verification' | 'users' | 'plans' | 'categories' | 'gateway' | 'seo' | 'banner' | 'dramaapi' | 'melolo';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(() => db.getSiteSettings());
  
  const [isAddingDrama, setIsAddingDrama] = useState(false);
  const [editingDrama, setEditingDrama] = useState<Drama | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [newGenre, setNewGenre] = useState('');
  const [newRegion, setNewRegion] = useState('');

  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planFormData, setPlanFormData] = useState<Omit<SubscriptionPlan, 'id'>>({
    name: '', price: 0, duration: '', description: ''
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [gatewayConfig, setGatewayConfig] = useState<any>(db.getGatewayConfig());
  const [testAmount, setTestAmount] = useState<number>(5000);
  const [tripayLog, setTripayLog] = useState<any>(null);
  const [paydisiniLog, setPaydisiniLog] = useState<any>(null);
  const [staticQrUrl, setStaticQrUrl] = useState<string>('');

  // Drama API tester (DramaBox)
  const [dramaApiBase, setDramaApiBase] = useState<string>(() => {
    try { const c = localStorage.getItem('dramabox_config'); return c ? JSON.parse(c).base : 'https://dramabox.sansekai.my.id/api'; } catch { return 'https://dramabox.sansekai.my.id/api'; }
  });
  const [dramaEndpoint, setDramaEndpoint] = useState<string>('/dramabox/latest');
  const [paramClassify, setParamClassify] = useState('');
  const [paramPage, setParamPage] = useState('');
  const [paramQuery, setParamQuery] = useState('');
  const [paramBookId, setParamBookId] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);
  const [importResult, setImportResult] = useState<{added:number, skipped:number, errors:number} | null>(null);
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [rawArrayText, setRawArrayText] = useState<string>('');
  const [meloloRawText, setMeloloRawText] = useState<string>('');

  const saveDramaApiConfig = () => {
    try {
      localStorage.setItem('dramabox_config', JSON.stringify({ base: dramaApiBase }));
      alert('DramaBox config saved');
    } catch (e:any) { alert('Gagal menyimpan config: ' + (e?.message || e)); }
  };

  // Helpers for extracting and mapping episodes from pasted API JSON
  const extractEpisodesFromPayload = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    // check common keys
    const keys = ['episodes', 'chapterList', 'chapters', 'data', 'list', 'rows'];
    for (const k of keys) {
      if (Array.isArray(payload[k])) return payload[k];
    }
    if (typeof payload === 'object') {
      for (const k of Object.keys(payload)) {
        try {
          const v = payload[k];
          if (Array.isArray(v)) return v;
          if (typeof v === 'object') {
            const nested = extractEpisodesFromPayload(v);
            if (nested && nested.length) return nested;
          }
        } catch (e) { continue; }
      }
    }
    return [];
  };

  const mapEpisodeToLocal = (ep: any, idx: number) : Episode => {
    const getVideoUrlFromEpisode = (o:any): string => {
      if (!o) return '';
      const tryDecodeBase64 = (s:string) => {
        if (!s || typeof s !== 'string') return s;
        // quick base64 detection: typical base64 chars and length
        const maybe = s.replace(/\s+/g, '');
        if (/^[A-Za-z0-9+/=]+$/.test(maybe) && maybe.length % 4 === 0) {
          try {
            const dec = atob(maybe);
            if (typeof dec === 'string' && dec.startsWith('http')) return dec;
          } catch(e) { }
        }
        return s;
      };
      // prefer cdnList -> videoPathList (DramaBox format) when available
      try {
        if (o && Array.isArray(o.cdnList) && o.cdnList.length) {
          const cdnDefault = o.cdnList.find((c:any) => c.isDefault || c.is_default) || o.cdnList[0];
          if (cdnDefault) {
            const vlist = cdnDefault.videoPathList || cdnDefault.videoPath_list || cdnDefault.video_path_list || cdnDefault.videoPaths || cdnDefault.files || cdnDefault.video_list;
            if (Array.isArray(vlist) && vlist.length) {
              // prefer default entry, otherwise highest quality
              let chosen = vlist.find((x:any) => x.isDefault || x.is_default || x.isEntry) || vlist.slice().sort((a:any,b:any) => (b.quality||0) - (a.quality||0))[0];
              const path = chosen && (chosen.videoPath || chosen.video_path || chosen.file || chosen.url || chosen.path);
              if (typeof path === 'string' && path) return path;
            }
          }
        }
      } catch(e) {}

      const candidates = ['videoUrl','video_url','playUrl','play_url','file','files','videoPath','video_path','videoPathList','video_path_list','videoPaths','url','link','links','source','sources','stream','stream_url','m3u8','play','main_url','mainUrl','backup_url','backupUrl'];
      for (const k of candidates) {
        const v = o[k];
        if (!v) continue;
        if (typeof v === 'string' && v.trim()) return v.trim();
        if (typeof v === 'string' && v.trim()) {
          const maybe = tryDecodeBase64(v.trim());
          if (maybe && typeof maybe === 'string' && maybe.startsWith('http')) return maybe;
        }
        if (Array.isArray(v) && v.length) {
          const first = v[0];
          if (typeof first === 'string' && first.trim()) return first.trim();
          if (first && typeof first === 'object') {
            const inner = first.url || first.file || first.playUrl || first.file_url;
            if (inner && typeof inner === 'string') return inner;
          }
        }
        if (typeof v === 'object') {
          const inner = v.url || v.file || v.playUrl || v.play_url || v.file_url;
          if (inner && typeof inner === 'string') return inner;
        }
      }
      // fallback: search nested for any string that looks like a url
      const searchNested = (x:any): string | null => {
        if (!x) return null;
        if (typeof x === 'string' && x.startsWith('http')) return x;
        if (Array.isArray(x)) {
          for (const it of x) {
            const r = searchNested(it);
            if (r) return r;
          }
        }
        if (typeof x === 'object') {
          for (const k of Object.keys(x)) {
            try { const r = searchNested(x[k]); if (r) return r; } catch(e){ }
          }
        }
        return null;
      };
      const found = searchNested(o);
      if (found && typeof found === 'string') {
        const maybe = tryDecodeBase64(found);
        if (maybe && maybe.startsWith('http')) return maybe;
      }
      return found || '';
    };

    const epId = ep.chapterId || ep.chapter_id || ep.id || ep._id || ep.episodeId || ep.episode_id || `${Date.now()}-${idx}`;
    const orderNum = Number(ep.order || ep.index || idx + 1) || (idx + 1);
    let isPrem = !!(ep.isPremium || ep.premium || ep.paywall);
    if ((globalThis as any).__applyEpisodePricingFlag) {
      // fallback if component state not yet set in runtime tests
      if ((globalThis as any).__episodeFreeUpTo && orderNum <= Number((globalThis as any).__episodeFreeUpTo)) isPrem = false;
      if ((globalThis as any).__episodePremiumFrom && orderNum >= Number((globalThis as any).__episodePremiumFrom)) isPrem = true;
    }
    // component-local states (preferred when available)
    try {
      // @ts-ignore
      if (typeof applyEpisodePricing === 'boolean' && applyEpisodePricing) {
        if (episodeFreeUpTo && orderNum <= Number(episodeFreeUpTo)) isPrem = false;
        if (episodePremiumFrom && orderNum >= Number(episodePremiumFrom)) isPrem = true;
      }
    } catch (e) {}

    return {
      id: String(epId),
      title: ep.chapterName || ep.chapter_name || ep.title || ep.name || `Episode ${idx+1}`,
      videoUrl: getVideoUrlFromEpisode(ep) || '',
      duration: ep.duration || ep.time || '00:00',
      isPremium: isPrem,
      order: orderNum
    } as Episode;
  };

  const [episodeRawJson, setEpisodeRawJson] = useState<string>('');
  const [applyEpisodePricing, setApplyEpisodePricing] = useState<boolean>(false);
  const [episodeFreeUpTo, setEpisodeFreeUpTo] = useState<number>(0);
  const [episodePremiumFrom, setEpisodePremiumFrom] = useState<number>(0);

  const handleCallDramaApi = async () => {
    if (!dramaApiBase) return alert('Isi base URL dulu');
    let url = dramaApiBase.replace(/\/$/, '') + dramaEndpoint;
    const params = new URLSearchParams();
    if (dramaEndpoint.includes('/dubindo')) {
      if (paramClassify) params.set('classify', paramClassify);
      if (paramPage) params.set('page', paramPage);
    }
    if (dramaEndpoint.includes('/search')) {
      if (!paramQuery) return alert('Masukkan query untuk search');
      params.set('query', paramQuery);
    }
    if (dramaEndpoint.includes('/detail') || dramaEndpoint.includes('/allepisode')) {
      if (!paramBookId) return alert('Masukkan bookId');
      params.set('bookId', paramBookId);
    }
    if ([...params].length) url += '?' + params.toString();

    setApiResponse({ loading: true });
    try {
      const res = await fetch(url);
      const json = await res.json();
      setApiResponse(json);
    } catch (err:any) {
      setApiResponse({ error: String(err?.message || err) });
    }
  };

  const handleImportDramaApi = async () => {
    if (!apiResponse) return alert('Tidak ada data untuk diimport. Jalankan Test terlebih dahulu.');
    // try to find an array in the response (top-level or nested)
    let items: any[] = [];
    const findFirstArray = (obj: any): any[] | null => {
      if (!obj) return null;
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          try {
            const v = (obj as any)[k];
            if (Array.isArray(v)) return v;
            if (typeof v === 'object') {
              const found = findFirstArray(v);
              if (found) return found;
            }
          } catch (e) { continue; }
        }
      }
      return null;
    };

    const maybe = findFirstArray(apiResponse);
    // If top-level object contains drama data (detail endpoint), treat it as single-item array
    if (maybe) items = maybe;
    else if (apiResponse && (apiResponse.bookId || apiResponse.book_id || apiResponse.id || apiResponse.book || apiResponse.bookName || apiResponse.title)) items = [apiResponse];
    else return alert('Response tidak berformat array - tidak ada yang bisa diimport');

    setImporting(true);
    setImportResult(null);
    let added = 0, skipped = 0, errors = 0;
    const existing = db.getDramas();

    const findEpisodesArray = (obj: any): any[] | null => {
      if (!obj) return null;
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object') {
        // common keys for episode lists
        const keys = ['episodes', 'chapterList', 'chapters', 'data', 'list', 'rows'];
        for (const k of keys) {
          if (Array.isArray(obj[k])) return obj[k];
        }
        for (const k of Object.keys(obj)) {
          try {
            const v = obj[k];
            if (Array.isArray(v)) return v;
            if (typeof v === 'object') {
              const found = findEpisodesArray(v);
              if (found) return found;
            }
          } catch (e) { continue; }
        }
      }
      return null;
    };

    const mapEpisode = (ep: any, idx: number) => {
      return mapEpisodeToLocal(ep, idx) as any;
    };

    // detect if items are episode objects (not dramas) by inspecting first element
    const first = items[0];
    const looksLikeEpisode = (o: any) => {
      if (!o || typeof o !== 'object') return false;
      return !!(o.chapterId || o.chapter_id || o.episodeId || o.episode_id || o.videoUrl || o.video_url || o.url) && !!(o.bookId || o.book_id || paramBookId);
    };

    if (looksLikeEpisode(first)) {
      // Group episodes by bookId and attach to dramas
      const groups: Record<string, any[]> = {};
      for (const ep of items) {
        const bid = String(ep.bookId || ep.book_id || paramBookId || 'unknown');
        groups[bid] = groups[bid] || [];
        groups[bid].push(ep);
      }

      for (const bid of Object.keys(groups)) {
        try {
          const group = groups[bid];
          const existingDrama = existing.find(d => d.id === bid);
            if (existingDrama) {
            // merge episodes (avoid duplicates)
            const existingEpIds = new Set(existingDrama.episodes?.map((e:any) => e.id));
            const mapped = group.map((g, i) => mapEpisode(g, i)).filter((m:any) => !existingEpIds.has(m.id));
            existingDrama.episodes = [...(existingDrama.episodes || []), ...mapped];
            db.saveDrama(existingDrama as any);
            added += mapped.length;
          } else {
            const titleGuess = group[0].bookName || group[0].book_name || `Drama ${bid}`;
            // detect tags and override for Sulih Suara
            const tagCandidates: string[] = [];
            if (group[0].bookName) tagCandidates.push(String(group[0].bookName));
            if (group[0].book_name) tagCandidates.push(String(group[0].book_name));
            if (group[0].corner && group[0].corner.name) tagCandidates.push(String(group[0].corner.name));
            if (Array.isArray(group[0].tags)) tagCandidates.push(...group[0].tags.map((t:any) => typeof t === 'string' ? t : (t.name || '')));
            if (Array.isArray(group[0].tagV3s)) tagCandidates.push(...group[0].tagV3s.map((t:any) => t.tagName || t.name || ''));
            const tagText = tagCandidates.join(' ').toLowerCase();
            let genreArr: string[] = [];
            if (tagText.includes('sulih')) {
              genreArr = ['Sulih Suara'];
            }
            const drama = {
              id: bid,
              title: titleGuess,
              description: group[0].introduction || group[0].desc || '',
              thumbnail: group[0].cover || group[0].coverWap || '',
              genre: genreArr,
              region: [], views: 0, rating: 5.0,
              episodes: group.map((g,i) => mapEpisode(g,i)),
              isHot: tagText.includes('terpopuler') ? true : false,
              isNew: tagText.includes('baru') ? true : false,
              isPremiumDrama: false,
              createdAt: new Date().toISOString()
            } as any;
            // if Sulih Suara set flags appropriately
            if (tagText.includes('sulih')) { drama.isNew = false; drama.isHot = false; }
            db.saveDrama(drama);
            added++;
          }
        } catch (e) { errors++; }
      }

      refreshData();
      setImporting(false);
      setImportResult({ added, skipped, errors });
      alert(`Import selesai. Added episodes/groups: ${added}, Skipped: ${skipped}, Errors: ${errors}`);
      return;
    }

    // Otherwise treat each item as a drama-like object
    for (const it of items) {
      try {
        const bookId = it.bookId || it.book_id || it.id || it._id || (it.book && it.book.id);
        if (!bookId) { errors++; continue; }
        const idStr = String(bookId);
        const titleCandidate = it.title || it.name || it.bookName || it.book_name;
        const exists = existing.find(d => d.id === idStr || (titleCandidate && d.title === titleCandidate));
        if (exists && skipExisting) { skipped++; continue; }

        const episodesArray = findEpisodesArray(it) || [];
        const mappedEpisodes = Array.isArray(episodesArray) ? episodesArray.map((e:any, i:number) => mapEpisode(e, i)) : [];

        // compute genre and special tag handling (e.g., Sulih Suara)
        const computedGenres: string[] = ((): string[] => {
          if (it.genre) return Array.isArray(it.genre) ? it.genre : [String(it.genre)];
          if (it.tags && Array.isArray(it.tags)) return it.tags.map((t:any) => typeof t === 'string' ? t : (t.name || String(t)));
          if (it.tagV3s && Array.isArray(it.tagV3s)) return it.tagV3s.map((t:any) => t.tagName || t.name || String(t));
          return [];
        })();
        const tagCandidates: string[] = [];
        if (it.bookName) tagCandidates.push(String(it.bookName));
        if (it.book_name) tagCandidates.push(String(it.book_name));
        if (it.corner && it.corner.name) tagCandidates.push(String(it.corner.name));
        if (Array.isArray(it.tags)) tagCandidates.push(...it.tags.map((t:any)=> typeof t === 'string' ? t : (t.name||'')));
        if (Array.isArray(it.tagV3s)) tagCandidates.push(...it.tagV3s.map((t:any)=> t.tagName || t.name || ''));
        const tagText = tagCandidates.join(' ').toLowerCase();
        let genreArr = computedGenres;
        if (tagText.includes('sulih')) {
          genreArr = ['Sulih Suara'];
        }

        const drama = {
          id: idStr,
          title: it.title || it.name || it.bookName || it.book_name || 'Untitled',
          description: it.desc || it.description || it.synopsis || it.introduction || it.summary || '',
          thumbnail: it.cover || it.thumbnail || it.thumb || it.image || it.coverWap || it.cover_wap || '',
          genre: genreArr,
          region: it.region ? (Array.isArray(it.region) ? it.region : [String(it.region)]) : [],
          views: parseInt(it.views || it.view || it.view_count || 0) || 0,
          rating: parseFloat(it.rating || 5.0) || 5.0,
          episodes: mappedEpisodes,
          isHot: tagText.includes('terpopuler') ? true : !!(it.isHot || it.hot),
          isNew: tagText.includes('baru') ? true : !!(it.isNew || it.new),
          isPremiumDrama: !!(it.isPremiumDrama || it.premium),
          createdAt: new Date().toISOString(),
        } as any;
        if (tagText.includes('sulih')) { drama.isNew = false; drama.isHot = false; }

        // If drama exists and skipExisting=false, merge episodes
        if (exists && !skipExisting) {
          const existingEpIds = new Set((exists.episodes || []).map((e:any) => e.id));
          exists.episodes = [...(exists.episodes || []), ...drama.episodes.filter((e:any) => !existingEpIds.has(e.id))];
          db.saveDrama(exists as any);
          added++;
        } else {
          db.saveDrama(drama as any);
          added++;
        }
      } catch (e) {
        errors++;
      }
    }

    refreshData();
    setImporting(false);
    setImportResult({ added, skipped, errors });
    alert(`Import selesai. Added: ${added}, Skipped: ${skipped}, Errors: ${errors}`);
  };

  const [formData, setFormData] = useState({
    title: '', 
    description: '', 
    genre: [] as string[], 
    region: [] as string[],
    thumbnail: '', 
    rating: 5.0,
    isHot: false, 
    isNew: true,
    isPremiumDrama: false,
    episodes: [] as Episode[]
  });

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    setEditingUserPassword('');
  }, [editingUser]);

  const refreshData = () => {
    setDramas(db.getDramas());
    setUsers(db.getUsers());
    setRequests(db.getRequests().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setPlans(db.getPlans());
    setAvailableGenres(db.getGenres().sort());
    setAvailableRegions(db.getRegions().sort());
  };

  const handleApprove = (reqId: string) => {
    if (confirm('Approve pembayaran ini dan upgrade status user?')) {
      db.updateRequestStatus(reqId, 'APPROVED');
      refreshData();
      alert('Berhasil! Status user telah di-upgrade.');
    }
  };

  const handleAddEpisode = () => {
    const newEp: Episode = {
      id: Date.now().toString(),
      title: `Episode ${formData.episodes.length + 1}`,
      videoUrl: '',
      duration: '02:00',
      isPremium: formData.episodes.length >= 3,
      order: formData.episodes.length + 1
    };
    setFormData({ ...formData, episodes: [...formData.episodes, newEp] });
  };

  const handleSubmitDrama = (e: React.FormEvent) => {
    e.preventDefault();
    const newDrama: Drama = {
      id: editingDrama ? editingDrama.id : Date.now().toString(),
      ...formData,
      views: editingDrama ? editingDrama.views : 0,
      createdAt: editingDrama ? editingDrama.createdAt : new Date().toISOString()
    };
    db.saveDrama(newDrama);
    refreshData();
    setIsAddingDrama(false);
    setEditingDrama(null);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const userToSave = { ...editingUser, password: editingUserPassword ? editingUserPassword : editingUser.password };
      db.saveUser(userToSave as any);
      setEditingUser(null);
      refreshData();
    }
  };

  const handleSubmitPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan: SubscriptionPlan = {
      id: editingPlan ? editingPlan.id : Date.now().toString(),
      name: planFormData.name,
      price: planFormData.price,
      duration: planFormData.duration,
      description: planFormData.description
    };
    db.savePlan(newPlan);
    setIsAddingPlan(false);
    setEditingPlan(null);
    refreshData();
  };

  const handleCategoryAction = (type: 'genre' | 'region', name: string, action: 'add' | 'remove') => {
    if (action === 'add') {
      if (type === 'genre') db.addGenre(name);
      else db.addRegion(name);
    } else {
      if (confirm(`Hapus ${type} ini?`)) {
        if (type === 'genre') db.removeGenre(name);
        else db.removeRegion(name);
      }
    }
    refreshData();
    setNewGenre('');
    setNewRegion('');
  };

  const toggleSelection = (list: string[], val: string) => {
    return list.includes(val) ? list.filter(v => v !== val) : [...list, val];
  };

  const handleGenerateDescription = async () => {
    if (!formData.title) return alert("Masukkan judul dulu!");
    setAiGenerating(true);
    const genreText = formData.genre.join(', ') || 'drama';
    const desc = await geminiService.generateDramaDescription(formData.title, genreText);
    setFormData(prev => ({ ...prev, description: desc }));
    setAiGenerating(false);
  };

  const NavTab = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-bold transition-all border-b-2 whitespace-nowrap ${
        activeTab === id ? 'border-rose-500 text-rose-500 bg-rose-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Panel Administrator</h1>
        <p className="text-slate-400">Pusat kendali operasional DramaShort.</p>
      </div>

      <div className="flex border-b border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
        <NavTab id="content" label="Konten" icon={Icons.Film} />
        <NavTab id="verification" label="Verifikasi Bayar" icon={Icons.Zap} />
        <NavTab id="users" label="Data User" icon={Icons.Users} />
        <NavTab id="plans" label="Paket Langganan" icon={Icons.Settings} />
        <NavTab id="categories" label="Kategori" icon={Icons.Menu} />
        <NavTab id="gateway" label="Gateway" icon={Icons.Lock} />
        <NavTab id="dramaapi" label="Drama API" icon={Icons.Settings} />
        <NavTab id="melolo" label="Melolo API" icon={Icons.LayoutDashboard} />
        <NavTab id="seo" label="SEO & Branding" icon={Icons.Edit} />
      </div>

      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 gap-10 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">Pengaturan SEO & Branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nama Website</label>
                <input value={siteSettings.siteName || ''} onChange={e=>setSiteSettings({...siteSettings, siteName: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Logo URL</label>
                <input value={siteSettings.logoUrl || ''} onChange={e=>setSiteSettings({...siteSettings, logoUrl: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Keyword (pisahkan dengan koma)</label>
                <input value={Array.isArray(siteSettings.keywords) ? siteSettings.keywords.join(', ') : (siteSettings.keywords || '')} onChange={e=>setSiteSettings({...siteSettings, keywords: e.target.value.split(',').map((x:string)=>x.trim()).filter(Boolean)})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Footer Text/HTML</label>
                <textarea rows={4} value={siteSettings.footerText || ''} onChange={e=>setSiteSettings({...siteSettings, footerText: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Livechat Embed HTML</label>
                <textarea rows={4} value={siteSettings.livechatEmbedHtml || ''} onChange={e=>setSiteSettings({...siteSettings, livechatEmbedHtml: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"></textarea>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">WhatsApp Admin</label>
                <input placeholder="62812xxxxxxx" value={siteSettings.whatsappAdmin || ''} onChange={e=>setSiteSettings({...siteSettings, whatsappAdmin: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">API Base URL</label>
                <input placeholder="https://domain-serverless.com" value={siteSettings.apiBaseUrl || ''} onChange={e=>setSiteSettings({...siteSettings, apiBaseUrl: e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>db.setSiteSettings(siteSettings)} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl font-bold">Simpan Pengaturan</button>
              <button onClick={()=>setSiteSettings(db.getSiteSettings())} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold border border-slate-700">Reset</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Kelola Genre</h3>
            <div className="flex gap-2 mb-6">
              <input value={newGenre} onChange={e=>setNewGenre(e.target.value)} placeholder="Genre baru..." className="flex-1 bg-slate-800 p-3 rounded-xl outline-none" />
              <button onClick={() => handleCategoryAction('genre', newGenre, 'add')} className="bg-rose-600 px-6 rounded-xl font-bold">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map(g => (
                <div key={g} className="bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-700">
                  <span className="text-sm">{g}</span>
                  <button onClick={() => handleCategoryAction('genre', g, 'remove')}><Icons.X className="w-3 h-3 text-slate-500 hover:text-rose-500" /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Kelola Region</h3>
            <div className="flex gap-2 mb-6">
              <input value={newRegion} onChange={e=>setNewRegion(e.target.value)} placeholder="Region baru..." className="flex-1 bg-slate-800 p-3 rounded-xl outline-none" />
              <button onClick={() => handleCategoryAction('region', newRegion, 'add')} className="bg-rose-600 px-6 rounded-xl font-bold">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableRegions.map(r => (
                <div key={r} className="bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-700">
                  <span className="text-sm">{r}</span>
                  <button onClick={() => handleCategoryAction('region', r, 'remove')}><Icons.X className="w-3 h-3 text-slate-500 hover:text-rose-500" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Daftar Drama</h2>
            <button onClick={() => { setIsAddingDrama(true); setEditingDrama(null); setFormData({ title: '', description: '', genre: [], region: [], thumbnail: '', rating: 5.0, isHot: false, isNew: true, isPremiumDrama: false, episodes: [] }); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all hover:bg-rose-500">
              <Icons.Plus className="w-4 h-4" /> Tambah Drama
            </button>
          </div>
          
          {isAddingDrama ? (
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 animate-in zoom-in duration-300">
               <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest">{editingDrama ? 'Edit Drama' : 'Drama Baru'}</h3>
               <form onSubmit={handleSubmitDrama} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Judul Drama</label>
                      <input placeholder="Judul..." value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl outline-none text-sm" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Genre (Multi-select)</label>
                        <div className="bg-slate-800 border border-slate-700 p-2 rounded-xl flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                          {availableGenres.map(g => (
                            <button key={g} type="button" onClick={() => setFormData({...formData, genre: toggleSelection(formData.genre, g)})} className={`px-2 py-1 rounded text-[10px] font-bold ${formData.genre.includes(g) ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Region (Multi-select)</label>
                        <div className="bg-slate-800 border border-slate-700 p-2 rounded-xl flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                          {availableRegions.map(r => (
                            <button key={r} type="button" onClick={() => setFormData({...formData, region: toggleSelection(formData.region, r)})} className={`px-2 py-1 rounded text-[10px] font-bold ${formData.region.includes(r) ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">URL Thumbnail</label>
                        <input value={formData.thumbnail} onChange={e=>setFormData({...formData, thumbnail:e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Rating (0-5)</label>
                        <input type="number" step="0.1" max="5" min="0" value={formData.rating} onChange={e=>setFormData({...formData, rating: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-xs" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Sinopsis AI</label>
                        <button type="button" onClick={handleGenerateDescription} disabled={aiGenerating} className="text-[10px] text-rose-500 font-bold underline">
                          {aiGenerating ? 'Generating...' : 'AI Generate'}
                        </button>
                      </div>
                      <textarea value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl min-h-[80px] text-xs" />
                    </div>

                    <div className="flex flex-wrap gap-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.isHot} onChange={e=>setFormData({...formData, isHot:e.target.checked})} className="accent-rose-500" /> 
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Trending</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.isNew} onChange={e=>setFormData({...formData, isNew:e.target.checked})} className="accent-amber-500" /> 
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">New Release</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.isPremiumDrama} onChange={e=>setFormData({...formData, isPremiumDrama:e.target.checked})} className="accent-rose-500" /> 
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Full Premium</span>
                      </label>
                    </div>
                 </div>

                 <div className="space-y-4">
                   {/* Episode import helper for admins: paste JSON of episodes and load */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Import Episodes (paste JSON)</label>
                    <textarea rows={4} value={episodeRawJson} onChange={e=>setEpisodeRawJson(e.target.value)} className="w-full bg-slate-900 p-3 rounded-xl text-sm" placeholder="Paste episodes array or object containing episodes here..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={applyEpisodePricing} onChange={e=>setApplyEpisodePricing(e.target.checked)} className="accent-rose-500" /> Apply pricing range</label>
                        <div className="text-[12px] text-slate-400">(mark episodes as free/premium by range)</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[12px] text-slate-400">Free up to</label>
                        <input type="number" min={0} value={episodeFreeUpTo || ''} onChange={e=>setEpisodeFreeUpTo(parseInt(e.target.value||'0')||0)} className="w-20 bg-slate-900 p-2 rounded-xl text-sm" />
                        <label className="text-[12px] text-slate-400">Premium from</label>
                        <input type="number" min={0} value={episodePremiumFrom || ''} onChange={e=>setEpisodePremiumFrom(parseInt(e.target.value||'0')||0)} className="w-20 bg-slate-900 p-2 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => {
                        try {
                          const parsed = JSON.parse(episodeRawJson);
                          const found = extractEpisodesFromPayload(parsed);
                          if (!found || found.length === 0) return alert('Tidak menemukan array episode dalam JSON tersebut.');
                          const mapped = found.map((e:any, i:number) => mapEpisodeToLocal(e, i));
                          // append by default
                          setFormData(prev => ({ ...prev, episodes: [...(prev.episodes||[]), ...mapped] }));
                          setEpisodeRawJson('');
                          alert(`Berhasil menambahkan ${mapped.length} episode (ditambahkan ke daftar saat ini).`);
                        } catch (e:any) { alert('JSON invalid: ' + (e?.message||e)); }
                      }} className="bg-rose-600 px-4 py-2 rounded-xl font-bold">Load Episodes</button>
                      <button type="button" onClick={() => { setEpisodeRawJson(''); }} className="bg-slate-800 px-4 py-2 rounded-xl">Clear</button>
                      <button type="button" onClick={() => { setFormData(prev => ({ ...prev, episodes: [] })); }} className="bg-amber-500 px-4 py-2 rounded-xl font-bold">Clear Episodes</button>
                    </div>
                  </div>
                    <div className="flex justify-between items-center"><h4 className="font-bold text-white text-sm">Episode ({formData.episodes.length})</h4><button type="button" onClick={handleAddEpisode} className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">+ Tambah</button></div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {formData.episodes.map((ep, idx) => (
                        <div key={ep.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between gap-2">
                          <input placeholder="Judul" value={ep.title} onChange={e => setFormData({...formData, episodes: formData.episodes.map(x=>x.id===ep.id?{...x, title:e.target.value}:x)})} className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] flex-1" />
                          <input placeholder="Video URL" value={ep.videoUrl} onChange={e => setFormData({...formData, episodes: formData.episodes.map(x=>x.id===ep.id?{...x, videoUrl:e.target.value}:x)})} className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-[10px] flex-1" />
                          <label className="flex flex-col items-center"><span className="text-[8px] font-bold text-slate-500">Premium</span><input type="checkbox" checked={ep.isPremium} onChange={e => setFormData({...formData, episodes: formData.episodes.map(x=>x.id===ep.id?{...x, isPremium:e.target.checked}:x)})} className="w-3 h-3" /></label>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-slate-800">
                      <button type="submit" className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black shadow-lg shadow-rose-600/20">SIMPAN DRAMA</button>
                      <button type="button" onClick={()=>setIsAddingDrama(false)} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold">BATAL</button>
                    </div>
                 </div>
               </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dramas.map(d => (
                <div key={d.id} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex gap-4 transition-all hover:border-slate-600">
                  <img src={d.thumbnail} className="w-20 h-28 object-cover rounded-xl shadow-lg" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white truncate text-sm">{d.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{(d.genre || []).join(', ')} • {(d.region || []).join(', ')}</p>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px] mt-1">
                        <Icons.Star className="w-3 h-3 fill-current" /> {d.rating}
                      </div>
                    </div>
                    <div className="flex gap-4 border-t border-slate-800 pt-3">
                      <button onClick={() => {setEditingDrama(d); setFormData(d); setIsAddingDrama(true);}} className="text-xs text-rose-500 font-bold underline">Edit</button>
                      <button onClick={() => {if(confirm('Hapus drama ini?')) { db.deleteDrama(d.id); refreshData(); }}} className="text-xs text-slate-500 font-bold underline hover:text-rose-500">Hapus</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
          <form
            onSubmit={(e) => { e.preventDefault(); db.setGatewayConfig(gatewayConfig); alert('Konfigurasi disimpan'); }}
            className="bg-slate-900 p-8 rounded-3xl border border-slate-800"
          >
            <h3 className="text-lg font-bold text-white mb-6">Konfigurasi Payment Gateway</h3>
            <div className="space-y-6">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Tripay</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="API Key"
                    value={gatewayConfig.tripay?.apiKey || ''}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, tripay: { ...gatewayConfig.tripay, apiKey: e.target.value } })}
                    className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"
                  />
                  <input
                    placeholder="Private Key"
                    value={gatewayConfig.tripay?.privateKey || ''}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, tripay: { ...gatewayConfig.tripay, privateKey: e.target.value } })}
                    className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"
                  />
                  <input
                    placeholder="Merchant Code"
                    value={gatewayConfig.tripay?.merchantCode || ''}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, tripay: { ...gatewayConfig.tripay, merchantCode: e.target.value } })}
                    className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"
                  />
                  <select
                    value={gatewayConfig.tripay?.mode || 'sandbox'}
                    onChange={e => setGatewayConfig({ ...gatewayConfig, tripay: { ...gatewayConfig.tripay, mode: e.target.value } })}
                    className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">Paydisini</div>
                <input
                  placeholder="API Key"
                  value={gatewayConfig.paydisini?.apiKey || ''}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, paydisini: { ...gatewayConfig.paydisini, apiKey: e.target.value } })}
                  className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm w-full"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-3">QRIS Static</div>
                <input
                  placeholder="URL Gambar QRIS Static"
                  value={gatewayConfig.qris?.staticUrl || ''}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, qris: { staticUrl: e.target.value } })}
                  className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm w-full"
                />
              </div>
              <button type="submit" className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black">Simpan Konfigurasi</button>
            </div>
          </form>
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6">Testing</h3>
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Nominal Test</label>
                  <input type="number" value={testAmount} onChange={e=>setTestAmount(parseInt(e.target.value || '0'))} className="bg-slate-800 border border-slate-700 p-3 rounded-xl w-full" />
                </div>
                <div className="flex items-end gap-3">
                  <button
                    onClick={async () => {
                      const { payments } = await import('../services/payments');
                      const res = await payments.createTripayTransaction({
                        method: 'QRIS',
                        amount: testAmount,
                        customer_name: 'Admin Test',
                        customer_email: 'admin@example.com',
                        merchant_ref: `TEST-${Date.now()}`,
                        credentials: gatewayConfig.tripay
                      });
                      setTripayLog(res);
                      if ((res as any)?.data?.checkout_url) window.open((res as any).data.checkout_url, '_blank');
                    }}
                    className="bg-rose-600 text-white px-4 py-3 rounded-xl font-black"
                  >
                    Test Tripay
                  </button>
                  <button
                    onClick={async () => {
                      const { payments } = await import('../services/payments');
                      const res = await payments.createPaydisiniTransaction({
                        unique_code: `TEST-${Date.now()}`,
                        service: 'QRIS',
                        amount: testAmount,
                        note: 'Admin Test',
                        return_url: window.location.origin,
                        callback_url: window.location.origin,
                        credentials: gatewayConfig.paydisini
                      });
                      setPaydisiniLog(res);
                      const url = (res?.data?.payment_url || res?.data?.checkout_url);
                      if (url) window.open(url, '_blank');
                    }}
                    className="bg-amber-500 text-white px-4 py-3 rounded-xl font-black"
                  >
                    Test Paydisini
                  </button>
                  <button
                    onClick={() => {
                      setStaticQrUrl(gatewayConfig.qris?.staticUrl || '');
                    }}
                    className="bg-slate-800 text-white px-4 py-3 rounded-xl font-black border border-slate-700"
                  >
                    Generate QR Static
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-300">Tripay</div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${gatewayConfig.tripay?.apiKey && gatewayConfig.tripay?.privateKey && gatewayConfig.tripay?.merchantCode ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {gatewayConfig.tripay?.apiKey && gatewayConfig.tripay?.privateKey && gatewayConfig.tripay?.merchantCode ? 'Siap' : 'Belum Lengkap'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-300">Paydisini</div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${gatewayConfig.paydisini?.apiKey ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {gatewayConfig.paydisini?.apiKey ? 'Siap' : 'Belum Lengkap'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-300">QRIS Static</div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${gatewayConfig.qris?.staticUrl ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {gatewayConfig.qris?.staticUrl ? 'Siap' : 'Belum Lengkap'}
                </span>
              </div>
              {tripayLog && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 mb-2">Tripay Response</div>
                  <pre className="text-[10px] text-slate-300 overflow-x-auto">{JSON.stringify(tripayLog, null, 2)}</pre>
                </div>
              )}
              {paydisiniLog && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 mb-2">Paydisini Response</div>
                  <pre className="text-[10px] text-slate-300 overflow-x-auto">{JSON.stringify(paydisiniLog, null, 2)}</pre>
                </div>
              )}
              {staticQrUrl && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
                  <img src={staticQrUrl} className="w-40 h-40 rounded-xl border border-slate-700 bg-white p-2" />
                  <div className="text-slate-300 text-sm font-bold">Rp {testAmount.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dramaapi' && (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Drama API — Paste Raw Data</h3>
            <p className="text-slate-400 text-sm mb-4">Hapus tester — cukup paste raw JSON/object atau raw ARRAY lalu tekan <strong>Load</strong> dan <strong>Import</strong>.</p>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Paste raw JSON / object</label>
              <textarea value={rawJsonText} onChange={e=>setRawJsonText(e.target.value)} rows={6} className="w-full bg-slate-800 p-3 rounded-xl text-sm" placeholder='Paste single JSON object here...' />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { try { const parsed = JSON.parse(rawJsonText); setApiResponse(parsed); setImportResult(null); alert('JSON parsed, ready.'); } catch (e:any){ alert('Invalid JSON: '+(e?.message||e)); } }} className="bg-amber-500 px-4 py-2 rounded-xl font-bold">Load JSON</button>
                <button onClick={() => { setRawJsonText(''); setApiResponse(null); setImportResult(null); }} className="bg-slate-800 px-4 py-2 rounded-xl">Clear</button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Paste raw ARRAY</label>
              <textarea value={rawArrayText || ''} onChange={e=>setRawArrayText(e.target.value)} rows={6} className="w-full bg-slate-800 p-3 rounded-xl text-sm" placeholder='Paste JSON array here...' />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { try { const parsed = JSON.parse(rawArrayText || ''); setApiResponse(parsed); setImportResult(null); alert('Array parsed, ready.'); } catch (e:any){ alert('Invalid JSON array: '+(e?.message||e)); } }} className="bg-amber-500 px-4 py-2 rounded-xl font-bold">Load Array</button>
                <button onClick={() => { setRawArrayText(''); setApiResponse(null); setImportResult(null); }} className="bg-slate-800 px-4 py-2 rounded-xl">Clear</button>
              </div>
            </div>

            {/* Melolo paste moved to its own tab */}

            <div className="flex items-center gap-3">
              <button onClick={async () => { await handleImportDramaApi(); }} disabled={importing || !apiResponse} className="bg-rose-600 px-4 py-2 rounded-xl font-bold">{importing ? 'Importing...' : 'Import'}</button>
            </div>

            {apiResponse && (
              <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                <div className="text-xs text-slate-400 mb-2">Response (truncated):</div>
                <pre className="text-[12px] whitespace-pre-wrap max-h-72 overflow-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
              </div>
            )}
            {importResult && (
              <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                <div className="font-bold text-white mb-2">Import Result</div>
                <div className="text-slate-300">Added: {importResult.added} — Skipped: {importResult.skipped} — Errors: {importResult.errors}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'melolo' && (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Melolo API — Paste Raw Data</h3>
            <p className="text-slate-400 text-sm mb-4">Paste raw Melolo JSON/object (must contain <strong>books</strong> array) or paste an array directly. Press <strong>Load Melolo</strong> to load into the importer.</p>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Paste Melolo JSON / object</label>
              <textarea value={meloloRawText} onChange={e=>setMeloloRawText(e.target.value)} rows={6} className="w-full bg-slate-800 p-3 rounded-xl text-sm" placeholder='Paste Melolo JSON/object here (will look for books[])' />
              <div className="flex gap-2 mt-2">
                <button onClick={() => {
                  try {
                    const parsed = JSON.parse(meloloRawText || '');
                    if (parsed && Array.isArray(parsed.books)) {
                      setApiResponse(parsed.books);
                      setImportResult(null);
                      alert('Melolo books[] parsed and loaded as array.');
                    } else if (Array.isArray(parsed)) {
                      setApiResponse(parsed);
                      setImportResult(null);
                      alert('Parsed array loaded.');
                    } else {
                      alert('JSON parsed but no books[] array found. Paste object containing a books array or an array.');
                    }
                  } catch (e:any) { alert('Invalid JSON: ' + (e?.message||e)); }
                }} className="bg-amber-500 px-4 py-2 rounded-xl font-bold">Load Melolo</button>
                <button onClick={() => { setMeloloRawText(''); setApiResponse(null); setImportResult(null); }} className="bg-slate-800 px-4 py-2 rounded-xl">Clear</button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={async () => { await handleImportDramaApi(); }} disabled={importing || !apiResponse} className="bg-rose-600 px-4 py-2 rounded-xl font-bold">{importing ? 'Importing...' : 'Import'}</button>
            </div>

            {apiResponse && (
              <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                <div className="text-xs text-slate-400 mb-2">Response (truncated):</div>
                <pre className="text-[12px] whitespace-pre-wrap max-h-72 overflow-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
              </div>
            )}
            {importResult && (
              <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                <div className="font-bold text-white mb-2">Import Result</div>
                <div className="text-slate-300">Added: {importResult.added} — Skipped: {importResult.skipped} — Errors: {importResult.errors}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              <tr><th className="px-6 py-5">User Account</th><th className="px-6 py-5">Plan Detail</th><th className="px-6 py-5">Total Paid</th><th className="px-6 py-5">Status</th><th className="px-6 py-5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold text-white">{req.userName}</div>
                    <div className="text-[10px] text-slate-500">{req.userEmail}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-300">{req.planName}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{req.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-5 font-black text-rose-500">Rp {req.amount.toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full ${req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {req.status === 'PENDING' && (
                      <button 
                        onClick={() => handleApprove(req.id)} 
                        className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-600/20"
                      >
                        APPROVE & UPGRADE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <div className="py-32 text-center text-slate-500 italic font-bold">Tidak ada antrean pembayaran.</div>}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl animate-in slide-in-from-right duration-500">
           {editingUser ? (
             <div className="p-8 animate-in zoom-in duration-300">
               <h3 className="font-black text-white text-xl mb-6">Modify Account: {editingUser.name}</h3>
               <form onSubmit={handleUpdateUser} className="grid grid-cols-2 gap-6">
                 <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Full Name</label><input value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name:e.target.value})} className="w-full bg-slate-800 p-3 rounded-xl text-sm" /></div>
                 <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Email</label><input value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email:e.target.value})} className="w-full bg-slate-800 p-3 rounded-xl text-sm" /></div>
                 <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Role</label><select value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role:e.target.value as any})} className="w-full bg-slate-800 p-3 rounded-xl text-sm"><option value={UserRole.USER}>User</option><option value={UserRole.ADMIN}>Admin</option></select></div>
                 <div><label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Premium Status</label><select value={editingUser.isPremium ? 'true' : 'false'} onChange={e=>setEditingUser({...editingUser, isPremium:e.target.value === 'true'})} className="w-full bg-slate-800 p-3 rounded-xl text-sm"><option value="false">Free Access</option><option value="true">Premium Access</option></select></div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Password (kosong = tidak diubah)</label>
                   <input type="password" value={editingUserPassword} onChange={e=>setEditingUserPassword(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-sm" placeholder="Isi jika ingin reset password" />
                 </div>
                 <div className="col-span-2 flex gap-4 mt-4">
                   <button type="submit" className="flex-1 bg-rose-600 p-3 rounded-xl font-black text-white">UPDATE USER</button>
                   <button type="button" onClick={()=>setEditingUser(null)} className="flex-1 bg-slate-800 p-3 rounded-xl font-bold text-white">CANCEL</button>
                 </div>
               </form>
             </div>
           ) : (
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                 <tr><th className="px-6 py-4">Account Holder</th><th className="px-6 py-4">Current Status</th><th className="px-6 py-4">Expiry</th><th className="px-6 py-4 text-right">Actions</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-800/20">
                     <td className="px-6 py-4 flex items-center gap-3">
                       <img src={u.avatar} className="w-10 h-10 rounded-full border border-slate-700" />
                       <div>
                         <div className="font-bold text-white">{u.name}</div>
                         <div className="text-[10px] text-slate-500 uppercase font-black">{u.role}</div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${u.isPremium ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                         {u.isPremium ? 'Premium' : 'Free'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                        {u.premiumExpiresAt ? new Date(u.premiumExpiresAt).toLocaleString() : 'N/A'}
                     </td>
                     <td className="px-6 py-4 text-right">
                       <button onClick={()=>setEditingUser(u)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-rose-500 font-black text-xs transition-all">EDIT</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </div>
      )}

      {activeTab === 'plans' && (
        <>
          {isAddingPlan ? (
            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 animate-in zoom-in duration-300 max-w-3xl">
              <h3 className="text-lg font-bold text-white mb-6">{editingPlan ? 'Edit Paket Langganan' : 'Paket Langganan Baru'}</h3>
              <form onSubmit={handleSubmitPlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Nama Paket</label>
                  <input value={planFormData.name} onChange={e=>setPlanFormData({...planFormData, name:e.target.value})} className="w-full bg-slate-800 p-3 rounded-xl text-sm border border-slate-700" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Harga</label>
                  <input type="number" value={planFormData.price} onChange={e=>setPlanFormData({...planFormData, price: parseInt(e.target.value || '0')})} className="w-full bg-slate-800 p-3 rounded-xl text-sm border border-slate-700" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Durasi</label>
                  <input placeholder="contoh: 24h atau 30d" value={planFormData.duration} onChange={e=>setPlanFormData({...planFormData, duration:e.target.value})} className="w-full bg-slate-800 p-3 rounded-xl text-sm border border-slate-700" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Deskripsi</label>
                  <textarea value={planFormData.description} onChange={e=>setPlanFormData({...planFormData, description:e.target.value})} className="w-full bg-slate-800 p-3 rounded-xl text-sm border border-slate-700 min-h-[80px]" />
                </div>
                <div className="md:col-span-2 flex gap-4 pt-2">
                  <button type="submit" className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black shadow-lg shadow-rose-600/20">SIMPAN PAKET</button>
                  <button type="button" onClick={()=>{setIsAddingPlan(false); setEditingPlan(null);}} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold border border-slate-700">BATAL</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top duration-500">
              {plans.map(p => (
                <div key={p.id} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex flex-col justify-between hover:border-rose-500 transition-all shadow-2xl">
                  <div>
                    <h4 className="font-black text-white text-xl mb-1">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-4">Duration: {p.duration}</p>
                    <p className="text-3xl font-black text-rose-500 mb-6">Rp {p.price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingPlan(p); setPlanFormData(p); setIsAddingPlan(true);}} className="flex-1 bg-slate-800 p-3 rounded-xl text-rose-500 font-bold hover:bg-slate-700"><Icons.Edit className="w-5 h-5 mx-auto" /></button>
                    <button onClick={()=>{if(confirm('Hapus paket ini?')){ db.deletePlan(p.id); refreshData(); }}} className="flex-1 bg-slate-800 p-3 rounded-xl text-slate-500 font-bold hover:text-rose-500"><Icons.Trash2 className="w-5 h-5 mx-auto" /></button>
                  </div>
                </div>
              ))}
              <button onClick={()=>{setIsAddingPlan(true); setEditingPlan(null); setPlanFormData({name:'', price:0, duration:'', description:''});}} className="border-4 border-dashed border-slate-800 rounded-[2rem] p-8 text-slate-700 font-black text-lg hover:border-rose-500 hover:text-rose-500 transition-all flex items-center justify-center gap-4">
                <Icons.Plus className="w-8 h-8" /> NEW PLAN
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
