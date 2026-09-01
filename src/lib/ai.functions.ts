import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

async function callGateway(messages: Array<{ role: string; content: ChatContent }>) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("The stylist is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep styling.");
    throw new Error(`AI request failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

/* ---------------------------------- tagging --------------------------------- */

export type GarmentAnalysis = {
  name: string;
  category: string;
  subtype: string;
  primary_color: string;
  color_hex: string;
  pattern: string;
  material: string;
  seasons: string[];
  formality: string;
  tags: string[];
};

export const analyzeGarment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ imageDataUrl: z.string().min(20) }).parse(d))
  .handler(async ({ data }): Promise<GarmentAnalysis> => {
    const raw = await callGateway([
      {
        role: "system",
        content:
          "You tag clothing photos for a digital wardrobe. Reply with ONLY a JSON object, no prose. " +
          'Shape: {"name":string (short, e.g. "Cream linen shirt"),"category":one of ["top","bottom","dress","outerwear","shoes","bag","accessory","other"],' +
          '"subtype":string,"primary_color":string,"color_hex":"#RRGGBB","pattern":string,"material":string,' +
          '"seasons":array of ["spring","summer","autumn","winter"],"formality":one of ["casual","smart casual","work","formal","evening","sport"],"tags":array of 3-6 short lowercase keywords}',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Tag this garment." },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);

    const parsed = parseJson<Partial<GarmentAnalysis>>(raw);
    return {
      name: parsed.name || "Wardrobe item",
      category: normalizeCategory(parsed.category),
      subtype: parsed.subtype || "",
      primary_color: (parsed.primary_color || "").toLowerCase(),
      color_hex: /^#[0-9a-f]{6}$/i.test(parsed.color_hex ?? "") ? parsed.color_hex! : "#B0B0B0",
      pattern: (parsed.pattern || "solid").toLowerCase(),
      material: (parsed.material || "").toLowerCase(),
      seasons: Array.isArray(parsed.seasons)
        ? parsed.seasons.map((s) => String(s).toLowerCase()).filter((s) => SEASONS.includes(s))
        : [],
      formality: (parsed.formality || "casual").toLowerCase(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase()).slice(0, 6) : [],
    };

  });

/* ------------------------------ recommendations ----------------------------- */

const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  subtype: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  formality: z.string().nullable().optional(),
  seasons: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type OutfitSuggestion = {
  title: string;
  item_ids: string[];
  rationale: string;
  styling_tip: string;
};

export const generateOutfits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        items: z.array(ItemSchema).min(2),
        occasion: z.string().default("any"),
        weather: z.string().default("mild"),
        mood: z.string().default(""),
        palette: z.string().default(""),
        preferences: z.string().default(""),
        count: z.number().min(1).max(4).default(3),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<OutfitSuggestion[]> => {
    const raw = await callGateway([
      {
        role: "system",
        content:
          "You are a warm, encouraging personal stylist. You build outfits ONLY from the wardrobe items given, " +
          "using their exact ids. Never invent items. Reply with ONLY a JSON array, no prose. " +
          'Each element: {"title":string,"item_ids":string[] (2-5 real ids),"rationale":string (1-2 sentences on why these pieces work together — colour, proportion, formality),"styling_tip":string (one short practical tip)}',
      },
      {
        role: "user",
        content: JSON.stringify({
          request: {
            occasion: data.occasion,
            weather: data.weather,
            mood: data.mood,
            palette: data.palette,
            outfits_wanted: data.count,
          },
          style_preferences: data.preferences,
          wardrobe: data.items,
        }),
      },
    ]);

    const parsed = parseJson<OutfitSuggestion[]>(raw);
    const valid = new Set(data.items.map((i) => i.id));
    return (Array.isArray(parsed) ? parsed : [])
      .map((o) => ({
        title: o.title || "Outfit",
        item_ids: (o.item_ids || []).filter((id) => valid.has(id)),
        rationale: o.rationale || "",
        styling_tip: o.styling_tip || "",
      }))
      .filter((o) => o.item_ids.length >= 2);
  });

/* --------------------------------- stylist ---------------------------------- */

export const askStylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
        items: z.array(ItemSchema),
        preferences: z.string().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<string> => {
    return callGateway([
      {
        role: "system",
        content:
          "You are Atelier, a friendly, encouraging, never judgemental personal stylist. Keep answers short " +
          "(under 130 words), concrete and practical. Reference the user's real wardrobe items by name when " +
          "relevant, and help them rediscover what they already own.\n\nWardrobe: " +
          JSON.stringify(data.items) +
          "\n\nStyle preferences: " +
          (data.preferences || "none recorded"),
      },
      ...data.history,
    ]);
  });

/* ------------------------------- outfit check ------------------------------- */

export type OutfitCheck = {
  score: number;
  verdict: string;
  works: string[];
  improve: string[];
  swap_suggestion: string;
};

export const checkOutfit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        imageDataUrl: z.string().min(20),
        context: z.string().default(""),
        items: z.array(ItemSchema),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<OutfitCheck> => {
    const raw = await callGateway([
      {
        role: "system",
        content:
          "You review a photo of someone's outfit as a kind, encouraging stylist. Never comment on body, weight " +
          "or appearance — only the clothes. Reply with ONLY JSON: " +
          '{"score":number 1-10,"verdict":string (one warm sentence),"works":string[] (2-3 things that work),' +
          '"improve":string[] (1-3 gentle suggestions),"swap_suggestion":string (one swap using an item from their wardrobe list, by name)}',
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Context: ${data.context || "no extra context"}.\nWardrobe available: ${JSON.stringify(
              data.items.map((i) => ({ name: i.name, category: i.category, color: i.primary_color })),
            )}`,
          },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);

    const parsed = parseJson<Partial<OutfitCheck>>(raw);
    return {
      score: typeof parsed.score === "number" ? parsed.score : 7,
      verdict: parsed.verdict || "Nice work.",
      works: parsed.works ?? [],
      improve: parsed.improve ?? [],
      swap_suggestion: parsed.swap_suggestion || "",
    };
  });

/* --------------------------------- shopping --------------------------------- */

export type ShoppingVerdict = {
  item_name: string;
  compatibility: number;
  recommendation: string;
  pairs_with: string[];
  already_similar: string[];
};

export const checkPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ imageDataUrl: z.string().min(20), items: z.array(ItemSchema) }).parse(d),
  )
  .handler(async ({ data }): Promise<ShoppingVerdict> => {
    const raw = await callGateway([
      {
        role: "system",
        content:
          "A shopper is considering buying the item in the photo. Judge how well it fits their existing wardrobe. " +
          "Reply with ONLY JSON: " +
          '{"item_name":string,"compatibility":number 0-100,"recommendation":string (2 sentences, honest and friendly),' +
          '"pairs_with":string[] (names of owned items it pairs with),"already_similar":string[] (names of owned items that are near-duplicates)}',
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Their wardrobe: ${JSON.stringify(
              data.items.map((i) => ({
                name: i.name,
                category: i.category,
                color: i.primary_color,
                formality: i.formality,
              })),
            )}`,
          },
          { type: "image_url", image_url: { url: data.imageDataUrl } },
        ],
      },
    ]);

    const parsed = parseJson<Partial<ShoppingVerdict>>(raw);
    return {
      item_name: parsed.item_name || "This piece",
      compatibility: typeof parsed.compatibility === "number" ? parsed.compatibility : 50,
      recommendation: parsed.recommendation || "",
      pairs_with: parsed.pairs_with ?? [],
      already_similar: parsed.already_similar ?? [],
    };
  });
