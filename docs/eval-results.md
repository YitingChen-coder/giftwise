# Recommendation eval: November 17, 2026

Run against the live app: `node scripts/eval-recommend.mjs https://giftwise-fawn.vercel.app --offers`
Model: gpt-4o-mini. Offers: SerpApi `google_shopping_light`, U.S.

| Case | Ideas | AI est. within budget | Dropped by guard | Distinct | Mentions interests | "A bit cheaper" lowers avg | Real offers in budget (top 2 ideas) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mom $50 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 2/2 |
| Friend $25 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 2/2 |
| Partner $150 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 1/2 |
| Coworker $15 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 0/2 |
| Nephew (12) $40 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 1/2 |
| Dad $100 | 5 | 5/5 | 0 | 5/5 | 5/5 | yes | 2/2 |

## What this says
- The model respects the budget *in its own estimates* every time, and refinement works.
- **Verified-price coverage is 8/12 (67%).** The AI estimate is not the real price. Low budgets ($15) and niche ideas often have no real listing within budget.
- "Mentions interests" is a keyword check, so it is a weak signal of relevance. Real users judge relevance better (see user testing).

## Limits
6 hand-written cases, one run each. The model is non-deterministic, so the numbers will vary between runs.
