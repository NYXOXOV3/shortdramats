import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

export default async function handler(req: IncomingMessage & { method?: string; url?: string }, res: ServerResponse & { setHeader: Function; end: Function }) {
  try {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
    const urlObj = new URL(req.url || '', 'http://localhost');
    const apiKeyParam = urlObj.searchParams.get('apiKey') || '';
    const apiKey = apiKeyParam || process.env.PAYDISINI_API_KEY || '';
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Paydisini API key not configured' }));
    }
    const unique_code = urlObj.searchParams.get('unique_code') || '';
    if (!unique_code) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Missing unique_code' }));
    }
    const signature = crypto.createHash('md5').update(apiKey).digest('hex');
    const payload = {
      key: apiKey,
      request: 'status',
      signature,
      unique_code
    };
    const response = await fetch('https://api.paydisini.co.id/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload as any)
    });
    const data = await response.json();
    res.statusCode = response.ok ? 200 : response.status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err?.message || 'Unknown error' }));
  }
}
