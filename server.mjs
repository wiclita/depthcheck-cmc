import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const endpoint = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=100&convert=USD';
const assets = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'],
  '/app.mjs': ['app.mjs', 'text/javascript'], '/model.mjs': ['model.mjs', 'text/javascript'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const demo = [
  [1, 'Bitcoin', 'BTC', 1, 90400, 1800000000000, 42000000000, 12.3, 2.41],
  [1027, 'Ethereum', 'ETH', 2, 3100, 374000000000, 18000000000, -8.4, -1.23],
  [825, 'Tether', 'USDT', 3, 1, 135000000000, 65000000000, 4.2, 0.01],
  [5426, 'Solana', 'SOL', 5, 142, 67000000000, 2800000000, 23.4, 4.72],
  [1975, 'Chainlink', 'LINK', 14, 14.5, 9100000000, 320000000, -19.2, -3.1],
  [80001, 'Sample Small Cap', 'SMALL', 0, 0.028, 28000000, 850000, -42, -8.9],
  [80002, 'Sample Thin Market', 'THIN', 0, 0.007, 7000000, 12000, -65, 12.5],
  [80003, 'Sample Missing Data', 'NODATA', 0, 0.12, 1200000, null, null, null]
].map(([id, name, symbol, rank, price, marketCap, volume, volumeChange, change]) =>
  ({ id, name, symbol, rank, price, marketCap, volume, volumeChange, change, updated: null }));

export function createApp({ apiKey = process.env.CMC_API_KEY || '', fetchImpl = fetch } = {}) {
  let cached;
  let pending;
  async function market() {
    if (cached && Date.now() - cached.time < 60000) return cached.body;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetchImpl(endpoint, {
        headers: { 'X-CMC_PRO_API_KEY': apiKey }, signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('upstream');
      const raw = await response.json();
      if (raw.status?.error_code || !Array.isArray(raw.data) || !raw.data.length) throw new Error('schema');
      const coins = raw.data.map(c => {
        const q = c.quote?.USD;
        if (!Number.isInteger(c.id) || typeof c.name !== 'string' || typeof c.symbol !== 'string' || !q) {
          throw new Error('schema');
        }
        const number = key => Number.isFinite(q[key]) ? q[key] : null;
        return { id: c.id, name: c.name, symbol: c.symbol, rank: c.cmc_rank,
          price: number('price'), marketCap: number('market_cap'), volume: number('volume_24h'),
          volumeChange: number('volume_change_24h'), change: number('percent_change_24h'),
          updated: typeof q.last_updated === 'string' ? q.last_updated : null };
      });
      const body = { source: 'live', fetchedAt: new Date().toISOString(), endpoint, coins };
      cached = { time: Date.now(), body };
      return body;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    function json(status, body) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(405, { error: 'GET only' }); }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/market') {
      const source = url.searchParams.get('source') || (apiKey ? 'live' : 'demo');
      if (!['live', 'demo'].includes(source)) return json(400, { error: 'Invalid data source.' });
      if (source === 'demo') return json(200, { source, fetchedAt: null, endpoint: null, coins: demo });
      if (!apiKey) return json(503, { error: 'No server API key configured. Select demo mode or set CMC_API_KEY in the local .env file.' });
      try { return json(200, await market()); }
      catch { return json(502, { error: 'Unable to load CMC data. Check key access, quota, and server connectivity. Live failures never silently fall back to demo data.' }); }
    }
    const asset = assets[url.pathname];
    if (!asset) return json(404, { error: 'Not found' });
    try {
      const body = await readFile(new URL(`./public/${asset[0]}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` });
      res.end(body);
    } catch { json(500, { error: 'Unable to load application asset.' }); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(3210, '127.0.0.1', () => console.log('DepthCheck: http://127.0.0.1:3210'));
}
