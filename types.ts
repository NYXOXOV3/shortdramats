
export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isPremium: boolean;
  premiumExpiresAt?: string | null; // Nullable expiry for premium
  avatar?: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  isPremium: boolean;
  order: number;
}

export interface Drama {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  genre: string[]; // Array for multi-genre
  region: string[]; // Array for multi-region
  views: number;
  rating: number;
  episodes: Episode[];
  isHot: boolean;
  isNew: boolean; // Flag for new drama
  isPremiumDrama: boolean;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string; // e.g., '24h', '30d', '365d'
  description: string;
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string; // Added to track plan duration
  planName: string;
  paymentMethod: string;
  gatewayRef?: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
