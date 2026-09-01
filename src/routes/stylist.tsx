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

const STARTERS = [
  "What should I wear to a dinner tonight?",
  "How do I style my white shirt differently?",
  "What's missing from my wardrobe?",
  "Build me a capsule for a weekend trip.",
];

type Msg = { role: "user" | "assistant"; content: string };

function StylistPage() {
  const { session } = useRequireAuth();
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
        data: { history, items: itemsForAi(items), preferences: prefsToText(prefs) },
      });
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch {
      toast.error("Couldn't reach your stylist — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Your stylist" subtitle="Ask anything — she knows what's in your closet.">
      <div className="mx-auto flex max-w-2xl flex-col">
        {messages.length === 0 && (
          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">Not sure where to start?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                >
                  {s}
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
              <Loader2 className="size-4 animate-spin" /> Thinking about your closet…
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
            placeholder="What should I wear today?"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={busy} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
