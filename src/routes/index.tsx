import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

function Landing() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/today", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight">Atelier</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">{t("landing.signIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <Button asChild size="lg">
          <Link to="/auth">{t("landing.cta")}</Link>
        </Button>
      </main>
    </div>
  );
}
