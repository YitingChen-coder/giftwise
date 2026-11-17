# Security review: GiftWise v1 (November 17, 2026)

Ran `/security-review` in Claude Code before shipping v1.

**Scope:** every change since the initial commit (`2f3c2c5..HEAD`). The working tree was clean, so the review covered the whole app. `.env` and `.env.local` were not read.

## Result: no high- or medium-severity vulnerabilities found

No finding reached the reporting threshold (confidence 8/10 or above). Each candidate was checked and dropped for the reason below.

| Area | What was checked | Why it is not a vulnerability |
| --- | --- | --- |
| Offer links (`components/GiftFinder.tsx`) | Can a link from SerpApi run script, e.g. a `javascript:` URL? | `lib/offers.ts` keeps only links that start with `https://`. Links also carry `rel="noopener noreferrer nofollow"`. |
| Thumbnails (`components/GiftFinder.tsx`) | Can an image URL from SerpApi run script? | Browsers don't run `javascript:` in `img src`, and React escapes the value. The worst case is loading an image from a third party. |
| XSS in general | Unsafe rendering | No `dangerouslySetInnerHTML` and no `eval`. Text from the AI, SerpApi and the user is all rendered as React text. |
| SerpApi request (`lib/offers.ts`) | Can a user change the request's parameters or host? | The query goes through `URLSearchParams`, so a user can't override `api_key` or `engine`. The host is fixed, so there is no SSRF. Zod limits the query to 120 characters and the budget to a number. |
| API keys | Leaks to the browser, logs or git | Keys are read only on the server, and there are no `NEXT_PUBLIC_` variables. The request URL that contains the key is never logged or returned. Users only see generic error messages. Git history has no `.env` files and no key-like strings. |
| Recommend route (`app/api/recommend/route.ts`) | Input and AI output handling | Request bodies are checked with Zod, and the model's output is parsed and checked with Zod too. Prompt injection from user text is outside this review's scope. |
| Shared offer cache (`lib/offers.ts`) | Can one user see another user's data? | The cache holds only public shopping results, keyed by search terms and budget. |
| Rate limiter (`lib/rateLimit.ts`) | Spoofing the client IP | This only lets someone get around rate limits, which this review excludes. |
| `scripts/*.mjs` | Developer scripts | They take command-line arguments and environment variables, which count as trusted. They print error messages but never the key. |
| `.claude/settings.json` | Agent permissions | It only adds deny rules that stop agents reading `.env*` files. It doesn't weaken anything. |

## Pre-ship checklist

- [x] Keys are in environment variables (Vercel, marked Secret; `.env.local` locally), and none are in the repository.
- [x] A deny rule in `.claude/settings.json` keeps agents out of `.env*` files.
- [x] Row-level security: not applicable to v1, which has no database. Enable RLS on every table when Supabase arrives in v2.
- [x] `/security-review` ran, with no findings to fix.
- [x] OpenAI has a monthly spending limit. SerpApi is on the free plan. Both API routes are rate-limited per IP.

## Known follow-up

`npm audit` reports a high-severity advisory in the PostCSS copy bundled inside Next.js 15.5.29. It is fixed in Next 16, so upgrade Next.js during v2.
