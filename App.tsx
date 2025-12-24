
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { db } from './services/db';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import DramaDetails from './pages/DramaDetails';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/Profile';
import SubscriptionPage from './pages/Subscription';
import SearchPage from './pages/SearchPage';
import GenresPage from './pages/GenresPage';
import NewReleases from './pages/NewReleases';
import RealisPage from './pages/RealisPage';
import PopularPage from './pages/PopularPage';
import EditProfile from './pages/EditProfile';
import PaymentModal from './components/PaymentModal';
import { Icons } from './components/Icons';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedDramaId, setSelectedDramaId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<{type: 'genre' | 'region' | 'search', value: string} | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(() => db.getSiteSettings());

  const refreshUser = () => {
    const currentUser = db.getCurrentUser();
    setUser(currentUser);
  };

  useEffect(() => {
    refreshUser();
    const applySeo = () => {
      const s = db.getSiteSettings();
      setSiteSettings(s);
      const title = s?.siteName || 'DramaShort';
      document.title = title;
      const keywords = s?.keywords || [];
      let meta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'keywords');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', Array.isArray(keywords) ? keywords.join(', ') : String(keywords || ''));
    };
    applySeo();
    const handleStorageChange = () => {
      refreshUser();
      applySeo();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const applyRoute = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/details/')) {
        const id = hash.replace('#/details/', '');
        setSelectedDramaId(id || null);
        setCurrentPage('details');
        return;
      }
      if (hash === '#/admin') {
        setCurrentPage('admin');
        return;
      }
      if (hash === '#/login') {
        setCurrentPage('login');
        return;
      }
      if (hash === '#/profile') {
        setCurrentPage('profile');
        return;
      }
      if (hash === '#/edit-profile') {
        setCurrentPage('edit-profile');
        return;
      }
      if (hash === '#/genres') {
        setCurrentPage('genres');
        return;
      }
      if (hash === '#/new') {
        setCurrentPage('new');
        return;
      }
      if (hash === '#/realis') {
        setCurrentPage('realis');
        return;
      }
      if (hash === '#/popular') {
        setCurrentPage('popular');
        return;
      }
      if (hash === '#/subscription') {
        setCurrentPage('subscription');
        return;
      }
      if (hash === '#/search') {
        setCurrentPage('search');
        return;
      }
      setCurrentPage('home');
      setSelectedDramaId(null);
    };
    applyRoute();
    const onHashChange = () => applyRoute();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (page: string) => {
    switch (page) {
      case 'home':
        window.location.hash = '#/';
        setSelectedDramaId(null);
        break;
      case 'admin':
        window.location.hash = '#/admin';
        break;
      case 'login':
        window.location.hash = '#/login';
        break;
      case 'edit-profile':
        window.location.hash = '#/edit-profile';
        break;
      case 'genres':
        window.location.hash = '#/genres';
        break;
      case 'new':
        window.location.hash = '#/new';
        break;
      case 'realis':
        window.location.hash = '#/realis';
        break;
      case 'popular':
        window.location.hash = '#/popular';
        break;
      case 'profile':
        window.location.hash = '#/profile';
        break;
      case 'subscription':
        window.location.hash = '#/subscription';
        break;
      case 'search':
        window.location.hash = '#/search';
        break;
      case 'details':
        if (selectedDramaId) window.location.hash = `#/details/${selectedDramaId}`;
        break;
      default:
        window.location.hash = '#/';
        setSelectedDramaId(null);
    }
    setCurrentPage(page);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    navigate('home');
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    setUser(null);
    navigate('home');
  };

  const handleSelectDrama = (id: string) => {
    setSelectedDramaId(id);
    window.location.hash = `#/details/${id}`;
    setCurrentPage('details');
  };

  const handleSearch = (type: 'genre' | 'region' | 'search', value: string) => {
    setSearchFilter({ type, value });
    navigate('search');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onSelectDrama={handleSelectDrama} onFilter={handleSearch} />;
      case 'details':
        return (
          <DramaDetails 
            dramaId={selectedDramaId!} 
            user={user} 
            onBack={() => navigate('home')}
            onLogin={() => navigate('login')}
            onUpgrade={() => setIsPaymentOpen(true)}
          />
        );
      case 'login':
        return (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onBack={() => navigate('home')} 
          />
        );
      case 'admin':
        return user?.role === UserRole.ADMIN ? <AdminDashboard /> : <Home onSelectDrama={handleSelectDrama} onFilter={handleSearch} />;
      case 'profile':
        return <ProfilePage user={user} onLogout={handleLogout} onBack={() => navigate('home')} />;
      case 'edit-profile':
        return <EditProfile onBack={() => navigate('profile')} />;
      case 'genres':
        return <GenresPage />;
      case 'new':
        return <NewReleases />;
      case 'realis':
        return <RealisPage />;
      case 'popular':
        return <PopularPage />;
      case 'subscription':
        return <SubscriptionPage user={user} onUpgrade={() => setIsPaymentOpen(true)} onBack={() => navigate('home')} />;
      case 'search':
        return <SearchPage filter={searchFilter} onSelectDrama={handleSelectDrama} onBack={() => navigate('home')} />;
      default:
        return <Home onSelectDrama={handleSelectDrama} onFilter={handleSearch} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {currentPage !== 'login' && (
        <Navbar 
          user={user} 
          currentPage={currentPage}
          onLogout={handleLogout} 
          onNavigate={(page) => navigate(page)} 
          onSearch={(val) => handleSearch('search', val)}
          siteName={siteSettings?.siteName}
          logoUrl={siteSettings?.logoUrl}
        />
      )}
      
      <main>
        {renderPage()}
      </main>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        user={user}
        onClose={() => setIsPaymentOpen(false)} 
        onSuccess={() => setIsPaymentOpen(false)} 
      />

      {currentPage !== 'login' && (
        <footer className="mt-20 border-t border-slate-800 py-12 px-4 md:px-8 bg-slate-900/50">
          <div className="max-w-7xl auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                {siteSettings?.logoUrl ? (
                  <img src={siteSettings.logoUrl} alt={siteSettings?.siteName || 'Logo'} className="w-8 h-8 rounded-lg border border-slate-700 object-cover" />
                ) : (
                  <div className="bg-rose-600 p-1.5 rounded-lg">
                     <Icons.Play className="w-5 h-5 text-white fill-current" />
                  </div>
                )}
                <span className="text-xl font-bold">{siteSettings?.siteName || 'DramaShort'}</span>
              </div>
              <p className="text-slate-500 text-sm" dangerouslySetInnerHTML={{ __html: (siteSettings?.footerText || 'Platform streaming short drama #1 di Indonesia.<br/>Kisah hebat dalam durasi singkat.') }} />
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} {siteSettings?.siteName || 'DramaShort'}.
            </div>
          </div>
        </footer>
      )}
      {siteSettings?.whatsappAdmin && (
        <a 
          href={`https://wa.me/${String(siteSettings.whatsappAdmin).replace(/[^0-9]/g,'')}`} 
          target="_blank" 
          rel="noreferrer" 
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-full font-bold shadow-xl border border-emerald-500"
        >
          Chat WhatsApp
        </a>
      )}
      {siteSettings?.livechatEmbedHtml && (
        <div dangerouslySetInnerHTML={{ __html: siteSettings.livechatEmbedHtml }} />
      )}
    </div>
  );
};

export default App;
