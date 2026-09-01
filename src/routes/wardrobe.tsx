import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ItemThumb } from "@/components/ItemThumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRequireAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { analyzeGarment } from "@/lib/ai.functions";
import {
  CATEGORIES,
  dataUrlToBlob,
  fileToDataUrl,
  useImageUrls,
  useWardrobe,
  type WardrobeItem,
} from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wardrobe")({
  head: () => ({
    meta: [
      { title: "Digital wardrobe — Atelier" },
      {
        name: "description",
        content: "Upload clothing photos and Atelier auto-tags every garment into your digital wardrobe.",
      },
      { property: "og:title", content: "Digital wardrobe — Atelier" },
      {
        property: "og:description",
        content: "Upload clothing photos and Atelier auto-tags every garment into your digital wardrobe.",
      },
    ],
  }),
  component: WardrobePage,
});

function WardrobePage() {
  const { session } = useRequireAuth();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeGarment);
  const { data: items = [], isLoading } = useWardrobe(!!session);
  const { data: urls = {} } = useImageUrls(items.map((i) => i.image_path));

  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<WardrobeItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = filter === "all" ? items : items.filter((i) => i.category === filter);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length || !session) return;
    setUploading({ done: 0, total: list.length });

    for (let i = 0; i < list.length; i++) {
      const file = list[i]!;
      try {
        const dataUrl = await fileToDataUrl(file);
        const analysis = await analyze({ data: { imageDataUrl: dataUrl } });
        const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("wardrobe")
          .upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("wardrobe_items").insert({
          user_id: session.user.id,
          image_path: path,
          ...analysis,
        });
        if (error) throw error;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add that photo");
      }
      setUploading({ done: i + 1, total: list.length });
    }

    setUploading(null);
    qc.invalidateQueries({ queryKey: ["wardrobe"] });
    qc.invalidateQueries({ queryKey: ["signed-urls"] });
    toast.success(`Added ${list.length} item${list.length > 1 ? "s" : ""} to your wardrobe.`);
  }

  async function remove(item: WardrobeItem) {
    await supabase.storage.from("wardrobe").remove([item.image_path]);
    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["wardrobe"] });
    toast.success("Item removed");
  }

  async function save(item: WardrobeItem) {
    const { error } = await supabase
      .from("wardrobe_items")
      .update({
        name: item.name,
        category: item.category,
        primary_color: item.primary_color,
        formality: item.formality,
        notes: item.notes,
        tags: item.tags,
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["wardrobe"] });
    toast.success("Saved");
  }

  return (
    <AppShell
      title="Your wardrobe"
      subtitle="Drop in photos of what you own — each piece is tagged automatically."
      action={
        <Button onClick={() => inputRef.current?.click()} disabled={!!uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Tagging {uploading.done}/{uploading.total}
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              Add items
            </>
          )}
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mb-8 cursor-pointer rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center transition-colors",
          dragOver && "border-primary bg-muted",
        )}
      >
        <UploadCloud className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Drag photos here, or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bulk upload works — select your whole closet shoot at once.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["all", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs capitalize transition-colors",
              filter === c ? "bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            {c}
            {c !== "all" && (
              <span className="ml-1.5 opacity-60">{items.filter((i) => i.category === c).length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your wardrobe…</p>
      ) : shown.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <h2 className="font-display text-xl">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add 5–10 favourites to start. Lay each piece flat, snap a photo, and Atelier does the rest.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((item) => (
            <button
              key={item.id}
              onClick={() => setEditing(item)}
              className="group text-left transition-transform hover:-translate-y-0.5"
            >
              <ItemThumb url={urls[item.image_path]} name={item.name} className="aspect-[3/4]" />
              <p className="mt-2 truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {item.category}
                {item.primary_color ? ` · ${item.primary_color}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit item</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <ItemThumb
                url={urls[editing.image_path]}
                name={editing.name}
                className="mx-auto aspect-[3/4] w-40"
              />
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Input
                    value={editing.primary_color ?? ""}
                    onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={editing.tags.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editing.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Gift from mum, runs small, dry clean only…"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => save(editing)}>
                  Save changes
                </Button>
                <Button variant="outline" size="icon" onClick={() => remove(editing)} aria-label="Delete">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
