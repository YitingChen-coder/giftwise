import OpenAI from "openai";
import { z } from "zod";
import type { GiftIdea, Preferences } from "./types";

const IdeaSchema = z.object({
  name: z.string(),
  why: z.string(),
  estPrice: z.number(),
  searchQuery: z.string(),
});
const ResultSchema = z.object({ ideas: z.array(IdeaSchema) });

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Short, specific gift name (a product type, not a brand ad)." },
          why: { type: "string", description: "One or two sentences tying the gift to the recipient's stated interests." },
          estPrice: { type: "number", description: "Typical U.S. retail price in USD. Must be at or below the budget." },
          searchQuery: { type: "string", description: "A 3-7 word Google Shopping query that finds this exact kind of product." },
        },
        required: ["name", "why", "estPrice", "searchQuery"],
      },
    },
  },
  required: ["ideas"],
} as const;

const SYSTEM = `You are GiftWise, a thoughtful holiday gift advisor for U.S. shoppers.
Rules:
- Suggest exactly 5 distinct gift ideas. Vary the type of gift; do not suggest 5 versions of the same thing.
- Every estPrice MUST be at or below the budget. Prefer ideas that are realistically purchasable new from major U.S. retailers at that price.
- Ground each "why" in what the shopper actually said. Do not invent facts about the recipient.
- Never state a real store price; estPrice is only a rough estimate. Real prices are looked up separately.
- searchQuery should be generic enough to return several retailers, but specific enough to match the idea.
- If the shopper gives a refinement, follow it and replace ideas they did not like.`;

let client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("MISSING_OPENAI_KEY");
  client ??= new OpenAI();
  return client;
}

export async function recommendGifts(
  prefs: Preferences,
  previous: GiftIdea[] = [],
  refinement = "",
): Promise<{ ideas: GiftIdea[]; removedOverBudget: number }> {
  const lines = [
    `Recipient: ${prefs.recipient}`,
    `Budget: up to $${prefs.budget} USD`,
    prefs.occasion ? `Occasion: ${prefs.occasion}` : "",
    `What the shopper told us: ${prefs.interests}`,
  ].filter(Boolean);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: lines.join("\n") },
  ];
  if (previous.length && refinement) {
    messages.push({ role: "assistant", content: JSON.stringify({ ideas: previous }) });
    messages.push({ role: "user", content: `Refinement: ${refinement}` });
  }

  const res = await getClient().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    max_completion_tokens: 900,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: "gift_ideas", strict: true, schema: jsonSchema as unknown as Record<string, unknown> },
    },
  });

  const content = res.choices[0]?.message?.content ?? "";
  const parsed = ResultSchema.parse(JSON.parse(content));

  // Server-side guardrail: never show an idea the model itself priced above budget.
  const within = parsed.ideas.filter((i) => i.estPrice > 0 && i.estPrice <= prefs.budget);
  return { ideas: within.slice(0, 5), removedOverBudget: parsed.ideas.length - within.length };
}
