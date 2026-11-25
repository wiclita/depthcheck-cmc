# DepthCheck

**Know your footprint.** A small, English-language market screener comparing
a planned USD trade with reported global 24-hour cryptocurrency volume.

Built for **Build with CMC: API Hackathon**, Markets and Trading Tools track.
No dependencies, wallet connection, sign-in, trading or AI-generated predictions.

## Demo video

[Watch the current DepthCheck walkthrough (MP4)](https://github.com/wiclita/depthcheck-cmc/releases/download/v1.0.0/depthcheck-current.mp4).
It shows live CMC data and a separately labeled synthetic demo. This is a
recording of the locally hosted app, not a public deployment.

## The market board

A warm glass workspace groups assets into four calculated footprint columns:
**Small footprint**, **Review closely**, **Large footprint**, and **Unknown**.
Enter a planned USD trade, search by name or symbol, and sort within each column.
Categories update automatically; cards cannot be dragged into a different band.
Unknown volume stays visibly separate. Desktop shows four columns, tablets two,
and phones a single-column board.

The UI, formulas, errors and submission materials are in English. The interface
uses native HTML, CSS and JavaScript, including translucent panels and subtle
hover motion—no React, Framer Motion or animation dependency is needed.

## Run locally

Requires Node.js 22.9+ (tested with 22.23.5).

```powershell
cd depthcheck
npm.cmd start
```

Open **http://127.0.0.1:3210**. On macOS/Linux use `npm start`.
No installation step is necessary. Without a key the initial screen uses
**explicitly labeled synthetic demo data**; it is not a live market demo.
Sample assets SMALL, THIN and NODATA are fictional; demo quotes for real assets
are synthetic too.

### Connect real CoinMarketCap data

1. Obtain your own CMC Pro API key, using the hackathon campaign/account.
2. Copy `.env.example` to `.env`.
3. Set `CMC_API_KEY=your_key` in `.env` **locally**, then restart the server.
4. Click **Live CMC data**. Expand the methodology and evidence section.
5. Record the working live UI, endpoint, response and matching source code.
   The sanitized response is genuine only when `source` is `live`.

Do **not** paste keys into chat, screenshots, the browser JavaScript or GitHub.
`.env` is ignored. The browser receives market data, never the key.

## CMC integration

```http
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=100&convert=USD
X-CMC_PRO_API_KEY: [server-only secret]
```

Source code: `server.mjs`, `market()`. Fields used: `id`, `name`, `symbol`,
`cmc_rank`, and `quote.USD.{price,market_cap,volume_24h,volume_change_24h,
percent_change_24h,last_updated}`.
The evidence panel shows a normalized response, not the full upstream payload.
Each asset preserves its CMC update timestamp; `fetchedAt` is server retrieval
time, **not** the price update time.

- Top 100 according to CMC's default listings order; not all tokens.
- One successful upstream result cached for 60 seconds; concurrent requests
  share the same in-flight call.
- No polling. Amount, search and sort changes happen locally without API calls.
- A timeout, invalid schema, quota error or missing key is shown explicitly.
  A failed live request never silently falls back to demo.
- Server binds to loopback. Do not expose this local MVP publicly as-is:
  a public release needs hosting, HTTPS and request/access controls to protect
  your CMC quota. No deployment has been performed.

## Transparent methodology

`footprint (%) = planned trade USD / reported volume 24h USD × 100`

Illustrative bands: <0.1% “Small footprint”, 0.1–<1% “Review closely”,
≥1% “Large footprint”. These are **unvalidated demonstration heuristics**.
“Small footprint” does not mean safe. No order splitting or position-size advice
is generated.

`turnover (%) = volume 24h / market cap × 100`

Missing/nonpositive volume is “Insufficient data”; missing/nonpositive market cap
gives unknown turnover. This is **not order-book depth**, execution probability
or slippage. Global reported volume may contain unreliable activity, spans
multiple venues, and cannot guarantee liquidity on your exchange. Fees,
spread, venue restrictions and asset fragmentation are outside scope.
The product name does not imply actual depth data is available.

## Verify

```powershell
npm.cmd test
```

Node's built-in runner covers percentages, boundary cases, missing data,
tiny positive prices/percentages, automatic board grouping, invalid amounts,
HTTP methods, static-file allowlisting, demo/live separation,
CMC request authentication, normalization, caching and sanitized errors.
Upstream tests use controlled fixtures, **not** the real CMC service.
No real API evidence is claimed by these tests.

## Files

- `server.mjs`: HTTP server and CMC adapter.
- `public/model.mjs`: pure calculation, formatting and column grouping.
- `public/app.mjs`: UI state, filtering, sorting, evidence.
- `public/index.html`, `public/style.css`: responsive accessible interface.
- `test/app.test.mjs`: automated tests.
- `docs/SUBMISSION.md`: draft submission and recording checklist.

## API feedback

CMC combines comparable prices, market cap and reported volume in one response,
making the context screen possible without joining datasets. Aggregate volume
alone cannot answer per-venue execution/depth questions. A documented,
standardized depth/spread snapshot would be valuable for a future version.
A real authenticated CMC response has been verified locally (100 assets).
Startup-tier entitlement and sustained quota/latency behavior have not been
verified.
