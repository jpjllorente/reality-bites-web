import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — 144 Reality" },
      { name: "description", content: "Establece una nueva contraseña para tu cuenta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase parses the recovery hash and emits PASSWORD_RECOVERY on load.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada. Iniciando sesión…");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar la contraseña";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="grain min-h-[70vh] bg-background py-24">
        <div className="mx-auto max-w-md px-4">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
            — Acceso interno
          </p>
          <h1 className="font-display text-5xl leading-none text-primary">
            Nueva contraseña
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {ready
              ? "Elige una nueva contraseña para tu cuenta."
              : "Abre el enlace desde el email de restablecimiento para continuar."}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 rounded-sm border border-foreground/15 bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Nueva contraseña
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready}
                className="rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
              />
            </label>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Repetir contraseña
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!ready}
                className="rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !ready}
              className="mt-6 w-full rounded-sm bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "…" : "Guardar contraseña"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-primary">
              ← Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
