"use client";

import { useRef, useState } from "react";
import type { GiftIdea, OffersResponse, Preferences } from "@/lib/types";

const RECIPIENTS = ["Partner", "Mom", "Dad", "Friend", "Sibling", "Coworker"];
const BUDGETS = [25, 50, 100, 200];
const OCCASIONS = ["Christmas", "Hanukkah", "Birthday", "Secret Santa", "Thank-you gift"];
const REFINES = ["A bit cheaper", "More practical", "More personal", "Something to experience, not a thing"];

type OfferState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: OffersResponse };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 });

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
  const [offers, setOffers] = useState<Record<string, OfferState>>({});
  const [open, setOpen] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function requestIdeas(p: Preferences, refine?: string) {
    setLoading(true);
    setError("");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="intro">
        <h1 id="intro" className="font-display text-3xl sm:text-4xl leading-tight text-forest">
          Find a gift they&apos;ll love, <span className="text-burgundy italic">at a price that makes sense.</span>
        </h1>
        <p className="mt-3 text-muted max-w-xl">
          Tell us who you&apos;re shopping for and your budget. We&apos;ll suggest five ideas, then show real prices from
          different stores so you know where to buy.
        </p>
      </section>

      <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-paper p-5 sm:p-7 shadow-sm space-y-6">
        <fieldset>
          <legend className="font-medium text-forest">1. Who is it for?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {RECIPIENTS.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRecipient(r)}
                aria-pressed={recipient === r}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  recipient === r ? "bg-forest text-ivory border-forest" : "border-line bg-white hover:border-forest"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm text-muted">
            Or type it:
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              maxLength={80}
              placeholder="e.g. my 12-year-old nephew"
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-charcoal"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend className="font-medium text-forest">2. What&apos;s your budget?</legend>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {BUDGETS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setBudget(String(b))}
                aria-pressed={budget === String(b)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  budget === String(b) ? "bg-forest text-ivory border-forest" : "border-line bg-white hover:border-forest"
                }`}
              >
                up to ${b}
              </button>
            ))}
            <label className="flex items-center gap-1 text-sm text-muted">
              <span>or $</span>
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={2000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-label="Maximum budget in US dollars"
                className="w-24 rounded-lg border border-line bg-white px-3 py-1.5 text-charcoal"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-medium text-forest">3. Tell us about them</legend>
          <label className="mt-3 block">
            <span className="sr-only">About the recipient</span>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="e.g. She loves baking and plants, just moved into a small apartment, and drinks a lot of tea."
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-charcoal"
            />
          </label>
          <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            Occasion
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-charcoal"
            >
              {OCCASIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </fieldset>

        {error && !prefs && (
          <p role="alert" className="rounded-lg bg-burgundy/10 px-3 py-2 text-sm text-burgundy">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto rounded-full bg-burgundy px-6 py-3 font-medium text-ivory shadow-sm hover:bg-burgundy/90 disabled:opacity-60"
        >
          {loading && !prefs ? "Thinking of ideas…" : "Find gift ideas"}
        </button>
      </form>

      {prefs && (
        <section ref={resultsRef} aria-labelledby="results" className="space-y-5 scroll-mt-6">
          <div>
            <h2 id="results" className="font-display text-2xl text-forest">
              Ideas for {prefs.recipient.toLowerCase().startsWith("my ") ? prefs.recipient : `your ${prefs.recipient.toLowerCase()}`}, up to {money(prefs.budget)}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Pick an idea and tap <strong>Compare prices</strong> to see what real stores charge today.
            </p>
          </div>

          <ol className="space-y-4">
            {ideas.map((idea, i) => {
              const st = offers[idea.searchQuery];
              const isOpen = open === idea.searchQuery;
              return (
                <li key={idea.searchQuery + i} className="rounded-2xl border border-line bg-paper shadow-sm">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg text-charcoal">
                        <span className="text-gold mr-1">{i + 1}.</span> {idea.name}
                      </h3>
                      <span className="shrink-0 text-right text-sm text-muted" title="AI's rough estimate, not a store price">
                        ~{money(idea.estPrice)}
                        <span className="block text-[11px] uppercase tracking-wide">AI estimate</span>
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-charcoal/90">{idea.why}</p>
                    <button
                      onClick={() => compare(idea)}
                      aria-expanded={isOpen}
                      className="mt-4 rounded-full border border-forest px-4 py-1.5 text-sm font-medium text-forest hover:bg-forest hover:text-ivory"
                    >
                      {isOpen ? "Hide prices" : "Compare prices"}
                    </button>
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
            className="rounded-2xl border border-dashed border-gold bg-paper p-5 space-y-3"
          >
            <label htmlFor="refine" className="block font-medium text-forest">
              Not quite right? Tell us what to change.
            </label>
            <div className="flex flex-wrap gap-2">
              {REFINES.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRefinement(r)}
                  className="rounded-full border border-line bg-white px-3 py-1 text-sm hover:border-forest"
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="refine"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                maxLength={300}
                placeholder="e.g. she already has a lot of kitchen stuff"
                className="flex-1 rounded-lg border border-line bg-white px-3 py-2"
              />
              <button
                type="submit"
                disabled={loading || !refinement.trim()}
                className="rounded-full bg-forest px-5 py-2 text-sm font-medium text-ivory disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update ideas"}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-burgundy">
                {error}
              </p>
            )}
          </form>

          <button onClick={startOver} className="text-sm text-muted underline underline-offset-4 hover:text-forest">
            ← Start over with someone else
          </button>
        </section>
      )}
    </div>
  );
}

function OffersPanel({ state, budget }: { state?: OfferState; budget: number }) {
  if (!state || state.status === "loading") {
    return (
      <div className="border-t border-line px-5 py-4 text-sm text-muted" aria-live="polite">
        Checking stores for real prices…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="border-t border-line px-5 py-4 text-sm text-burgundy">
        {state.message}
      </div>
    );
  }
  const { offers, fetchedAt, overBudgetCount } = state.data;
  const time = new Date(fetchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="border-t border-line bg-ivory/60 px-5 py-4 rounded-b-2xl" aria-live="polite">
      {offers.length === 0 ? (
        <p className="text-sm text-muted">
          We didn&apos;t find store listings for this idea within {money(budget)}
          {overBudgetCount > 0 ? ` (${overBudgetCount} listings were over budget)` : ""}. Try another idea, or update the ideas
          below.
        </p>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wide text-muted">
            {offers.length} store{offers.length > 1 ? "s" : ""} within budget · lowest first
          </p>
          <ul className="mt-3 divide-y divide-line">
            {offers.map((o, i) => (
              <li key={o.link + i} className="flex items-center gap-3 py-3">
                {o.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-md bg-white object-contain" loading="lazy" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-md bg-white" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{o.source}</p>
                  <p className="truncate text-xs text-muted" title={o.title}>
                    {o.title}
                  </p>
                  {o.rating ? (
                    <p className="text-xs text-muted">
                      ★ {o.rating}
                      {o.reviews ? ` (${o.reviews.toLocaleString()})` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-forest">
                    {o.priceText}
                    {i === 0 && offers.length > 1 && (
                      <span className="ml-1 rounded bg-gold/25 px-1.5 py-0.5 text-[10px] font-medium uppercase text-charcoal">Lowest</span>
                    )}
                  </p>
                  <a
                    href={o.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-xs text-burgundy underline underline-offset-2"
                  >
                    View ↗<span className="sr-only"> at {o.source} (opens in new tab)</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Prices from Google Shopping (via SerpApi), checked {time}. Listings are similar products, not always the identical
        item. Shipping and tax may not be included. <strong>Price history isn&apos;t available yet</strong>; it&apos;s planned
        for the next version, and we won&apos;t guess it.
      </p>
    </div>
  );
}
