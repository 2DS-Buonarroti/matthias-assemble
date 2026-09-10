import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

import { normalizeSiteConfig, type SiteConfig } from "./site-config";

type DevSession = { unlocked?: boolean };

function sessionConfig() {
  const password = process.env["DEV_SESSION_SECRET"];
  if (!password) throw new Error("Dev console is not configured.");
  return {
    password,
    name: "atelier-dev",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function sha256(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const a = await sha256(input);
  const b = await sha256(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function requireUnlocked() {
  const session = await useSession<DevSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("locked");
  return session;
}

/* ---------------------------------- gate ---------------------------------- */

export const devStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await useSession<DevSession>(sessionConfig());
    return { unlocked: session.data.unlocked === true };
  } catch {
    return { unlocked: false };
  }
});

export const devUnlock = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["DEV_CONSOLE_PASSWORD"];
    if (!expected) return { ok: false as const };
    if (!(await passwordMatches(data.password, expected))) return { ok: false as const };
    const session = await useSession<DevSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const devLock = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<DevSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

/* -------------------------------- analytics -------------------------------- */

export type DevAnalytics = {
  totals: { users: number; items: number; outfits: number; activeUsers: number };
  newUsers: { last24h: number; last7d: number; last30d: number };
  signupsByDay: Array<{ day: string; count: number }>;
  itemsByDay: Array<{ day: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function lastDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

export const devAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DevAnalytics> => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = userList?.users ?? [];

    const { data: items } = await supabaseAdmin
      .from("wardrobe_items")
      .select("user_id, category, created_at");
    const { data: outfits } = await supabaseAdmin.from("outfits").select("user_id, created_at");

    const itemRows = (items ?? []) as Array<{
      user_id: string;
      category: string | null;
      created_at: string;
    }>;
    const outfitRows = (outfits ?? []) as Array<{ user_id: string; created_at: string }>;

    const now = Date.now();
    const since = (h: number) => now - h * 3600000;
    const created = users.map((u) => new Date(u.created_at).getTime());

    const signupDays = new Map<string, number>();
    for (const u of users) {
      const key = dayKey(new Date(u.created_at).toISOString());
      signupDays.set(key, (signupDays.get(key) ?? 0) + 1);
    }
    const itemDays = new Map<string, number>();
    for (const row of itemRows) {
      const key = dayKey(row.created_at);
      itemDays.set(key, (itemDays.get(key) ?? 0) + 1);
    }
    const categories = new Map<string, number>();
    for (const row of itemRows) {
      const key = row.category ?? "other";
      categories.set(key, (categories.get(key) ?? 0) + 1);
    }

    const active = new Set<string>();
    for (const row of itemRows) active.add(row.user_id);

    return {
      totals: {
        users: users.length,
        items: itemRows.length,
        outfits: outfitRows.length,
        activeUsers: active.size,
      },
      newUsers: {
        last24h: created.filter((t) => t >= since(24)).length,
        last7d: created.filter((t) => t >= since(24 * 7)).length,
        last30d: created.filter((t) => t >= since(24 * 30)).length,
      },
      signupsByDay: lastDays(14).map((day) => ({ day, count: signupDays.get(day) ?? 0 })),
      itemsByDay: lastDays(14).map((day) => ({ day, count: itemDays.get(day) ?? 0 })),
      categories: [...categories.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
);

/* --------------------------------- accounts -------------------------------- */

export type DevAccount = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  provider: string;
  displayName: string | null;
  items: number;
  outfits: number;
  onboarded: boolean;
};

export const devAccounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<DevAccount[]> => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = userList?.users ?? [];

    const { data: items } = await supabaseAdmin.from("wardrobe_items").select("user_id");
    const { data: outfits } = await supabaseAdmin.from("outfits").select("user_id");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, display_name");
    const { data: prefs } = await supabaseAdmin
      .from("style_preferences")
      .select("user_id, onboarded");

    const count = (rows: Array<{ user_id: string }> | null) => {
      const map = new Map<string, number>();
      for (const row of rows ?? []) map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
      return map;
    };
    const itemCounts = count(items as Array<{ user_id: string }> | null);
    const outfitCounts = count(outfits as Array<{ user_id: string }> | null);
    const names = new Map(
      ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [
        p.id,
        p.display_name,
      ]),
    );
    const onboarded = new Map(
      ((prefs ?? []) as Array<{ user_id: string; onboarded: boolean }>).map((p) => [
        p.user_id,
        p.onboarded,
      ]),
    );

    return users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        provider: (u.app_metadata?.["provider"] as string | undefined) ?? "email",
        displayName: names.get(u.id) ?? null,
        items: itemCounts.get(u.id) ?? 0,
        outfits: outfitCounts.get(u.id) ?? 0,
        onboarded: onboarded.get(u.id) ?? false,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
);

async function removeStorageFolder(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("wardrobe").list(userId, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`);
  if (paths.length) await supabaseAdmin.storage.from("wardrobe").remove(paths);
}

export const devClearUserData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ userId: z.string().uuid(), scope: z.enum(["wardrobe", "outfits", "all"]) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.scope === "outfits" || data.scope === "all") {
      await supabaseAdmin.from("outfits").delete().eq("user_id", data.userId);
    }
    if (data.scope === "wardrobe" || data.scope === "all") {
      await supabaseAdmin.from("wardrobe_items").delete().eq("user_id", data.userId);
      await removeStorageFolder(data.userId);
    }
    if (data.scope === "all") {
      await supabaseAdmin.from("style_preferences").delete().eq("user_id", data.userId);
    }
    return { ok: true as const };
  });

export const devDeleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("outfits").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("wardrobe_items").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("style_preferences").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    await removeStorageFolder(data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ------------------------------- site settings ------------------------------ */

export const devGetSiteConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteConfig> => {
    await requireUnlocked();
    const { readSiteConfig } = await import("./site.server");
    return readSiteConfig();
  },
);

export const devSaveSiteConfig = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        appName: z.string().default("Atelier"),
        colors: z.record(z.string(), z.string()).default({}),
        texts: z.record(z.string(), z.record(z.string(), z.string())).default({}),
        aiInstructions: z.string().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<SiteConfig> => {
    await requireUnlocked();
    const config = normalizeSiteConfig(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SITE_CONFIG_KEY } = await import("./site.server");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: SITE_CONFIG_KEY, value: config }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return config;
  });
