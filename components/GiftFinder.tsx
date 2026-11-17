"use client";

import { useRef, useState } from "react";
import type { GiftIdea, OffersResponse, Preferences } from "@/lib/types";

const RECIPIENTS = [
  { label: "Partner", icon: "♥" },
  { label: "Mom", icon: "✿" },
  { label: "Dad", icon: "☕" },
  { label: "Friend", icon: "✦" },
  { label: "Sibling", icon: "☺" },
  { label: "Coworker", icon: "✉" },
];
const BUDGETS = [25, 50, 100, 200];
const OCCASIONS = ["Christmas", "Hanukkah", "Birthday", "Secret Santa", "Thank-you gift"];
const REFINES = ["A bit cheaper", "More practical", "More personal", "An experience, not a thing"];
const EXAMPLES = [
  "Loves baking and plants, just moved into a small apartment, drinks a lot of tea.",
  "Into hiking and film photography. Already has a good camera.",
  "Always cold, reads mystery novels, works from home.",
];

type OfferState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: OffersResponse };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
    active
      ? "border-forest bg-forest text-ivory shadow-sm"
      : "border-line bg-white text-charcoal hover:-translate-y-px hover:border-forest/60 hover:shadow-sm"
  }`;

export default function GiftFinder() {
  const [recipient, setRecipient] = useState("");
  const [budget, setBudget] = useState<string>("50");
  const [occasion, setOccasion] = useState("Christmas");
  const [interests, setInterests] = useState("");

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refinement, setRefinement] = useState("");
  const [lastRefine, setLastRefine] = useState("");
  const [offers, setOffers] = useState<Record<string, OfferState>>({});
  const [open, setOpen] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function requestIdeas(p: Preferences, refine?: string) {
    setLoading(true);
    setError("");
    if (!refine) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(refine ? { prefs: p, previous: ideas, refinement: refine } : { prefs: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setPrefs(p);
      setIdeas(data.ideas);
      setOpen(null);
      setRefinement("");
      setLastRefine(refine ?? "");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const b = Number(budget);
    if (!recipient.trim()) return setError("Who is the gift for?");
    if (!Number.isFinite(b) || b < 5 || b > 2000) return setError("Please enter a budget between $5 and $2,000.");
    if (interests.trim().length < 3) return setError("Tell us a little about them: hobbies, what they like, anything.");
    requestIdeas({ recipient: recipient.trim(), budget: b, interests: interests.trim(), occasion });
  }

  async function compare(idea: GiftIdea) {
    const key = idea.searchQuery;
    setOpen((cur) => (cur === key ? null : key));
    if (!prefs || offers[key]?.status === "done" || offers[key]?.status === "loading") return;
    setOffers((o) => ({ ...o, [key]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/offers?${new URLSearchParams({ q: key, max: String(prefs.budget) })}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load prices.");
      setOffers((o) => ({ ...o, [key]: { status: "done", data } }));
    } catch (e) {
      setOffers((o) => ({ ...o, [key]: { status: "error", message: e instanceof Error ? e.message : "Couldn't load prices." } }));
    }
  }

  function startOver() {
    setPrefs(null);
    setIdeas([]);
    setOffers({});
    setOpen(null);
    setError("");
    setLastRefine("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const firstLoad = loading && !prefs;
  const recipientLabel = prefs
    ? prefs.recipient.toLowerCase().startsWith("my ")
      ? prefs.recipient
      : `your ${prefs.recipient.toLowerCase()}`
    : "";

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section aria-labelledby="intro" className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-forest">
          <span className="text-gold">✦</span> Holiday gift finder
        </p>
        <h1 id="intro" className="mt-5 font-display text-[2.4rem] leading-[1.05] tracking-tight text-forest sm:text-6xl">
          Find a gift they&apos;ll love,
          <br />
          <span className="italic text-burgundy">at a price that makes sense.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Describe the person. Get five thoughtful ideas within your budget, then compare real prices from different stores.
        </p>
        <ol className="mt-7 grid grid-cols-3 gap-2 text-xs sm:max-w-lg sm:text-sm" aria-label="How it works">
          {["Describe them", "Get 5 ideas", "Compare prices"].map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-line">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-semibold text-ivory">
                {i + 1}
              </span>
              <span className="font-medium leading-tight text-charcoal">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Form */}
      <form
        onSubmit={onSubmit}
        onChange={() => error && setError("")}
        onClickCapture={(e) => {
          if (error && (e.target as HTMLElement).closest("button[type=button]")) setError("");
        }}
        className="overflow-hidden rounded-3xl bg-paper shadow-[0_1px_0_rgba(22,61,50,0.04),0_12px_40px_-12px_rgba(22,61,50,0.18)] ring-1 ring-line"
      >
        <div className="h-1.5 bg-gradient-to-r from-forest via-gold to-burgundy" aria-hidden />
        <div className="space-y-8 p-5 sm:p-8">
          <fieldset>
            <legend className="flex items-center gap-3 font-display text-xl text-forest">
              <StepDot n={1} /> Who is it for?
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {RECIPIENTS.map((r) => (
                <button type="button" key={r.label} onClick={() => setRecipient(r.label)} aria-pressed={recipient === r.label} className={chip(recipient === r.label)}>
                  <span aria-hidden className={recipient === r.label ? "text-gold" : "text-muted"}>
                    {r.icon}
                  </span>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="text-sm text-muted">Someone else? Type it</span>
              <input
                value={RECIPIENTS.some((r) => r.label === recipient) ? "" : recipient}
                onChange={(e) => setRecipient(e.target.value)}
                maxLength={80}
                placeholder="e.g. my 12-year-old nephew"
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-charcoal placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
              />
            </label>
          </fieldset>

          <fieldset>
            <legend className="flex items-center gap-3 font-display text-xl text-forest">
              <StepDot n={2} /> What&apos;s your budget?
            </legend>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {BUDGETS.map((b) => (
                <button type="button" key={b} onClick={() => setBudget(String(b))} aria-pressed={budget === String(b)} className={chip(budget === String(b))}>
                  up to ${b}
                </button>
              ))}
              <label className="flex items-center rounded-full border border-line bg-white pl-4 pr-1 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
                <span className="text-sm text-muted">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={2000}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  aria-label="Maximum budget in US dollars"
                  className="w-20 bg-transparent px-1.5 py-2 text-sm font-medium text-charcoal focus:outline-none"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="flex items-center gap-3 font-display text-xl text-forest">
              <StepDot n={3} /> Tell us about them
            </legend>
            <label className="mt-4 block">
              <span className="sr-only">About the recipient</span>
              <textarea
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Hobbies, what they love, what they already have…"
                className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 leading-relaxed text-charcoal placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Try an example:</span>
              {EXAMPLES.map((ex, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setInterests(ex)}
                  className="rounded-full bg-ivory px-2.5 py-1 text-forest ring-1 ring-line hover:ring-forest/50"
                >
                  {ex.split(",")[0].split(".")[0]}
                </button>
              ))}
            </div>
            <label className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
              Occasion
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-charcoal focus:border-forest focus:outline-none"
              >
                {OCCASIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          </fieldset>

          {error && !prefs && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-burgundy/8 px-4 py-3 text-sm text-burgundy ring-1 ring-burgundy/20">
              <span aria-hidden>!</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-burgundy px-8 py-4 text-base font-semibold text-ivory shadow-lg shadow-burgundy/20 transition hover:bg-[#7a1f2e] hover:shadow-xl disabled:opacity-70 sm:w-auto"
          >
            {firstLoad ? (
              <>
                <Spinner /> Finding ideas…
              </>
            ) : (
              <>
                <span className="text-gold transition group-hover:rotate-12" aria-hidden>
                  ✦
                </span>
                Find gift ideas
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      <div ref={resultsRef} className="scroll-mt-20">
        {firstLoad && <SkeletonList />}

        {prefs && (
          <section aria-labelledby="results" className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Your ideas</p>
              <h2 id="results" className="mt-1 font-display text-3xl leading-tight text-forest">
                For {recipientLabel}, <span className="text-burgundy">up to {money(prefs.budget)}</span>
              </h2>
              <p className="mt-2 text-sm text-muted">
                Tap <strong className="text-forest">Compare prices</strong> on any idea to see what real stores charge today.{" "}
                <a href="#refine-box" className="whitespace-nowrap font-medium text-burgundy underline underline-offset-2">
                  Not quite right? Adjust ↓
                </a>
              </p>
              {lastRefine && (
                <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-sm text-charcoal">
                  <span className="text-forest">✓</span> Updated: “{lastRefine}”
                </p>
              )}
            </div>

            <ol className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
              {ideas.map((idea, i) => {
                const st = offers[idea.searchQuery];
                const isOpen = open === idea.searchQuery;
                const best = st?.status === "done" ? st.data.offers[0] : undefined;
                return (
                  <li
                    key={idea.searchQuery + i}
                    className={`overflow-hidden rounded-2xl bg-paper ring-1 transition-all ${
                      isOpen ? "shadow-lg ring-forest/30" : "shadow-sm ring-line hover:shadow-md"
                    }`}
                  >
                    <div className="flex gap-4 p-5 sm:p-6">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-lg text-forest ring-1 ring-gold/40">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <h3 className="font-display text-xl leading-snug text-charcoal">{idea.name}</h3>
                          <span className="rounded-full bg-ivory px-2.5 py-0.5 text-xs text-muted ring-1 ring-line" title="AI's rough estimate, not a store price">
                            ~{money(idea.estPrice)} · AI estimate
                          </span>
                        </div>
                        <p className="mt-2 text-[15px] leading-relaxed text-charcoal/85">{idea.why}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => compare(idea)}
                            aria-expanded={isOpen}
                            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                              isOpen ? "bg-white text-forest ring-1 ring-forest" : "bg-forest text-ivory shadow-sm hover:bg-forest-soft"
                            }`}
                          >
                            {isOpen ? "Hide prices" : "Compare prices"}
                            <span aria-hidden className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                              ⌄
                            </span>
                          </button>
                          {best && !isOpen && (
                            <span className="text-sm text-muted">
                              from <strong className="text-forest">{best.priceText}</strong> at {best.source.split(" - ")[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isOpen && <OffersPanel state={st} budget={prefs.budget} />}
                  </li>
                );
              })}
            </ol>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (refinement.trim()) requestIdeas(prefs, refinement.trim());
              }}
              id="refine-box" className="scroll-mt-20 space-y-4 rounded-2xl bg-forest p-5 text-ivory sm:p-6"
            >
              <div>
                <label htmlFor="refine" className="font-display text-xl">
                  Not quite right?
                </label>
                <p className="text-sm text-ivory/75">Tell us what to change. We&apos;ll keep what you already told us.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {REFINES.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRefinement(r)}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                      refinement === r ? "bg-gold text-forest" : "bg-white/10 text-ivory hover:bg-white/20"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="refine"
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. she already has a lot of kitchen stuff"
                  className="flex-1 rounded-full bg-white px-5 py-3 text-charcoal placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  type="submit"
                  disabled={loading || !refinement.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-forest transition hover:brightness-105 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Spinner /> Updating…
                    </>
                  ) : (
                    "Update ideas"
                  )}
                </button>
              </div>
              {error && (
                <p role="alert" className="text-sm text-gold">
                  {error}
                </p>
              )}
            </form>

            <button onClick={startOver} className="text-sm font-medium text-muted underline-offset-4 hover:text-forest hover:underline">
              ← Start over with someone else
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-forest font-sans text-sm font-semibold text-ivory" aria-hidden>
      {n}
    </span>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

function SkeletonList() {
  return (
    <div aria-live="polite" className="space-y-4">
      <p className="text-sm text-muted">Thinking about who they are and what fits your budget…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded-2xl bg-paper p-6 ring-1 ring-line">
          <div className="h-10 w-10 rounded-full bg-line" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-1/2 rounded bg-line" />
            <div className="h-3 w-full rounded bg-line/70" />
            <div className="h-3 w-4/5 rounded bg-line/70" />
            <div className="h-9 w-36 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OffersPanel({ state, budget }: { state?: OfferState; budget: number }) {
  if (!state || state.status === "loading") {
    return (
      <div className="flex items-center gap-2 border-t border-line bg-ivory/60 px-6 py-5 text-sm text-muted" aria-live="polite">
        <Spinner /> Checking stores for real prices…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="border-t border-line bg-burgundy/5 px-6 py-5 text-sm text-burgundy">
        {state.message}
      </div>
    );
  }
  const { offers, fetchedAt, overBudgetCount } = state.data;
  const time = new Date(fetchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const [best, ...rest] = offers;

  return (
    <div className="border-t border-line bg-ivory/70 px-4 py-5 sm:px-6" aria-live="polite">
      {offers.length === 0 ? (
        <p className="text-sm text-muted">
          We didn&apos;t find store listings for this idea within {money(budget)}
          {overBudgetCount > 0 ? ` (${overBudgetCount} listings were over budget)` : ""}. Try another idea, or adjust the ideas below.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest">Price comparison</p>
            <p className="text-xs text-muted">
              {offers.length} store{offers.length > 1 ? "s" : ""} within budget
            </p>
          </div>

          {/* Best price, highlighted */}
          <OfferRow offer={best} highlight />

          {rest.length > 0 && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-white ring-1 ring-line">
              {rest.map((o, i) => (
                <li key={o.link + i}>
                  <OfferRow offer={o} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Prices from Google Shopping (via SerpApi), checked {time}. “View” opens the Google Shopping listing, where you can go to the store.
        Listings are similar products, not always the identical item. Shipping and tax may not be included.{" "}
        <strong>Price history isn&apos;t available yet</strong>; it&apos;s planned for the next version, and we won&apos;t guess it.
      </p>
    </div>
  );
}

function OfferRow({ offer: o, highlight = false }: { offer: OffersResponse["offers"][number]; highlight?: boolean }) {
  const store = o.source.split(" - ")[0];
  return (
    <div className={`flex items-center gap-3 p-3 ${highlight ? "mt-3 rounded-xl bg-white ring-2 ring-gold shadow-sm" : ""}`}>
      {o.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={o.thumbnail} alt="" className={`${highlight ? "h-16 w-16" : "h-12 w-12"} shrink-0 rounded-lg bg-white object-contain ring-1 ring-line`} loading="lazy" />
      ) : (
        <div className={`${highlight ? "h-16 w-16" : "h-12 w-12"} shrink-0 rounded-lg bg-ivory`} />
      )}
      <div className="min-w-0 flex-1">
        {highlight && <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-burgundy">Best price</p>}
        <p className="truncate text-sm font-semibold text-charcoal">{store}</p>
        <p className="truncate text-xs text-muted" title={o.title}>
          {o.title}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
          {o.rating ? (
            <span>
              <span className="text-gold">★</span> {o.rating}
              {o.reviews ? ` (${o.reviews.toLocaleString()})` : ""}
            </span>
          ) : null}
          {o.delivery && <span className="text-forest">{o.delivery}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-semibold text-forest ${highlight ? "text-xl" : "text-base"}`}>{o.priceText}</p>
        <a
          href={o.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold transition ${
            highlight ? "bg-burgundy text-ivory hover:bg-[#7a1f2e]" : "text-burgundy ring-1 ring-burgundy/30 hover:bg-burgundy/5"
          }`}
        >
          View ↗<span className="sr-only"> offer from {store} on Google Shopping (opens in new tab)</span>
        </a>
      </div>
    </div>
  );
}
