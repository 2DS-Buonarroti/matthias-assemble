import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRequireAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Style profile — Atelier" },
      {
        name: "description",
        content: "Tell Atelier the colours, silhouettes and sizes you love so every suggestion fits.",
      },
      { property: "og:title", content: "Style profile — Atelier" },
      {
        property: "og:description",
        content: "Tell Atelier the colours, silhouettes and sizes you love so every suggestion fits.",
      },
    ],
  }),
  component: ProfilePage,
});

const STYLE_OPTIONS = [
  "classic",
  "minimal",
  "streetwear",
  "romantic",
  "preppy",
  "bohemian",
  "edgy",
  "sporty",
  "vintage",
];

function ProfilePage() {
  const { session } = useRequireAuth();
  const qc = useQueryClient();
  const { data: prefs } = usePrefs(!!session);

  const [styles, setStyles] = useState<string[]>([]);
  const [colors, setColors] = useState("");
  const [avoid, setAvoid] = useState("");
  const [sizes, setSizes] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!prefs) return;
    setStyles(prefs.styles ?? []);
    setColors((prefs.favorite_colors ?? []).join(", "));
    setAvoid((prefs.avoid ?? []).join(", "));
    setSizes(prefs.sizes ?? "");
    setNotes(prefs.notes ?? "");
  }, [prefs]);

  const split = (v: string) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  async function save() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("style_preferences").upsert(
      {
        user_id: session.user.id,
        styles,
        favorite_colors: split(colors),
        avoid: split(avoid),
        sizes,
        notes,
        onboarded: true,
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["prefs"] });
    toast.success("Style profile saved");
  }

  return (
    <AppShell title="Style profile" subtitle="The more Atelier knows, the better the suggestions.">
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <p className="eyebrow mb-2">Styles you gravitate to</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((s) => {
              const active = styles.includes(s);
              return (
                <button
                  key={s}
                  onClick={() =>
                    setStyles(active ? styles.filter((x) => x !== s) : [...styles, s])
                  }
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs capitalize transition-colors",
                    active ? "bg-secondary text-secondary-foreground" : "bg-card",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="colors">Colours you love</Label>
          <Input
            id="colors"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            placeholder="navy, cream, olive"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avoid">Things to avoid</Label>
          <Input
            id="avoid"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="neon, cropped tops"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sizes">Sizes</Label>
          <Input
            id="sizes"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            placeholder="Tops M, jeans 30, shoes 42"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything else</Label>
          <Textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="I bike to work, my office is business casual, I'm always cold…"
          />
        </div>

        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </AppShell>
  );
}
