# DepthCheck

## Purpose and audience
Help a crypto user put a planned USD trade in context against reported global
24-hour market volume. Also serve as a reproducible, inspectable CoinMarketCap
hackathon project for international judges.

## Core task
Enter an amount, inspect automatically computed footprint bands, search and sort
assets, and inspect methodology and live response evidence. This is an Operate
surface, not a marketing or trading interface.

## Product truth
- Footprint = trade USD / reported 24h volume USD × 100.
- Illustrative, unvalidated bands: small <0.1%, review 0.1–<1%, large ≥1%.
- Missing/nonpositive volume is unknown, never safe or zero risk.
- Reported global volume is not order-book depth, executable liquidity or slippage.
- Live CMC listings and separately labeled synthetic demo data.
- Server-only API key, 60-second cache, no polling, no trading, no login or wallet.

## Binding user decisions
- English UI and submission copy for international judges.
- Warm translucent glass dashboard, pill navigation and pastel pipeline-style
  asset columns, inspired by the user's reference.
- No manually assigning computed categories.
- GitHub publication and eventual DoraHacks submission authorized, but user's
  personal age/eligibility disclaimer confirmation remains pending.

## Local stack and release limits
Node 22 built-ins and browser HTML/CSS/modules, without external runtime packages.
Public deployment is not done. Real API calls work locally; a publicly reachable
video or secure deployment and X post are still needed for submission.
