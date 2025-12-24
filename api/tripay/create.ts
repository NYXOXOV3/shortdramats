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

    const { amount, method, customer_name, customer_email, merchant_ref, item_name, credentials } = body;
    const apiKey = (credentials?.apiKey) || process.env.TRIPAY_API_KEY || '';
    const privateKey = (credentials?.privateKey) || process.env.TRIPAY_PRIVATE_KEY || '';
    const merchantCode = (credentials?.merchantCode) || process.env.TRIPAY_MERCHANT_CODE || '';
    const mode = (credentials?.mode) || process.env.TRIPAY_MODE || 'sandbox';
    const baseUrl = (mode === 'sandbox')
      ? 'https://tripay.co.id/api-sandbox'
      : 'https://tripay.co.id/api';

    if (!apiKey || !privateKey || !merchantCode) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Tripay credentials not configured' }));
    }

    const signature = crypto.createHmac('sha256', privateKey)
      .update(merchantCode + merchant_ref + amount)
      .digest('hex');

    const payload = {
      method,
      merchant_ref,
      amount,
      customer_name,
      customer_email,
      signature,
      order_items: [
        {
          name: item_name || 'Premium Subscription',
          price: amount,
          quantity: 1
        }
      ]
    };

    const response = await fetch(`${baseUrl}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
