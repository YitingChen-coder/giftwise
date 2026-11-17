import GiftFinder from "@/components/GiftFinder";

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-forest text-ivory">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <span className="font-display text-2xl tracking-tight">
            <span className="text-gold">✧</span> GiftWise
          </span>
          <span className="text-xs sm:text-sm text-ivory/80">Thoughtful gifts · real prices</span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <GiftFinder />
      </main>

      <footer className="border-t border-line text-xs text-muted">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-1">
          <p>Gift ideas are written by AI (OpenAI). Prices come live from Google Shopping via SerpApi and may exclude shipping and tax. Always confirm on the retailer&apos;s site.</p>
          <p>GiftWise v1 · a class project for Design, Build, Ship (MPCS 51238). Not affiliated with any retailer; no affiliate links.</p>
        </div>
      </footer>
    </div>
  );
}
