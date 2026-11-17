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
    }))
    .filter((o) => o.link.startsWith("https://"));

  const inBudget = all.filter((o) => o.price <= maxPrice);

  // Prefer one offer per retailer so the comparison actually spans stores.
  const seen = new Set<string>();
  const picked: Offer[] = [];
  for (const o of inBudget) {
    // "eBay - some_seller" and "eBay" count as the same store.
    const s = o.source.split(" - ")[0].trim().toLowerCase();
    if (seen.has(s)) continue;
    seen.add(s);
    picked.push(o);
    if (picked.length === 6) break;
  }
  picked.sort((a, b) => a.price - b.price);

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
