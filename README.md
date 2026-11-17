# GiftWise

AI gift ideas for U.S. holiday shoppers, plus live price comparison across retailers.

**v1 core task:** say who the gift is for, your budget, and a bit about them → get 5 gift ideas within budget → tap one to compare real prices from different stores (each with store, price, link, and time checked) → refine the ideas in plain words if they're not right.

- Live app: https://giftwise-fawn.vercel.app
- Proposal: https://giftwise-project-proposal.vercel.app

## What's in v1, and what isn't

| In v1 | Planned later |
| --- | --- |
| Guest use (no account) | Optional sign-in, saved gifts, gift lists |
| AI ideas from structured inputs + free text (OpenAI, JSON-schema output) | Price history and "is this a good deal?" guidance |
| Server-side budget guardrail: ideas the model prices over budget are dropped | Recommendation evals at scale |
| Live offers from Google Shopping via SerpApi, filtered to the budget, one per store | Exact-variant product matching |
| One-step refinement ("a bit cheaper", "more personal", …) | |

v1 does **not** show price history. No free source was available, and GiftWise never makes up history.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your own keys
node --env-file=.env.local scripts/test-openai.mjs     # checks the OpenAI key
node --env-file=.env.local scripts/test-serpapi.mjs    # checks SerpApi (uses 1 search)
npm run dev
```

## How it works

- `app/api/recommend/route.ts` validates input (zod), rate-limits per IP, and calls `lib/recommend.ts`. That file asks OpenAI for 5 ideas in a strict JSON schema, then drops any idea priced over the budget.
- `app/api/offers/route.ts` calls `lib/offers.ts` (SerpApi `google_shopping_light`; the older `google_shopping` engine returned no results in Nov 2026). It runs only when the user taps "Compare prices", which saves the free quota. Results are cached for 6 hours and limited to the budget.
- `components/GiftFinder.tsx` is the whole UI.

## Security and cost

- API keys live only in `.env.local` (git-ignored) and Vercel environment variables. All calls to OpenAI and SerpApi happen on the server, so keys never reach the browser.
- `.claude/settings.json` denies agents read access to `.env*` files.
- No database in v1, so no row-level security is needed yet. When Supabase arrives in v2, RLS will be turned on for every table.
- OpenAI has a monthly spending limit. SerpApi stays on the free plan (~100 searches/month). Both routes are rate-limited per IP.
