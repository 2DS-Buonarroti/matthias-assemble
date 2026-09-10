import { createClient } from "@supabase/supabase-js";

import { DEFAULT_SITE_CONFIG, normalizeSiteConfig, type SiteConfig } from "./site-config";

export const SITE_CONFIG_KEY = "site_config";

export function serverSupabasePublic() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function readSiteConfig(): Promise<SiteConfig> {
  try {
    const supabase = serverSupabasePublic();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SITE_CONFIG_KEY)
      .maybeSingle();
    return normalizeSiteConfig((data as { value?: unknown } | null)?.value);
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}
