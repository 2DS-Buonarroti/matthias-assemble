import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ItemThumb } from "@/components/ItemThumb";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRequireAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateOutfits, type OutfitSuggestion } from "@/lib/ai.functions";
import {
  OCCASIONS,
  WEATHER,
  itemsForAi,
  prefsToText,
  useImageUrls,
  usePrefs,
  useWardrobe,
} from "@/lib/wardrobe";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today's outfit — Atelier" },
      {
        name: "description",
        content: "A daily outfit picked from clothes you already own, matched to your day and the weather.",
      },
      { property: "og:title", content: "Today's outfit — Atelier" },
      {
        property: "og:description",
        content: "A daily outfit picked from clothes you already own, matched to your day and the weather.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { session } = useRequireAuth();
  const qc = useQueryClient();
  const generate = useServerFn(generateOutfits);
  const { data: items = [] } = useWardrobe(!!session);
  const { data: prefs } = usePrefs(!!session);
  const { data: urls = {} } = useImageUrls(items.map((i) => i.image_path));

  const [occasion, setOccasion] = useState("casual");
  const [weather, setWeather] = useState("mild");
  const [busy, setBusy] = useState(false);
  const [looks, setLooks] = useState<OutfitSuggestion[]>([]);

  async function run() {
    setBusy(true);
    try {
      const result = await generate({
        data: {
          items: itemsForAi(items),
          occasion,
          weather,
          mood: "",
          palette: "",
          preferences: prefsToText(prefs),
          count: 3,
        },
      });
      setLooks(result);
      if (!result.length) toast.error("Add a few more pieces and try again.");
    } catch {
      toast.error("The stylist is busy right now — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function saveLook(look: OutfitSuggestion) {
    if (!session) return;
    const { error } = await supabase.from("outfits").insert({
      user_id: session.user.id,
      title: look.title,
      occasion,
      weather,
      rationale: look.rationale,
      styling_tip: look.styling_tip,
      item_ids: look.item_ids,
      source: "daily",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["outfits"] });
    toast.success("Saved to your outfits");
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell title="Today" subtitle={today}>
      {items.length < 3 ? (
        <div className="surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl">Let's fill your closet first</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add at least three pieces and Atelier can start putting looks together for you.
          </p>
          <Button asChild className="mt-6">
            <Link to="/wardrobe">Add clothes</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="surface flex flex-wrap items-end gap-4 p-5">
            <div className="min-w-40 flex-1">
              <p className="eyebrow mb-1.5">Occasion</p>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((o) => (
                    <SelectItem key={o} value={o} className="capitalize">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-40 flex-1">
              <p className="eyebrow mb-1.5">Weather</p>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER.map((w) => (
                    <SelectItem key={w} value={w} className="capitalize">
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={run} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Styling…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Style my day
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 space-y-6">
            {looks.map((look, idx) => (
              <article key={idx} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-display text-xl">{look.title}</h3>
                  <Button variant="outline" size="sm" onClick={() => saveLook(look)}>
                    Save look
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {look.item_ids.map((id) => {
                    const item = items.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="w-24">
                        <ItemThumb
                          url={urls[item.image_path]}
                          name={item.name}
                          className="aspect-[3/4]"
                        />
                        <p className="mt-1.5 truncate text-xs text-muted-foreground">{item.name}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm leading-relaxed">{look.rationale}</p>
                {look.styling_tip && (
                  <p className="mt-2 text-sm text-muted-foreground">Tip — {look.styling_tip}</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
