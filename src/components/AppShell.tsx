import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Shirt, Sparkles, Sun, MessageCircle, ScanLine, User2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/today", key: "nav.today", icon: Sun },
  { to: "/wardrobe", key: "nav.wardrobe", icon: Shirt },
  { to: "/outfits", key: "nav.outfits", icon: Sparkles },
  { to: "/stylist", key: "nav.stylist", icon: MessageCircle },
  { to: "/check", key: "nav.check", icon: ScanLine },
  { to: "/profile", key: "nav.profile", icon: User2 },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/today" className="font-display text-xl tracking-tight">
            Atelier
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground hover:bg-secondary" }}
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={signOut}>
              {t("nav.signOut")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("nav.menu")}
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-card px-4 py-2 md:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm"
                activeProps={{ className: "text-primary-foreground bg-primary" }}
              >
                <n.icon className="size-4" />
                {t(n.key)}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-muted-foreground"
            >
              {t("nav.signOut")}
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:pb-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground")}
            activeProps={{ className: "text-foreground" }}
          >
            <n.icon className="size-5" />
            {t(n.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
