export function formatPrice(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
    ...(value > 0 && value < 0.01 ? { maximumSignificantDigits: 4 } : { maximumFractionDigits: 2 })
  }).format(value);
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.0001) return '<0.0001%';
  if (value < 0 && value > -0.0001) return '>−0.0001%';
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}%`;
}

export function assess(coin, amount) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than zero.');
  const volume = Number.isFinite(coin.volume) && coin.volume > 0 ? coin.volume : null;
  const cap = Number.isFinite(coin.marketCap) && coin.marketCap > 0 ? coin.marketCap : null;
  const share = volume === null ? null : amount / volume * 100;
  const turnover = volume !== null && cap !== null ? volume / cap * 100 : null;
  const level = share === null ? 'Insufficient data' : share >= 1 ? 'Large footprint'
    : share >= 0.1 ? 'Review closely' : 'Small footprint';
  return { share, turnover, level };
}

export function groupByFootprint(coins, amount) {
  const groups = { small: [], review: [], large: [], unknown: [] };
  for (const coin of coins) {
    const result = assess(coin, amount);
    const band = result.share === null ? 'unknown' : result.share >= 1 ? 'large'
      : result.share >= 0.1 ? 'review' : 'small';
    groups[band].push({ ...coin, ...result });
  }
  return groups;
}
