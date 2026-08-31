import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type WardrobeItem = {
  id: string;
  user_id: string;
  image_path: string;
  name: string;
  category: string;
  subtype: string | null;
  primary_color: string | null;
  color_hex: string | null;
  pattern: string | null;
  material: string | null;
  seasons: string[];
  formality: string | null;
  tags: string[];
  notes: string | null;
  wear_count: number;
  last_worn: string | null;
  created_at: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  title: string;
  occasion: string | null;
  weather: string | null;
  rationale: string | null;
  styling_tip: string | null;
  item_ids: string[];
  is_favorite: boolean;
  rating: number | null;
  source: string;
  created_at: string;
};

export type StylePrefs = {
  user_id: string;
  favorite_colors: string[];
  styles: string[];
  avoid: string[];
  sizes: string | null;
  notes: string | null;
  onboarded: boolean;
};

export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "bag",
  "accessory",
  "other",
] as const;

export const OCCASIONS = ["casual", "work", "formal", "evening", "weekend", "travel", "sport"];
export const WEATHER = ["cold", "cool", "mild", "warm", "hot", "rainy"];

export function useWardrobe(enabled = true) {
  return useQuery({
    queryKey: ["wardrobe"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WardrobeItem[];
    },
  });
}

export function useOutfits(enabled = true) {
  return useQuery({
    queryKey: ["outfits"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Outfit[];
    },
  });
}

export function usePrefs(enabled = true) {
  return useQuery({
    queryKey: ["prefs"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("style_preferences").select("*").maybeSingle();
      if (error) throw error;
      return (data ?? null) as StylePrefs | null;
    },
  });
}

/** Batch-signs private wardrobe image paths into displayable URLs. */
export function useImageUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  return useQuery({
    queryKey: ["signed-urls", key],
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const unique = Array.from(new Set(paths));
      const { data, error } = await supabase.storage
        .from("wardrobe")
        .createSignedUrls(unique, 60 * 60 * 2);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
      }
      return map;
    },
  });
}

export function prefsToText(prefs: StylePrefs | null | undefined) {
  if (!prefs) return "";
  const parts: string[] = [];
  if (prefs.styles.length) parts.push(`Preferred styles: ${prefs.styles.join(", ")}`);
  if (prefs.favorite_colors.length) parts.push(`Loves colours: ${prefs.favorite_colors.join(", ")}`);
  if (prefs.avoid.length) parts.push(`Avoids: ${prefs.avoid.join(", ")}`);
  if (prefs.sizes) parts.push(`Sizes: ${prefs.sizes}`);
  if (prefs.notes) parts.push(`Notes: ${prefs.notes}`);
  return parts.join(". ");
}

export function itemsForAi(items: WardrobeItem[]) {
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    subtype: i.subtype,
    primary_color: i.primary_color,
    pattern: i.pattern,
    formality: i.formality,
    seasons: i.seasons,
    tags: i.tags,
  }));
}

/** Downscales an image file to a compact JPEG data URL for AI analysis. */
export async function fileToDataUrl(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
