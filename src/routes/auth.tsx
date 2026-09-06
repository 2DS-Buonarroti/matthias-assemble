import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Atelier personal stylist" },
      {
        name: "description",
        content: "Create your Atelier account to build a digital wardrobe and get daily outfit ideas.",
      },
      { property: "og:title", content: "Sign in — Atelier personal stylist" },
      {
        property: "og:description",
        content: "Create your Atelier account to build a digital wardrobe and get daily outfit ideas.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/today" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success(t("auth.welcome"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(t("auth.googleFail"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/today" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-secondary p-12 text-secondary-foreground lg:flex">
        <Link to="/" className="font-display text-2xl">
          Atelier
        </Link>
        <div>
          <p className="font-display text-4xl leading-tight">
            {t("auth.tagline1")}
            <br />
            {t("auth.holds")}
          </p>
          <p className="mt-4 max-w-sm text-sm opacity-75">
            {t("auth.intro")} {t("auth.introEnd")}
          </p>
        </div>
        <p className="text-xs opacity-60">{t("auth.private")}</p>
      </div>

      <div className="relative flex items-center justify-center px-6 py-16">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl">
            {mode === "signup" ? t("auth.h1signup") : t("auth.h1signin")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? t("auth.subSignup")
              : t("auth.subSignin")}
          </p>

          <Button variant="outline" className="mt-6 w-full" onClick={google}>
            {t("auth.google")}
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("common.or")} <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.namePlaceholder")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("auth.busy") : mode === "signup" ? t("auth.create") : t("auth.signin")}
            </Button>
          </form>

          <button
            className="mt-5 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? t("auth.toSignin") : t("auth.toSignup")}
          </button>
        </div>
      </div>
    </div>
  );
}
