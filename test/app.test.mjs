import test from 'node:test';
import assert from 'node:assert/strict';

// Hand-calculated cases catch wrong units, threshold boundaries and missing-data claims.
test('trade footprint and turnover use percentages, not fractions', async () => {
  const { assess } = await import('../public/model.mjs');
  assert.deepEqual(assess({ volume: 1000000, marketCap: 10000000 }, 1000),
    { share: 0.1, turnover: 10, level: 'Review closely' });
  assert.equal(assess({ volume: 1000000, marketCap: 10000000 }, 99).level, 'Small footprint');
  assert.equal(assess({ volume: 1000000, marketCap: 10000000 }, 10000).level, 'Large footprint');
});

test('missing or zero volume never implies safe liquidity', async () => {
  const { assess } = await import('../public/model.mjs');
  for (const volume of [0, null, undefined, -1, Infinity]) {
    assert.equal(assess({ volume, marketCap: 100 }, 100).share, null);
    assert.equal(assess({ volume, marketCap: 100 }, 100).level, 'Insufficient data');
  }
  assert.equal(assess({ volume: 100, marketCap: 0 }, 10).turnover, null);
  for (const amount of [0, -1, Infinity, NaN, '100']) {
    assert.throws(() => assess({ volume: 100 }, amount), /Amount/);
  }
});

test('positive tiny footprint never displays as zero', async () => {
  const { formatPercent } = await import('../public/model.mjs');
  assert.equal(typeof formatPercent, 'function');
  assert.equal(formatPercent(0.000031), '<0.0001%');
  assert.equal(formatPercent(-0.000031), '>−0.0001%');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(1.5), '1.5%');
  assert.equal(formatPercent(null), '—');
});

async function serve(t, options = {}) {
  const { createApp } = await import('../server.mjs');
  const server = createApp({ apiKey: '', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('sub-cent token prices stay visible rather than rounding to free', async () => {
  const { formatPrice } = await import('../public/model.mjs');
  assert.equal(typeof formatPrice, 'function');
  assert.equal(formatPrice(0.000001234), '$0.000001234');
  assert.equal(formatPrice(90000), '$90,000.00');
  assert.equal(formatPrice(null), '—');
});

test('board groups assets by calculated footprint, including unknown volume', async () => {
  const { groupByFootprint } = await import('../public/model.mjs');
  assert.equal(typeof groupByFootprint, 'function');
  const coins = [
    { symbol: 'LOW', volume: 2000000, marketCap: 10000000 },
    { symbol: 'MID', volume: 1000000, marketCap: 10000000 },
    { symbol: 'HIGH', volume: 100000, marketCap: 10000000 },
    { symbol: 'UNKNOWN', volume: null, marketCap: 10000000 }
  ];
  const grouped = groupByFootprint(coins, 1000);
  assert.deepEqual(Object.keys(grouped), ['small', 'review', 'large', 'unknown']);
  assert.deepEqual(Object.values(grouped).map(items => items.map(c => c.symbol)),
    [['LOW'], ['MID'], ['HIGH'], ['UNKNOWN']]);
  assert.equal(grouped.large[0].share, 1);
  const larger = groupByFootprint(coins, 1000000);
  assert.equal(larger.small.length, 0);
  assert.equal(larger.large.length, 3);
  assert.equal(larger.unknown.length, 1);
});

test('demo is explicit, serves assets, and never exposes project files', async t => {
  const base = await serve(t);
  const result = await (await fetch(`${base}/api/market?source=demo`)).json();
  assert.equal(result.source, 'demo');
  assert.ok(result.coins.length >= 4);
  assert.equal(result.fetchedAt, null);
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/favicon.svg`)).status, 200);
  assert.match((await fetch(`${base}/model.mjs`)).headers.get('content-type'), /javascript/);
  for (const file of ['/.env', '/server.mjs', '/package.json', '/test/app.test.mjs']) {
    assert.equal((await fetch(`${base}${file}`)).status, 404);
  }
  assert.equal((await fetch(`${base}/api/market?source=live`)).status, 503);
  assert.equal((await fetch(`${base}/api/market?source=bogus`)).status, 400);
  assert.equal((await fetch(`${base}/api/market`, { method: 'POST' })).status, 405);
});

const upstream = {
  status: { error_code: 0, timestamp: '2026-11-25T10:00:00Z' },
  data: [{ id: 1, name: 'Bitcoin', symbol: 'BTC', cmc_rank: 1,
    quote: { USD: { price: 90000, market_cap: 1800000000000,
      volume_24h: 30000000000, volume_change_24h: -12,
      percent_change_24h: 2, last_updated: '2026-11-25T10:00:00Z' } } }]
};

test('live data uses CMC key header, normalizes quotes, caches and strips secrets', async t => {
  let calls = 0;
  const base = await serve(t, {
    apiKey: 'test-secret-not-real',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(new URL(url).hostname, 'pro-api.coinmarketcap.com');
      assert.equal(new URL(url).pathname, '/v1/cryptocurrency/listings/latest');
      assert.equal(options.headers['X-CMC_PRO_API_KEY'], 'test-secret-not-real');
      return Response.json(upstream);
    }
  });
  const first = await fetch(`${base}/api/market?source=live`);
  const text = await first.text();
  const body = JSON.parse(text);
  assert.equal(body.source, 'live');
  assert.equal(body.coins[0].volume, 30000000000);
  assert.equal(body.coins[0].volumeChange, -12);
  assert.ok(body.fetchedAt);
  assert.ok(!text.includes('test-secret-not-real'));
  await fetch(`${base}/api/market?source=live`);
  assert.equal(calls, 1);
});

test('upstream errors never turn into demo data or leak raw errors', async t => {
  for (const response of [
    () => new Response('private upstream details', { status: 429 }),
    () => Response.json({ status: { error_code: 1001 }, data: [] }),
    () => Response.json({ data: [{ id: 1 }] }),
    () => Response.json({ data: [] }),
    () => { throw new Error('private upstream details'); }
  ]) {
    const base = await serve(t, { apiKey: 'test', fetchImpl: async () => response() });
    const res = await fetch(`${base}/api/market?source=live`);
    assert.equal(res.status, 502);
    const text = await res.text();
    assert.ok(!text.includes('private upstream details'));
    assert.ok(!text.includes('"source":"demo"'));
  }
});
