import { assess, formatPercent as percent, formatPrice } from './model.mjs';

const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
let data;
let source;
let request = 0;

function render() {
  if (!data) return;
  const amount = Number($('amount').value);
  const valid = Number.isFinite(amount) && amount >= 1 && amount <= 1e12;
  $('amount').setAttribute('aria-invalid', String(!valid));
  $('amount-error').hidden = valid;
  $('amount-error').textContent = 'Enter an amount between $1 and $1 trillion.';
  $('rows').replaceChildren();
  $('stat-amount').textContent = valid ? money.format(amount) : '—';
  for (const button of document.querySelectorAll('[data-amount]')) {
    button.classList.toggle('active', Number(button.dataset.amount) === amount);
  }
  if (!valid) {
    $('stat-flags').textContent = '—';
    $('stat-coverage').textContent = '—';
    $('count').textContent = '— assets';
    $('empty').hidden = true;
    $('status').textContent = 'Enter a valid trade amount to continue.';
    return;
  }
  const search = $('search').value.trim().toLowerCase();
  const coins = data.coins.filter(c => `${c.name} ${c.symbol}`.toLowerCase().includes(search))
    .map(c => ({ ...c, ...assess(c, amount) }));
  if ($('sort').value === 'footprint') coins.sort((a, b) => (b.share ?? -1) - (a.share ?? -1));
  if ($('sort').value === 'volume') coins.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  const fragment = document.createDocumentFragment();
  for (const c of coins) {
    const row = $('coin-row').content.cloneNode(true);
    row.querySelector('.coin-icon').textContent = c.symbol.slice(0, 1);
    row.querySelector('.coin-name').textContent = c.name;
    row.querySelector('.coin-sub').textContent = `${c.symbol} · ${formatPrice(c.price)}`;
    row.querySelector('.volume').textContent = Number.isFinite(c.volume) ? `$${compact.format(c.volume)}` : 'Unavailable';
    row.querySelector('.volume-change').textContent = `${percent(c.volumeChange)} vs prior 24h`;
    row.querySelector('.footprint').textContent = percent(c.share);
    const meter = row.querySelector('meter');
    meter.value = Math.min(c.share ?? 0, 1);
    meter.setAttribute('aria-valuetext', c.share === null ? 'Data unavailable' : `${percent(c.share)} of reported 24h volume`);
    if (c.share === null) meter.hidden = true;
    const risk = row.querySelector('.risk');
    risk.textContent = c.level;
    risk.classList.add(c.share === null ? 'unknown' : c.share >= 1 ? 'high' : c.share >= 0.1 ? 'watch' : 'low');
    row.querySelector('.turnover').textContent = `Turnover ${percent(c.turnover)}`;
    fragment.append(row);
  }
  $('rows').append(fragment);
  $('count').textContent = `${coins.length} assets`;
  $('stat-flags').textContent = `${coins.filter(c => c.share !== null && c.share >= 0.1).length} assets`;
  $('stat-coverage').textContent = `${coins.filter(c => c.share !== null).length} / ${coins.length}`;
  $('empty').hidden = coins.length !== 0;
  $('status').textContent = `${coins.length} assets shown · Illustrative thresholds, not trading recommendations.`;
}

async function load(nextSource) {
  const id = ++request;
  $('error').hidden = true;
  $('source-badge').textContent = 'LOADING';
  $('source-note').textContent = 'Fetching market data…';
  document.querySelector('.results').setAttribute('aria-busy', 'true');
  for (const name of ['refresh', 'demo', 'live']) $(name).disabled = true;
  try {
    const response = await fetch(`/api/market${nextSource ? `?source=${nextSource}` : ''}`, { signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to load data.');
    if (id !== request) return;
    data = body;
    source = body.source;
    $('source-badge').textContent = source === 'demo' ? 'DEMO / SYNTHETIC' : 'LIVE / CMC';
    $('source-note').textContent = source === 'demo' ? 'Illustrative data. Not current market prices.' :
      `Fetched ${new Date(body.fetchedAt).toLocaleString('en-US')} · 60s cache`;
    $('evidence').textContent = JSON.stringify(body, null, 2);
    render();
  } catch (error) {
    if (id !== request) return;
    data = null;
    $('rows').replaceChildren();
    $('source-badge').textContent = 'DISCONNECTED';
    $('source-note').textContent = 'No active market data.';
    $('error').hidden = false;
    $('error').textContent = error.name === 'TimeoutError' ? 'Request timed out. Please try again.' : error.message;
    for (const name of ['stat-flags', 'stat-coverage', 'stat-amount']) $(name).textContent = '—';
    $('count').textContent = '— assets';
    $('empty').hidden = true;
    $('status').textContent = 'Unable to load. Select demo mode or try live data again.';
    $('evidence').textContent = 'No active data response. The request failed.';
  } finally {
    if (id === request) {
      document.querySelector('.results').setAttribute('aria-busy', 'false');
      for (const name of ['refresh', 'demo', 'live']) $(name).disabled = false;
      $('demo').setAttribute('aria-pressed', String(Boolean(data && source === 'demo')));
      $('live').setAttribute('aria-pressed', String(Boolean(data && source === 'live')));
    }
  }
}
$('amount').addEventListener('input', render);
$('search').addEventListener('input', render);
$('sort').addEventListener('change', render);
for (const button of document.querySelectorAll('[data-amount]')) {
  button.addEventListener('click', () => { $('amount').value = button.dataset.amount; render(); });
}
$('demo').addEventListener('click', () => load('demo'));
$('live').addEventListener('click', () => load('live'));
$('refresh').addEventListener('click', () => load(source));
load();
