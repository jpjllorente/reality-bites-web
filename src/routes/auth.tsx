import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso interno — 144 Reality" },
      { name: "description", content: "Acceso al panel interno de 144 Reality." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const normalized = email.toLowerCase().trim();
        if (!["hola@144reality.com", "webmaster@144reality.com"].includes(normalized)) {
          throw new Error("Solo hola@144reality.com o webmaster@144reality.com pueden registrarse");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success(
          "Cuenta creada. Te enviamos un email de verificación — confirma tu dirección para activarla.",
        );
        setMode("signin");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te enviamos un email con el enlace para restablecer tu contraseña.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "signin" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Restablecer contraseña";
  const submitLabel =
    mode === "signin" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace";

  return (
    <>
      <Header />
      <main className="grain min-h-[70vh] bg-background py-24">
        <div className="mx-auto max-w-md px-4">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
            — Acceso interno
          </p>
          <h1 className="font-display text-5xl leading-none text-primary">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Introduce tu email y te enviaremos un enlace para restablecer tu contraseña."
              : "Área restringida al equipo de 144 Reality."}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 rounded-sm border border-foreground/15 bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            {mode !== "forgot" && (
              <label className="mt-4 flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Contraseña
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-sm bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "…" : submitLabel}
            </button>

            <div className="mt-4 flex flex-col gap-2 text-center">
              {mode === "signin" && (
                <>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    ¿Primer acceso? Crear cuenta
                  </button>
                </>
              )}
              {mode !== "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  ← Volver a iniciar sesión
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
