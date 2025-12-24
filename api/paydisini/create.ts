import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { setHeader: Function; end: Function }) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');

    const { unique_code, service, amount, note, return_url, ewallet_phone, type_fee, callback_url } = body;
    const apiKey = process.env.PAYDISINI_API_KEY || '';
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Paydisini API key not configured' }));
    }
    const signature = crypto.createHash('md5').update(apiKey).digest('hex');

    const payload = {
      key: apiKey,
      request: 'create',
      signature,
      unique_code,
      service,
      amount,
      note,
      ewallet_phone,
      type_fee,
      return_url,
      callback_url: callback_url || process.env.PAYDISINI_CALLBACK_URL || return_url
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
