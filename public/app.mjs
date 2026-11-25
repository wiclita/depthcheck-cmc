import { groupByFootprint, formatPercent as percent, formatPrice } from './model.mjs';

const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const bands = ['small', 'review', 'large', 'unknown'];
let data;
let source;
let request = 0;

function clearBoard(message) {
  for (const band of bands) {
    $(`${band}-cards`).replaceChildren();
    $(`${band}-count`).textContent = '0';
    $(`${band}-empty`).hidden = false;
    $(`${band}-empty`).textContent = message;
  }
  for (const name of ['stat-flags', 'stat-coverage', 'stat-amount', 'count']) $(name).textContent = '—';
}

function render() {
  if (!data) return;
  const amount = Number($('amount').value);
  const valid = Number.isFinite(amount) && amount >= 1 && amount <= 1e12;
  $('amount').setAttribute('aria-invalid', String(!valid));
  $('amount-error').hidden = valid;
  $('amount-error').textContent = 'Enter an amount between $1 and $1 trillion.';
  for (const button of document.querySelectorAll('[data-amount]')) {
    button.classList.toggle('active', Number(button.dataset.amount) === amount);
    button.setAttribute('aria-pressed', String(Number(button.dataset.amount) === amount));
  }
  if (!valid) {
    clearBoard('Enter a valid trade amount to calculate footprints.');
    $('status').textContent = 'Enter a valid trade amount to continue.';
    return;
  }
  const search = $('search').value.trim().toLowerCase();
  const coins = data.coins.filter(c => `${c.name} ${c.symbol}`.toLowerCase().includes(search));
  if ($('sort').value === 'footprint') coins.sort((a, b) => (a.volume > 0 ? a.volume : Infinity) - (b.volume > 0 ? b.volume : Infinity));
  if ($('sort').value === 'volume') coins.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  const grouped = groupByFootprint(coins, amount);
  for (const band of bands) {
    const fragment = document.createDocumentFragment();
    for (const coin of grouped[band]) {
      const card = $('asset-card').content.cloneNode(true);
      const icon = card.querySelector('.coin-icon');
      icon.textContent = coin.symbol.slice(0, 1);
      icon.dataset.symbol = coin.symbol;
      card.querySelector('.coin-name').textContent = coin.name;
      card.querySelector('.coin-symbol').textContent = coin.symbol;
      card.querySelector('.coin-rank').textContent = coin.rank > 0 ? `#${coin.rank}` : 'DEMO';
      card.querySelector('.footprint').textContent = percent(coin.share);
      card.querySelector('.price').textContent = formatPrice(coin.price);
      card.querySelector('.volume').textContent = Number.isFinite(coin.volume) ? `$${compact.format(coin.volume)}` : 'Unavailable';
      card.querySelector('.volume-change').textContent = `${percent(coin.volumeChange)} vol / 24h`;
      card.querySelector('.turnover').textContent = `${percent(coin.turnover)} turnover`;
      const meter = card.querySelector('meter');
      meter.value = Math.min(coin.share ?? 0, 1);
      meter.setAttribute('aria-valuetext', coin.share === null ? 'Data unavailable' : `${percent(coin.share)} of reported 24h volume`);
      meter.hidden = coin.share === null;
      fragment.append(card);
    }
    $(`${band}-cards`).replaceChildren(fragment);
    $(`${band}-count`).textContent = String(grouped[band].length);
    $(`${band}-empty`).hidden = grouped[band].length > 0;
    $(`${band}-empty`).textContent = coins.length === 0 ? 'No matching assets. Try another name or symbol.'
      : band === 'unknown' ? 'No missing volume in this scan.' : 'No assets in this band for the current trade.';
  }
  $('stat-amount').textContent = money.format(amount);
  $('count').textContent = String(coins.length);
  $('stat-flags').textContent = String(grouped.review.length + grouped.large.length);
  $('stat-coverage').textContent = `${coins.length - grouped.unknown.length} / ${coins.length}`;
  $('status').textContent = `${coins.length} ${coins.length === 1 ? 'asset' : 'assets'} in view · Automatically grouped by calculated footprint`;
}

async function load(nextSource) {
  const id = ++request;
  $('error').hidden = true;
  $('source-badge').textContent = 'LOADING';
  $('source-note').textContent = 'Fetching market data…';
  document.querySelector('.board').setAttribute('aria-busy', 'true');
  for (const name of ['refresh', 'demo', 'live']) $(name).disabled = true;
  try {
    const response = await fetch(`/api/market${nextSource ? `?source=${nextSource}` : ''}`, { signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to load data.');
    if (id !== request) return;
    data = body;
    source = body.source;
    $('source-badge').textContent = source === 'demo' ? 'DEMO / SYNTHETIC' : 'LIVE / CMC';
    $('source-note').textContent = source === 'demo' ? 'Synthetic illustrative data · Not current market prices' :
      `Fetched ${new Date(body.fetchedAt).toLocaleString('en-US')} · 60s cache`;
    $('evidence').textContent = JSON.stringify(body, null, 2);
    render();
  } catch (error) {
    if (id !== request) return;
    data = null;
    clearBoard('No data available. Select demo mode or retry live CMC.');
    $('source-badge').textContent = 'DISCONNECTED';
    $('source-note').textContent = 'No active market data.';
    $('error').hidden = false;
    $('error').textContent = error.name === 'TimeoutError' ? 'Request timed out. Please try again.' : error.message;
    $('status').textContent = 'Unable to load. Select demo mode or try live data again.';
    $('evidence').textContent = 'No active data response. The request failed.';
  } finally {
    if (id === request) {
      document.querySelector('.board').setAttribute('aria-busy', 'false');
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
