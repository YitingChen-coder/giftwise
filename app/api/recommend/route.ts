import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendGifts } from "@/lib/recommend";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const Body = z.object({
  prefs: z.object({
    recipient: z.string().trim().min(1).max(80),
    budget: z.number().min(5).max(2000),
    interests: z.string().trim().min(3).max(600),
    occasion: z.string().trim().max(60).optional(),
  }),
  previous: z
    .array(z.object({ name: z.string().max(200), why: z.string().max(600), estPrice: z.number(), searchQuery: z.string().max(120) }))
    .max(8)
    .optional(),
  refinement: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`rec:${clientIp(req)}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You've asked for a lot of ideas this hour. Please try again a bit later." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in who it's for, a budget between $5 and $2,000, and a few details about them." }, { status: 400 });
  }
  try {
    const { prefs, previous, refinement } = parsed.data;
    const result = await recommendGifts(prefs, previous, refinement);
    if (!result.ideas.length) {
      return NextResponse.json({ error: "We couldn't find ideas that fit that budget. Try a higher budget or different details." }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("recommend failed:", msg);
    if (msg === "MISSING_OPENAI_KEY") {
      return NextResponse.json({ error: "GiftWise isn't connected to its AI service yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Something went wrong while thinking up ideas. Please try again." }, { status: 502 });
  }
}
