/** Client-safe shape of the editable site configuration. */

export type SiteConfig = {
  appName: string;
  colors: Record<string, string>;
  texts: Record<string, Record<string, string>>;
  aiInstructions: string;
};

export const COLOR_KEYS = [
  "background",
  "foreground",
  "card",
  "primary",
  "primary-foreground",
  "secondary",
  "accent",
  "muted",
  "muted-foreground",
  "border",
  "ring",
] as const;

export const EDITABLE_TEXT_KEYS = [
  "landing.signIn",
  "landing.cta",
  "nav.today",
  "nav.wardrobe",
  "nav.outfits",
  "nav.stylist",
  "nav.check",
  "nav.profile",
  "nav.signOut",
  "today.title",
  "today.styleMyDay",
  "outfits.title",
  "stylist.title",
  "stylist.subtitle",
  "stylist.placeholder",
  "stylist.send",
] as const;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  appName: "Atelier",
  colors: {},
  texts: {},
  aiInstructions: "",
};

export function normalizeSiteConfig(raw: unknown): SiteConfig {
  const v = (raw ?? {}) as Partial<SiteConfig>;
  const colors: Record<string, string> = {};
  if (v.colors && typeof v.colors === "object") {
    for (const key of COLOR_KEYS) {
      const value = (v.colors as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) colors[key] = value.trim();
    }
  }

  const texts: Record<string, Record<string, string>> = {};
  if (v.texts && typeof v.texts === "object") {
    for (const [lang, dict] of Object.entries(v.texts as Record<string, unknown>)) {
      if (!dict || typeof dict !== "object") continue;
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim()) out[key] = value;
      }
      if (Object.keys(out).length) texts[lang] = out;
    }
  }

  return {
    appName: typeof v.appName === "string" && v.appName.trim() ? v.appName.trim() : "Atelier",
    colors,
    texts,
    aiInstructions: typeof v.aiInstructions === "string" ? v.aiInstructions.slice(0, 4000) : "",
  };
}

export function colorCss(colors: Record<string, string>): string {
  const rules = Object.entries(colors)
    .filter(([key]) => (COLOR_KEYS as readonly string[]).includes(key))
    .map(([key, value]) => `--${key}: ${value};`)
    .join(" ");
  return rules ? `:root{${rules}}` : "";
}
