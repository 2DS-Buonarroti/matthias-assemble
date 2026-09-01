import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ItemThumb } from "@/components/ItemThumb";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useImageUrls, useOutfits, useWardrobe, type Outfit } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/outfits")({
  head: () => ({
    meta: [
      { title: "Saved outfits — Atelier" },
      {
        name: "description",
        content: "Every look you've saved, with the reasoning behind each combination.",
      },
      { property: "og:title", content: "Saved outfits — Atelier" },
      {
        property: "og:description",
        content: "Every look you've saved, with the reasoning behind each combination.",
      },
    ],
  }),
  component: OutfitsPage,
});

function OutfitsPage() {
  const { session } = useRequireAuth();
  const qc = useQueryClient();
  const { data: outfits = [], isLoading } = useOutfits(!!session);
  const { data: items = [] } = useWardrobe(!!session);
  const { data: urls = {} } = useImageUrls(items.map((i) => i.image_path));

  async function toggleFavorite(outfit: Outfit) {
    const { error } = await supabase
      .from("outfits")
      .update({ is_favorite: !outfit.is_favorite })
      .eq("id", outfit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["outfits"] });
  }

  async function remove(outfit: Outfit) {
    const { error } = await supabase.from("outfits").delete().eq("id", outfit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["outfits"] });
    toast.success("Outfit removed");
  }

  return (
    <AppShell title="Outfits" subtitle="Looks you've saved, ready to wear again.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : outfits.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <h2 className="font-display text-xl">No saved looks yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Generate outfits on the Today page and save the ones you love.
          </p>
          <Button asChild className="mt-6">
            <Link to="/today">Style my day</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {outfits.map((outfit) => (
            <article key={outfit.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg">{outfit.title}</h3>
                  <p className="text-xs capitalize text-muted-foreground">
                    {[outfit.occasion, outfit.weather].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Favourite"
                    onClick={() => toggleFavorite(outfit)}
                  >
                    <Heart
                      className={cn("size-4", outfit.is_favorite && "fill-current text-accent")}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete outfit"
                    onClick={() => remove(outfit)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {outfit.item_ids.map((id) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <ItemThumb
                      key={id}
                      url={urls[item.image_path]}
                      name={item.name}
                      className="aspect-[3/4] w-20"
                    />
                  );
                })}
              </div>
              {outfit.rationale && (
                <p className="mt-4 text-sm leading-relaxed">{outfit.rationale}</p>
              )}
              {outfit.styling_tip && (
                <p className="mt-2 text-sm text-muted-foreground">Tip — {outfit.styling_tip}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
