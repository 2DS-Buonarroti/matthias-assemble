import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/hooks/useAuth";
import { askStylist } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";
import { itemsForAi, prefsToText, usePrefs, useWardrobe } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stylist")({
  head: () => ({
    meta: [
      { title: "Ask your stylist — Atelier" },
      {
        name: "description",
        content: "Chat with a personal stylist who knows every piece in your wardrobe.",
      },
      { property: "og:title", content: "Ask your stylist — Atelier" },
      {
        property: "og:description",
        content: "Chat with a personal stylist who knows every piece in your wardrobe.",
      },
    ],
  }),
  component: StylistPage,
});

const STARTERS = ["stylist.s1", "stylist.s2", "stylist.s3", "stylist.s4"];

type Msg = { role: "user" | "assistant"; content: string };

function StylistPage() {
  const { session } = useRequireAuth();
  const { t, aiLanguage } = useI18n();
  const ask = useServerFn(askStylist);
  const { data: items = [] } = useWardrobe(!!session);
  const { data: prefs } = usePrefs(!!session);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const reply = await ask({
        data: {
          history,
          items: itemsForAi(items),
          preferences: prefsToText(prefs),
          language: aiLanguage,
        },
      });
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch {
      toast.error(t("stylist.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t("stylist.title")} subtitle={t("stylist.subtitle")}>
      <div className="mx-auto flex max-w-2xl flex-col">
        {messages.length === 0 && (
          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">{t("stylist.startHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(t(s))}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 py-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "ml-auto bg-secondary text-secondary-foreground"
                  : "bg-card border border-border",
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("stylist.thinking")}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-4 flex gap-2 rounded-xl border border-border bg-card p-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("stylist.placeholder")}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={busy} aria-label={t("stylist.send")}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
