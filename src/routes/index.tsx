import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, ScanLine, Shirt, Sun } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — your AI personal stylist" },
      {
        name: "description",
        content:
          "Photograph your clothes, let Atelier tag them, and get daily outfits built from what you already own.",
      },
      { property: "og:title", content: "Atelier — your AI personal stylist" },
      {
        property: "og:description",
        content:
          "Photograph your clothes, let Atelier tag them, and get daily outfits built from what you already own.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Shirt, title: "Digital wardrobe", body: "Snap each piece — colour, fabric and season are tagged for you." },
  { icon: Sun, title: "Outfits for your day", body: "Looks matched to the occasion, the weather and your own taste." },
  { icon: MessageCircle, title: "A stylist on call", body: "Ask anything; she answers using the clothes you actually own." },
  { icon: ScanLine, title: "Second opinions", body: "Check today's look, or whether that new piece earns its place." },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/today", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight">Atelier</span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-16 md:py-24">
          <p className="eyebrow">Personal styling, quietly clever</p>
          <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] md:text-6xl">
            Your closet already holds the answer.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Atelier learns every piece you own, then puts outfits together for whatever the day
            asks of you — no shopping required.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">Build my wardrobe</Link>
          </Button>
        </section>

        <section className="grid gap-5 border-t border-border pt-12 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="size-5 text-accent" />
              <h2 className="mt-4 font-display text-xl">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
