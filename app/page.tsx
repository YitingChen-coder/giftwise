import GiftFinder from "@/components/GiftFinder";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line/80 bg-ivory/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <span className="font-display text-2xl tracking-tight text-forest">
            <span className="text-gold">✧</span> GiftWise<span className="text-burgundy">.</span>
          </span>
          <span className="hidden text-sm text-muted sm:inline">Thoughtful gifts · real prices</span>
        </div>
      </header>

      <main className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top_right,rgba(199,165,106,0.22),transparent_60%),radial-gradient(ellipse_at_top_left,rgba(22,61,50,0.08),transparent_55%)]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
          <GiftFinder />
        </div>
      </main>

      <footer className="border-t border-line bg-paper text-xs text-muted">
        <div className="mx-auto max-w-3xl space-y-1.5 px-4 py-7">
          <p>
            Gift ideas are written by AI (OpenAI). Prices come live from Google Shopping via SerpApi and may exclude shipping and tax.
            Always confirm on the retailer&apos;s site.
          </p>
          <p>GiftWise v1 · a class project for Design, Build, Ship (MPCS 51238). Not affiliated with any retailer; no affiliate links.</p>
        </div>
      </footer>
    </div>
  );
}
