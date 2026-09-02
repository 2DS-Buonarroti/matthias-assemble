import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ItemThumb } from "@/components/ItemThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireAuth } from "@/hooks/useAuth";
import {
  checkOutfit,
  checkPurchase,
  type OutfitAlternative,
  type OutfitCheck,
  type ShoppingVerdict,
} from "@/lib/ai.functions";
import {
  fileToDataUrl,
  itemsForAi,
  useImageUrls,
  useWardrobe,
  type WardrobeItem,
} from "@/lib/wardrobe";


export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Outfit & purchase check — Atelier" },
      {
        name: "description",
        content: "Get a kind second opinion on today's outfit, or on something you're about to buy.",
      },
      { property: "og:title", content: "Outfit & purchase check — Atelier" },
      {
        property: "og:description",
        content: "Get a kind second opinion on today's outfit, or on something you're about to buy.",
      },
    ],
  }),
  component: CheckPage,
});

function Dropzone({
  preview,
  onFile,
  label,
}: {
  preview: string | null;
  onFile: (file: File) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full rounded-xl border border-dashed border-border bg-card p-6 text-center"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-72 rounded-lg object-contain" />
        ) : (
          <>
            <UploadCloud className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{label}</p>
          </>
        )}
      </button>
    </>
  );
}

function AlternativeLook({
  alt,
  items,
}: {
  alt: OutfitAlternative;
  items: WardrobeItem[];
}) {
  const picks = alt.item_ids
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is WardrobeItem => !!i);
  const { data: urls = {} } = useImageUrls(picks.map((p) => p.image_path));

  if (picks.length === 0) return null;

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-sm font-medium">{alt.title}</p>
      <div className="mt-2 flex gap-2">
        {picks.map((p) => (
          <ItemThumb key={p.id} url={urls[p.image_path]} name={p.name} className="size-16" />
        ))}
      </div>
      {alt.why && <p className="mt-2 text-xs text-muted-foreground">{alt.why}</p>}
    </div>
  );
}

function CheckPage() {
  const { session } = useRequireAuth();
  const { data: items = [] } = useWardrobe(!!session);
  const runOutfit = useServerFn(checkOutfit);
  const runPurchase = useServerFn(checkPurchase);

  const [outfitImg, setOutfitImg] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [outfitResult, setOutfitResult] = useState<OutfitCheck | null>(null);
  const [buyImg, setBuyImg] = useState<string | null>(null);
  const [buyResult, setBuyResult] = useState<ShoppingVerdict | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File, set: (v: string) => void) {
    try {
      set(await fileToDataUrl(file));
    } catch {
      toast.error("Couldn't read that photo.");
    }
  }

  async function reviewOutfit() {
    if (!outfitImg) return;
    setBusy(true);
    try {
      setOutfitResult(
        await runOutfit({ data: { imageDataUrl: outfitImg, context, items: itemsForAi(items) } }),
      );
    } catch {
      toast.error("Couldn't review that look — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewPurchase() {
    if (!buyImg) return;
    setBusy(true);
    try {
      setBuyResult(await runPurchase({ data: { imageDataUrl: buyImg, items: itemsForAi(items) } }));
    } catch {
      toast.error("Couldn't review that item — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Second opinion" subtitle="Kind, practical feedback — never about your body.">
      <div className="mx-auto max-w-2xl">
        <Tabs defaultValue="outfit">
          <TabsList className="w-full">
            <TabsTrigger value="outfit" className="flex-1">
              Outfit check
            </TabsTrigger>
            <TabsTrigger value="buy" className="flex-1">
              Should I buy it?
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outfit" className="space-y-4 pt-6">
            <Dropzone
              preview={outfitImg}
              onFile={(f) => pick(f, setOutfitImg)}
              label="Upload a photo of today's outfit"
            />
            <Input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Where are you going? e.g. client lunch, then drinks"
            />
            <Button onClick={reviewOutfit} disabled={!outfitImg || busy} className="w-full">
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Check my outfit
            </Button>

            {outfitResult && (
              <div className="surface space-y-4 p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl">{outfitResult.score}/10</span>
                  <p className="text-sm">{outfitResult.verdict}</p>
                </div>
                {outfitResult.detected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {outfitResult.detected.map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {outfitResult.works.length > 0 && (
                  <div>
                    <p className="eyebrow mb-1.5">What works</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {outfitResult.works.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {outfitResult.improve.length > 0 && (
                  <div>
                    <p className="eyebrow mb-1.5">Worth trying</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {outfitResult.improve.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {outfitResult.swap_suggestion && (
                  <p className="text-sm text-muted-foreground">
                    Swap idea — {outfitResult.swap_suggestion}
                  </p>
                )}
                {outfitResult.alternatives.length > 0 && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="eyebrow">Alternatives from your closet</p>
                    {outfitResult.alternatives.map((alt, i) => (
                      <AlternativeLook key={i} alt={alt} items={items} />
                    ))}
                  </div>
                )}
              </div>
            )}

          </TabsContent>

          <TabsContent value="buy" className="space-y-4 pt-6">
            <Dropzone
              preview={buyImg}
              onFile={(f) => pick(f, setBuyImg)}
              label="Upload the item you're considering"
            />
            <Button onClick={reviewPurchase} disabled={!buyImg || busy} className="w-full">
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Does it fit my wardrobe?
            </Button>

            {buyResult && (
              <div className="surface space-y-4 p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl">{buyResult.compatibility}%</span>
                  <p className="text-sm font-medium">{buyResult.item_name}</p>
                </div>
                <p className="text-sm leading-relaxed">{buyResult.recommendation}</p>
                {buyResult.pairs_with.length > 0 && (
                  <p className="text-sm">
                    <span className="eyebrow">Pairs with</span>{" "}
                    {buyResult.pairs_with.join(", ")}
                  </p>
                )}
                {buyResult.already_similar.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You already own something similar: {buyResult.already_similar.join(", ")}
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
