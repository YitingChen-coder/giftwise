import { NextResponse } from "next/server";
import { z } from "zod";
import { findOffers } from "@/lib/offers";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const Query = z.object({
  q: z.string().trim().min(2).max(120),
  max: z.coerce.number().min(1).max(2000),
});

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const parsed = Query.safeParse({ q: sp.get("q"), max: sp.get("max") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid search." }, { status: 400 });

  if (!rateLimit(`off:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You've compared a lot of prices this hour. Please try again a bit later." }, { status: 429 });
  }
  try {
    return NextResponse.json(await findOffers(parsed.data.q, parsed.data.max));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("offers failed:", msg);
    if (msg === "SERPAPI_QUOTA") {
      return NextResponse.json({ error: "Live price lookups are used up for this month on our free plan. Gift ideas still work." }, { status: 503 });
    }
    if (msg === "MISSING_SERPAPI_KEY") {
      return NextResponse.json({ error: "Live price lookups aren't connected yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "We couldn't reach the price source just now. Please try again." }, { status: 502 });
  }
}
