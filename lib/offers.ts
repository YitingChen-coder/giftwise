import type { Offer, OffersResponse } from "./types";

type SerpShoppingResult = {
  title?: string;
  price?: string;
  extracted_price?: number;
  source?: string;
  link?: string;
  product_link?: string;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  delivery?: string;
  rating?: number;
  reviews?: number;
};

const CACHE_MS = 6 * 60 * 60 * 1000; // 6h: protects the free SerpApi quota
const cache = new Map<string, { at: number; data: Omit<OffersResponse, "cached"> }>();

export async function findOffers(query: string, maxPrice: number): Promise<OffersResponse> {
  const key = `${query.toLowerCase()}|${maxPrice}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.data, cached: true };

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("MISSING_SERPAPI_KEY");

  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ engine: "google_shopping_light", q: query, gl: "us", hl: "en", api_key: apiKey }).toString();

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const json = (await res.json()) as { error?: string; shopping_results?: SerpShoppingResult[] };
  if (json.error) {
    if (/run out of searches|plan/i.test(json.error)) throw new Error("SERPAPI_QUOTA");
    if (/hasn't returned any results/i.test(json.error)) {
      return save(key, { query, offers: [], overBudgetCount: 0, fetchedAt: new Date().toISOString() });
    }
    throw new Error("SERPAPI_ERROR");
  }

  const all: Offer[] = (json.shopping_results ?? [])
    .filter((r) => typeof r.extracted_price === "number" && r.extracted_price > 0 && r.title && r.source)
    .map((r) => ({
      title: r.title!,
      price: r.extracted_price!,
      priceText: r.price ?? `$${r.extracted_price!.toFixed(2)}`,
      source: r.source!,
      link: r.product_link || r.link || "",
      thumbnail: r.serpapi_thumbnail || r.thumbnail,
      delivery: typeof r.delivery === "string" ? r.delivery : undefined,
      rating: r.rating,
      reviews: r.reviews,
      match: matchLevel(query, r.title!),
    }))
    .filter((o) => o.link.startsWith("https://"));

  const inBudget = all.filter((o) => o.price <= maxPrice);
  // When a store has several listings, keep its close match rather than a loosely related item.
  const ordered = [...inBudget.filter((o) => o.match === "close"), ...inBudget.filter((o) => o.match !== "close")];

  // Prefer one offer per retailer so the comparison actually spans stores.
  const seen = new Set<string>();
  const picked: Offer[] = [];
  for (const o of ordered) {
    // "eBay - some_seller" and "eBay" count as the same store.
    const s = o.source.split(" - ")[0].trim().toLowerCase();
    if (seen.has(s)) continue;
    seen.add(s);
    picked.push(o);
    if (picked.length === 6) break;
  }
  // Close matches first (cheapest first), then similar items. So the "best price" is never
  // an accessory or a different product that just happens to be cheaper.
  picked.sort((a, b) => (a.match === b.match ? 0 : a.match === "close" ? -1 : 1) || a.price - b.price);

  return save(key, {
    query,
    offers: picked,
    overBudgetCount: all.length - inBudget.length,
    fetchedAt: new Date().toISOString(),
  });
}

function save(key: string, data: Omit<OffersResponse, "cached">): OffersResponse {
  // Don't cache empty results: Google sometimes returns nothing for a query that works a minute later.
  if (data.offers.length) cache.set(key, { at: Date.now(), data });
  return { ...data, cached: false };
}

const STOP = new Set(["the", "and", "for", "with", "set", "kit", "gift", "gifts", "new", "of", "a", "an", "in", "to", "by"]);
const words = (t: string) =>
  t
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w) && (w.length > 2 || /\d/.test(w)))
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));

/**
 * v1 similarity rule: a listing is a "close" match when its title contains at least
 * 60% of the search query's key words (model numbers included), otherwise "similar".
 * E.g. query "insulated gardening gloves": "Women's Insulated Gardening Gloves" is close,
 * "Garden Kneeler Pad" is similar. It is a word check, not product identity (see the v2 plan).
 */
export function matchLevel(query: string, title: string): "close" | "similar" {
  const q = [...new Set(words(query))];
  if (!q.length) return "similar";
  const t = new Set(words(title));
  const hit = q.filter((w) => t.has(w)).length;
  return hit / q.length >= 0.6 ? "close" : "similar";
}
