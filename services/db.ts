
import { Drama, User, UserRole, SubscriptionRequest, SubscriptionPlan } from '../types';

const DRAMAS_KEY = 'dramashort_dramas';
const USERS_KEY = 'dramashort_users';
const CURRENT_USER_KEY = 'dramashort_current_user';
const PLANS_KEY = 'dramashort_plans';
const GENRES_KEY = 'dramashort_genres';
const REGIONS_KEY = 'dramashort_regions';
const SUB_REQUESTS_KEY = 'dramashort_sub_requests';
const GATEWAY_CONFIG_KEY = 'dramashort_gateway_config';
const SITE_SETTINGS_KEY = 'dramashort_site_settings';

const INITIAL_PLANS: SubscriptionPlan[] = [
  { id: '1', name: 'Paket Harian', price: 5000, duration: '24h', description: 'Akses tanpa batas 1 hari' },
  { id: '2', name: 'Paket Hemat', price: 49000, duration: '30d', description: 'Favorit para penonton' },
  { id: '3', name: 'Paket Sultan', price: 149000, duration: '365d', description: 'Hemat 50% untuk akses setahun' },
];

const INITIAL_GENRES = ['Romance', 'Drama', 'Action', 'Sci-Fi', 'Comedy', 'Thriller'];
const INITIAL_REGIONS = ['Indonesia', 'Korea', 'China', 'Thailand', 'Japan', 'USA'];

const INITIAL_USERS: User[] = [];

export const db = {
  // Check and clean expired premiums
  checkPremiumExpiries: () => {
    const users = db.getUsers();
    let changed = false;
    const now = new Date().getTime();

    users.forEach(u => {
      if (u.isPremium && u.premiumExpiresAt) {
        if (now > new Date(u.premiumExpiresAt).getTime()) {
          u.isPremium = false;
          u.premiumExpiresAt = null;
          changed = true;
        }
      }
    });

    if (changed) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      const current = db.getCurrentUser();
      if (current) {
        const updated = users.find(u => u.id === current.id);
        if (updated) db.setCurrentUser(updated);
      }
    }
  },

  // Categories
  getGenres: (): string[] => {
    const data = localStorage.getItem(GENRES_KEY);
    if (!data) {
      localStorage.setItem(GENRES_KEY, JSON.stringify(INITIAL_GENRES));
      return INITIAL_GENRES;
    }
    return JSON.parse(data);
  },
  addGenre: (name: string) => {
    const genres = db.getGenres();
    if (name && !genres.includes(name)) {
      genres.push(name);
      localStorage.setItem(GENRES_KEY, JSON.stringify(genres));
    }
  },
  removeGenre: (name: string) => {
    const genres = db.getGenres().filter(g => g !== name);
    localStorage.setItem(GENRES_KEY, JSON.stringify(genres));
  },
  getRegions: (): string[] => {
    const data = localStorage.getItem(REGIONS_KEY);
    if (!data) {
      localStorage.setItem(REGIONS_KEY, JSON.stringify(INITIAL_REGIONS));
      return INITIAL_REGIONS;
    }
    return JSON.parse(data);
  },
  addRegion: (name: string) => {
    const regions = db.getRegions();
    if (name && !regions.includes(name)) {
      regions.push(name);
      localStorage.setItem(REGIONS_KEY, JSON.stringify(regions));
    }
  },
  removeRegion: (name: string) => {
    const regions = db.getRegions().filter(r => r !== name);
    localStorage.setItem(REGIONS_KEY, JSON.stringify(regions));
  },

  // Users
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User) => {
    const users = db.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    const current = db.getCurrentUser();
    if (current && current.id === user.id) {
      db.setCurrentUser(user);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new Event('storage'));
  },

  registerUser: (userData: any): User => {
    const users = db.getUsers();
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      role: users.length === 0 ? UserRole.ADMIN : UserRole.USER,
      isPremium: false,
      createdAt: new Date().toISOString(),
      avatar: `https://i.pravatar.cc/150?u=${userData.email}`
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  // Dramas
  getDramas: (): Drama[] => {
    const data = localStorage.getItem(DRAMAS_KEY);
    const dramas: Drama[] = data ? JSON.parse(data) : [];
    
    // Auto-reset "New" flag after 24 hours
    let changed = false;
    const now = new Date().getTime();
    dramas.forEach(d => {
      if (d.isNew && (now - new Date(d.createdAt).getTime() > 24 * 60 * 60 * 1000)) {
        d.isNew = false;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(DRAMAS_KEY, JSON.stringify(dramas));
    
    return dramas;
  },

  saveDrama: (drama: Drama) => {
    const dramas = db.getDramas();
    const index = dramas.findIndex(d => d.id === drama.id);
    if (index > -1) dramas[index] = drama;
    else dramas.push(drama);
    localStorage.setItem(DRAMAS_KEY, JSON.stringify(dramas));
  },

  deleteDrama: (id: string) => {
    const dramas = db.getDramas().filter(d => d.id !== id);
    localStorage.setItem(DRAMAS_KEY, JSON.stringify(dramas));
  },

  // Plans
  getPlans: (): SubscriptionPlan[] => {
    const data = localStorage.getItem(PLANS_KEY);
    if (!data) {
      localStorage.setItem(PLANS_KEY, JSON.stringify(INITIAL_PLANS));
      return INITIAL_PLANS;
    }
    return JSON.parse(data);
  },

  savePlan: (plan: SubscriptionPlan) => {
    const plans = db.getPlans();
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx > -1) plans[idx] = plan;
    else plans.push(plan);
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  },

  deletePlan: (id: string) => {
    const plans = db.getPlans().filter(p => p.id !== id);
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  },

  // Requests
  getRequests: (): SubscriptionRequest[] => {
    const data = localStorage.getItem(SUB_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  createRequest: (reqData: any) => {
    const requests = db.getRequests();
    const newReq: SubscriptionRequest = {
      ...reqData,
      id: Date.now().toString(),
      gatewayRef: reqData.gatewayRef,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    requests.push(newReq);
    localStorage.setItem(SUB_REQUESTS_KEY, JSON.stringify(requests));
  },

  updateRequestStatus: (reqId: string, status: 'APPROVED' | 'REJECTED') => {
    const requests = db.getRequests();
    const idx = requests.findIndex(r => r.id === reqId);
    if (idx > -1) {
      requests[idx].status = status;
      localStorage.setItem(SUB_REQUESTS_KEY, JSON.stringify(requests));
      
      if (status === 'APPROVED') {
        const req = requests[idx];
        const plans = db.getPlans();
        const plan = plans.find(p => p.id === req.planId) || plans[0];
        
        const users = db.getUsers();
        const uIdx = users.findIndex(u => u.id === req.userId);
        if (uIdx > -1) {
          const now = new Date();
          let expiry = new Date(now);
          
          if (plan.duration.endsWith('h')) {
            expiry.setHours(expiry.getHours() + parseInt(plan.duration));
          } else if (plan.duration.endsWith('d')) {
            expiry.setDate(expiry.getDate() + parseInt(plan.duration));
          }

          users[uIdx].isPremium = true;
          users[uIdx].premiumExpiresAt = expiry.toISOString();
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          
          const current = db.getCurrentUser();
          if (current && current.id === req.userId) {
            db.setCurrentUser(users[uIdx]);
          }
        }
      }
    }
  }
  ,
  getGatewayConfig: (): any => {
    const data = localStorage.getItem(GATEWAY_CONFIG_KEY);
    return data ? JSON.parse(data) : {
      tripay: { apiKey: '', privateKey: '', merchantCode: '', mode: 'sandbox' },
      paydisini: { apiKey: '' },
      qris: { staticUrl: '' }
    };
  },
  setGatewayConfig: (cfg: any) => {
    localStorage.setItem(GATEWAY_CONFIG_KEY, JSON.stringify(cfg));
  },
  getSiteSettings: (): any => {
    const data = localStorage.getItem(SITE_SETTINGS_KEY);
    if (data) return JSON.parse(data);
    const initial = {
      siteName: 'DramaShort',
      logoUrl: '',
      bannerUrl: '',
      keywords: ['drama', 'streaming', 'short drama', 'premium'],
      footerText: 'Platform streaming short drama #1 di Indonesia. Kisah hebat dalam durasi singkat.',
      livechatEmbedHtml: '',
      whatsappAdmin: '',
      apiBaseUrl: ''
    };
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(initial));
    return initial;
  },
  setSiteSettings: (settings: any) => {
    localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('storage'));
  }
};
