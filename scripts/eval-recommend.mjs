// Small recommendation eval against a running GiftWise (local or live).
// Checks what the proposal said "useful" means: within budget, 5 distinct ideas,
// reasons tied to what the shopper said, and refinement that actually changes the list.
// Run: node scripts/eval-recommend.mjs [baseUrl] [--offers]   (default http://localhost:3000)
const base = process.argv[2] || "http://localhost:3000";

const cases = [
  { recipient: "Mom", budget: 50, interests: "loves gardening and audiobooks, has bad knees", keywords: ["garden", "audio", "knee", "plant"] },
  { recipient: "Friend", budget: 25, interests: "drinks a lot of tea, just moved to a tiny apartment", keywords: ["tea", "apartment", "small", "space"] },
  { recipient: "Partner", budget: 150, interests: "into film photography and hiking", keywords: ["film", "photo", "camera", "hik", "trail"] },
  { recipient: "Coworker", budget: 15, interests: "Secret Santa, I only know he likes coffee", keywords: ["coffee"] },
  { recipient: "my 12-year-old nephew", budget: 40, interests: "Minecraft, Lego, and science videos", keywords: ["build", "lego", "science", "minecraft", "block"] },
  { recipient: "Dad", budget: 100, interests: "grills every weekend and follows baseball", keywords: ["grill", "bbq", "baseball", "barbecue"] },
];

async function recommend(body) {
  const res = await fetch(`${base}/api/recommend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const avg = (a) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
const rows = [];

for (const c of cases) {
  const { keywords, ...prefs } = c;
  const label = `${prefs.recipient} $${prefs.budget}`;
  const { status, data } = await recommend({ prefs });
  if (status !== 200) {
    rows.push({ case: label, error: data.error });
    continue;
  }
  const ideas = data.ideas;
  const withinBudget = ideas.filter((i) => i.estPrice <= prefs.budget).length;
  const distinct = new Set(ideas.map((i) => i.name.toLowerCase())).size;
  const grounded = ideas.filter((i) => keywords.some((k) => `${i.name} ${i.why}`.toLowerCase().includes(k))).length;

  const r2 = await recommend({ prefs, previous: ideas, refinement: "A bit cheaper" });
  const cheaper = r2.status === 200 && avg(r2.data.ideas.map((i) => i.estPrice)) < avg(ideas.map((i) => i.estPrice));

  // Verified-price coverage: do real store listings exist within budget for the top ideas?
  // Costs 1 SerpApi search per idea checked, so only runs with --offers.
  let coverage = "skipped";
  if (process.argv.includes("--offers")) {
    let found = 0;
    const top = ideas.slice(0, 2);
    for (const i of top) {
      const r = await fetch(`${base}/api/offers?${new URLSearchParams({ q: i.searchQuery, max: String(prefs.budget) })}`);
      const d = await r.json();
      if (r.ok && d.offers.length) found += 1;
    }
    coverage = `${found}/${top.length}`;
  }

  rows.push({
    case: label,
    ideas: ideas.length,
    withinBudget: `${withinBudget}/${ideas.length}`,
    droppedByGuard: data.removedOverBudget,
    distinct: `${distinct}/${ideas.length}`,
    mentionsInterests: `${grounded}/${ideas.length}`,
    refineCheaper: cheaper ? "yes" : "no",
    realOffersInBudget: coverage,
  });
}
console.table(rows);
