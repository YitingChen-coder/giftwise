// Quick risk check: does the OpenAI key work and return schema-shaped JSON?
// Run: node --env-file=.env.local scripts/test-openai.mjs
import OpenAI from "openai";

const client = new OpenAI();
const res = await client.chat.completions.create({
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  messages: [{ role: "user", content: "Suggest one gift under $30 for a friend who likes tea." }],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "idea",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, estPrice: { type: "number" } },
        required: ["name", "estPrice"],
      },
    },
  },
});
console.log("OpenAI OK:", res.choices[0].message.content);
