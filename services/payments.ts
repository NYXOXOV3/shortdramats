import { db } from './db';

export const payments = {
  _parseJsonSafe: async (res: Response): Promise<any> => {
    try {
      return await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      try {
        return text ? JSON.parse(text) : { error: 'Empty response', status: res.status };
      } catch {
        return { error: text || 'Non-JSON response', status: res.status };
      }
    }
  },
  

  createTripayTransaction: async (params: {
    method: string;
    amount: number;
    customer_name: string;
    customer_email: string;
    merchant_ref: string;
    item_name?: string;
    credentials?: { apiKey?: string; privateKey?: string; merchantCode?: string };
  }): Promise<{ success: boolean; data?: any; message?: string }> => {
    const base = db.getSiteSettings()?.apiBaseUrl || window.location.origin;
    const res = await fetch(new URL('/api/tripay/create', base).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await payments._parseJsonSafe(res);
    if (!res.ok) return { success: false, message: data?.error || data?.message || 'Tripay create failed', data };
    return data;
  },

  getTripayStatus: async (reference: string, credentials?: { apiKey?: string; mode?: string }): Promise<{ success: boolean; data?: any; message?: string }> => {
    const base = db.getSiteSettings()?.apiBaseUrl || window.location.origin;
    const url = new URL(`/api/tripay/status`, base);
    url.searchParams.set('reference', reference);
    if (credentials?.apiKey) url.searchParams.set('apiKey', credentials.apiKey);
    if (credentials?.mode) url.searchParams.set('mode', credentials.mode);
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    const data = await payments._parseJsonSafe(res);
    if (!res.ok) return { success: false, message: data?.error || data?.message || 'Tripay status failed', data };
    return data;
  },

  createPaydisiniTransaction: async (params: {
    unique_code: string;
    service: string;
    amount: number;
    note?: string;
    ewallet_phone?: string;
    type_fee?: number;
    return_url?: string;
    callback_url?: string;
    credentials?: { apiKey?: string };
  }): Promise<any> => {
    const base = db.getSiteSettings()?.apiBaseUrl || window.location.origin;
    const res = await fetch(new URL('/api/paydisini/create', base).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await payments._parseJsonSafe(res);
    return data;
  },

  getPaydisiniStatus: async (unique_code: string, credentials?: { apiKey?: string }): Promise<any> => {
    const base = db.getSiteSettings()?.apiBaseUrl || window.location.origin;
    const url = new URL(`/api/paydisini/status`, base);
    url.searchParams.set('unique_code', unique_code);
    if (credentials?.apiKey) url.searchParams.set('apiKey', credentials.apiKey);
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    const data = await payments._parseJsonSafe(res);
    return data;
  }
};
