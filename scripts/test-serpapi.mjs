// Quick risk check: does SerpApi Google Shopping return offers with the fields we need?
// Uses 1 search from the free monthly quota.
// Run: node --env-file=.env.local scripts/test-serpapi.mjs "loose leaf tea sampler"
const q = process.argv[2] || "loose leaf tea sampler";
const url = new URL("https://serpapi.com/search.json");
url.search = new URLSearchParams({
  engine: "google_shopping_light", q, gl: "us", hl: "en", api_key: process.env.SERPAPI_API_KEY ?? "",
}).toString();
const res = await fetch(url);
const data = await res.json();
if (data.error) { console.error("SerpApi error:", data.error); process.exit(1); }
const rows = (data.shopping_results ?? []).slice(0, 5).map((r) => ({
  title: r.title, price: r.extracted_price, source: r.source,
  link: r.product_link || r.link, thumbnail: Boolean(r.thumbnail),
}));
console.table(rows);
console.log("total results:", data.shopping_results?.length ?? 0);
