import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage & { method?: string; url?: string }, res: ServerResponse & { setHeader: Function; end: Function }) {
  try {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
    const urlObj = new URL(req.url || '', 'http://localhost');
    const mode = urlObj.searchParams.get('mode') || process.env.TRIPAY_MODE || 'sandbox';
    const baseUrl = (mode === 'sandbox')
      ? 'https://tripay.co.id/api-sandbox'
      : 'https://tripay.co.id/api';
    const apiKeyParam = urlObj.searchParams.get('apiKey') || '';
    const apiKey = apiKeyParam || process.env.TRIPAY_API_KEY || '';
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Tripay API key not configured' }));
    }
    const reference = urlObj.searchParams.get('reference');
    if (!reference) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Missing reference' }));
    }
    const response = await fetch(`${baseUrl}/transaction/detail?reference=${encodeURIComponent(reference)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
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
