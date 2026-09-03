import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, ScanLine, Shirt, Sun } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

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
  { icon: Shirt, key: "f1" },
  { icon: Sun, key: "f2" },
  { icon: MessageCircle, key: "f3" },
  { icon: ScanLine, key: "f4" },
];

function Landing() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/today", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight">Atelier</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">{t("landing.signIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-16 md:py-24">
          <p className="eyebrow">{t("landing.eyebrow")}</p>
          <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] md:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("landing.body")}
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">{t("landing.cta")}</Link>
          </Button>
        </section>

        <section className="grid gap-5 border-t border-border pt-12 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.key} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="size-5 text-accent" />
              <h2 className="mt-4 font-display text-xl">{t(`landing.${f.key}.title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`landing.${f.key}.body`)}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
