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
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Style quiz & profile — Atelier" },
      {
        name: "description",
        content:
          "Take a two-minute style quiz so Atelier learns the colours, silhouettes and vibes you actually wear.",
      },
      { property: "og:title", content: "Style quiz & profile — Atelier" },
      {
        property: "og:description",
        content:
          "Take a two-minute style quiz so Atelier learns the colours, silhouettes and vibes you actually wear.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const STYLE_OPTIONS = [
  { value: "classic", label: "Classic", hint: "Timeless, tailored, never loud" },
  { value: "minimal", label: "Minimal", hint: "Clean lines, few colours" },
  { value: "streetwear", label: "Streetwear", hint: "Relaxed, sneaker-led, graphic" },
  { value: "romantic", label: "Romantic", hint: "Soft fabrics, florals, drape" },
  { value: "preppy", label: "Preppy", hint: "Knits, stripes, polished casual" },
  { value: "bohemian", label: "Bohemian", hint: "Flowy, earthy, layered" },
  { value: "edgy", label: "Edgy", hint: "Dark tones, leather, contrast" },
  { value: "sporty", label: "Sporty", hint: "Performance pieces, easy movement" },
  { value: "vintage", label: "Vintage", hint: "Second-hand finds, retro cuts" },
];

const COLOR_OPTIONS = [
  { value: "black", hex: "#111111" },
  { value: "white", hex: "#F5F3EF" },
  { value: "navy", hex: "#1A3A52" },
  { value: "cream", hex: "#EFE6D8" },
  { value: "tan", hex: "#D4A574" },
  { value: "brown", hex: "#6B4B34" },
  { value: "olive", hex: "#6F7A52" },
  { value: "sage", hex: "#9CAF88" },
  { value: "rose", hex: "#D4A8A8" },
  { value: "burgundy", hex: "#6E2436" },
  { value: "denim blue", hex: "#4A6FA5" },
  { value: "grey", hex: "#9A9A98" },
];

const AVOID_OPTIONS = [
  "neon brights",
  "busy prints",
  "crop tops",
  "skinny jeans",
  "heels",
  "logos",
  "itchy wool",
  "very short hems",
  "shiny fabrics",
];

const LIFE_OPTIONS = [
  "office five days a week",
  "hybrid / smart casual",
  "work from home",
  "on my feet all day",
  "lots of evenings out",
  "school run & errands",
  "travel often",
  "always cold",
  "always warm",
  "I bike or walk everywhere",
];

const FIT_OPTIONS = ["fitted", "true to size", "relaxed", "oversized"];

type Draft = {
  styles: string[];
  colors: string[];
  avoid: string[];
  life: string[];
  fit: string;
  sizes: string;
  notes: string;
};

const EMPTY: Draft = { styles: [], colors: [], avoid: [], life: [], fit: "", sizes: "", notes: "" };

const split = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function Chip({
  active,
  onClick,
  children,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
        active
          ? "border-foreground bg-secondary text-secondary-foreground"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      <span className="block text-sm capitalize">{children}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

function ProfilePage() {
  const { session } = useRequireAuth();
  const qc = useQueryClient();
  const { t } = useI18n();
  const tv = (v: string) => {
    const k = `opt.${v}`;
    const out = t(k);
    return out === k ? v : out;
  };
  const th = (v: string, fb: string) => {
    const k = `hint.${v}`;
    const out = t(k);
    return out === k ? fb : out;
  };
  const { data: prefs, isLoading } = usePrefs(!!session);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"quiz" | "summary">("quiz");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isLoading || hydrated) return;
    if (prefs) {
      const known = new Set(LIFE_OPTIONS);
      const noteLines = (prefs.notes ?? "").split("\n");
      const lifeLine = noteLines.find((l) => l.startsWith("Lifestyle:")) ?? "";
      const fitLine = noteLines.find((l) => l.startsWith("Fit:")) ?? "";
      setDraft({
        styles: prefs.styles ?? [],
        colors: prefs.favorite_colors ?? [],
        avoid: prefs.avoid ?? [],
        life: split(lifeLine.replace("Lifestyle:", "")).filter((l) => known.has(l)),
        fit: fitLine.replace("Fit:", "").trim(),
        sizes: prefs.sizes ?? "",
        notes: noteLines
          .filter((l) => !l.startsWith("Lifestyle:") && !l.startsWith("Fit:"))
          .join("\n")
          .trim(),
      });
      if (prefs.onboarded) setMode("summary");
    }
    setHydrated(true);
  }, [prefs, isLoading, hydrated]);

  const toggle = (key: "styles" | "colors" | "avoid" | "life", value: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((x) => x !== value) : [...d[key], value],
    }));

  async function save(finishQuiz: boolean) {
    if (!session) return;
    setBusy(true);
    const notes = [
      draft.life.length ? `Lifestyle: ${draft.life.join(", ")}` : "",
      draft.fit ? `Fit: ${draft.fit}` : "",
      draft.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("style_preferences").upsert(
      {
        user_id: session.user.id,
        styles: draft.styles,
        favorite_colors: draft.colors,
        avoid: draft.avoid,
        sizes: draft.sizes,
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
    await qc.invalidateQueries({ queryKey: ["prefs"] });
    toast.success(finishQuiz ? t("profile.done") : t("wardrobe.saved"));
    if (finishQuiz) setMode("summary");
  }

  const steps = [
    {
      title: t("profile.q1"),
      hint: t("profile.q1h"),
      body: (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STYLE_OPTIONS.map((s) => (
            <Chip
              key={s.value}
              active={draft.styles.includes(s.value)}
              onClick={() => toggle("styles", s.value)}
              hint={th(s.value, s.hint)}
            >
              {tv(s.value)}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: t("profile.q2"),
      hint: t("profile.q2h"),
      body: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLOR_OPTIONS.map((c) => {
            const active = draft.colors.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle("colors", c.value)}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm capitalize transition-colors",
                  active
                    ? "border-foreground bg-secondary text-secondary-foreground"
                    : "border-border bg-card hover:bg-muted",
                )}
              >
                <span
                  className="size-5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: c.hex }}
                />
                {tv(c.value)}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: t("profile.q3"),
      hint: t("profile.q3h"),
      body: (
        <div className="flex flex-wrap gap-2">
          {AVOID_OPTIONS.map((a) => (
            <Chip key={a} active={draft.avoid.includes(a)} onClick={() => toggle("avoid", a)}>
              {tv(a)}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: t("profile.q4"),
      hint: t("profile.q4h"),
      body: (
        <div className="flex flex-wrap gap-2">
          {LIFE_OPTIONS.map((l) => (
            <Chip key={l} active={draft.life.includes(l)} onClick={() => toggle("life", l)}>
              {tv(l)}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: t("profile.q5"),
      hint: t("profile.q5h"),
      body: (
        <div className="space-y-5">
          <div>
            <p className="eyebrow mb-2">{t("profile.fit")}</p>
            <div className="flex flex-wrap gap-2">
              {FIT_OPTIONS.map((f) => (
                <Chip
                  key={f}
                  active={draft.fit === f}
                  onClick={() => setDraft((d) => ({ ...d, fit: d.fit === f ? "" : f }))}
                >
                  {tv(f)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sizes">{t("profile.sizes")}</Label>
            <Input
              id="sizes"
              value={draft.sizes}
              onChange={(e) => setDraft((d) => ({ ...d, sizes: e.target.value }))}
              placeholder={t("profile.sizesPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("profile.notes")}</Label>
            <Textarea
              id="notes"
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder={t("profile.notesPlaceholder")}
            />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  if (mode === "summary") {
    return (
      <AppShell title={t("profile.title")} subtitle={t("profile.subtitle")}>
        <div className="mx-auto max-w-xl space-y-6">
          <SummaryBlock label={t("profile.sumStyles")} values={draft.styles.map(tv)} />
          <SummaryBlock label={t("profile.sumColors")} values={draft.colors.map(tv)} />
          <SummaryBlock label={t("profile.sumAvoid")} values={draft.avoid.map(tv)} />
          <SummaryBlock label={t("profile.sumLife")} values={draft.life.map(tv)} />
          <SummaryBlock label={t("profile.sumFit")} values={[draft.fit ? tv(draft.fit) : "", draft.sizes].filter(Boolean)} />
          {draft.notes && (
            <div>
              <p className="eyebrow mb-1.5">{t("profile.sumNotes")}</p>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{draft.notes}</p>
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => {
              setStep(0);
              setMode("quiz");
            }}
          >
            {t("profile.retake")}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("profile.quizTitle")} subtitle={t("profile.quizSubtitle")}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-foreground" : "bg-border",
              )}
            />
          ))}
        </div>

        <div>
          <p className="eyebrow mb-1">
            {t("profile.step")} {step + 1} {t("profile.of")} {steps.length}
          </p>
          <h2 className="font-display text-2xl">{current.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{current.hint}</p>
        </div>

        {current.body}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              {t("profile.back")}
            </Button>
          )}
          {last ? (
            <Button onClick={() => save(true)} disabled={busy} className="flex-1">
              {busy ? t("profile.saving") : t("profile.save")}
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              {t("profile.continue")}
            </Button>
          )}
        </div>
        {prefs?.onboarded && (
          <button
            type="button"
            onClick={() => setMode("summary")}
            className="w-full text-center text-xs text-muted-foreground underline"
          >
            {t("profile.cancel")}
          </button>
        )}
      </div>
    </AppShell>
  );
}

function SummaryBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
