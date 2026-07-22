import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { loadGA, trackPageview, GA_MEASUREMENT_ID } from "@/lib/analytics";

const STORAGE_KEY = "144reality.cookieConsent";
const OPEN_EVENT = "144reality:openCookiePrefs";

type Consent = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  // Back-compat with the old "accepted" / "rejected" string values.
  if (raw === "accepted")
    return { necessary: true, analytics: true, decidedAt: "" };
  if (raw === "rejected")
    return { necessary: true, analytics: false, decidedAt: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "analytics" in parsed) {
      return {
        necessary: true,
        analytics: Boolean(parsed.analytics),
        decidedAt: String(parsed.decidedAt ?? ""),
      };
    }
  } catch {
    /* noop */
  }
  return null;
}

function writeConsent(analytics: boolean) {
  const value: Consent = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
}

/** Open the preferences dialog from anywhere (e.g. footer link). */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const c = readConsent();
    setConsent(c);
    setAnalyticsChecked(c?.analytics ?? true);
    if (c?.analytics) loadGA();

    const openHandler = () => {
      const current = readConsent();
      setAnalyticsChecked(current?.analytics ?? true);
      setPrefsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_EVENT, openHandler);
  }, []);

  // Track SPA navigations after analytics consent.
  useEffect(() => {
    if (!consent?.analytics || !GA_MEASUREMENT_ID) return;
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageview(toLocation.pathname + toLocation.searchStr);
    });
    return () => unsub();
  }, [consent, router]);

  if (!mounted) return null;

  const apply = (analytics: boolean) => {
    const value = writeConsent(analytics);
    setConsent(value);
    setAnalyticsChecked(analytics);
    setPrefsOpen(false);
    if (analytics) loadGA();
  };

  const showBanner = consent === null && !prefsOpen;

  return (
    <>
      {showBanner && (
        <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md">
          <div className="rounded-sm border border-primary/20 bg-background/95 p-4 shadow-lg backdrop-blur">
            <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
              Cookies
            </p>
            <p className="mt-2 text-sm text-foreground/85">
              Usamos cookies técnicas (necesarias) y analíticas para entender
              cómo se usa la web y mejorar tu experiencia. Puedes aceptarlas,
              rechazarlas o configurarlas.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => apply(true)}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                Aceptar todo
              </button>
              <button
                onClick={() => apply(false)}
                className="rounded-sm border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Rechazar
              </button>
              <button
                onClick={() => setPrefsOpen(true)}
                className="rounded-sm border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/80 hover:border-primary hover:text-primary"
              >
                Configurar
              </button>
            </div>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-prefs-title"
        >
          <div className="w-full max-w-lg rounded-sm border border-primary/20 bg-background p-5 shadow-xl">
            <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
              Preferencias de cookies
            </p>
            <h2
              id="cookie-prefs-title"
              className="mt-1 font-serif text-2xl text-foreground"
            >
              Configura tus cookies
            </h2>
            <p className="mt-2 text-sm text-foreground/80">
              Elige qué categorías quieres permitir. Puedes cambiarlo en
              cualquier momento desde el pie de página.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-sm border border-primary/15 bg-muted/30 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Necesarias
                  </p>
                  <p className="text-xs text-foreground/70">
                    Imprescindibles para el funcionamiento del sitio. Siempre
                    activas.
                  </p>
                </div>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-secondary">
                  Siempre
                </span>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-sm border border-primary/15 p-3 hover:border-primary/40">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Analíticas
                  </p>
                  <p className="text-xs text-foreground/70">
                    Google Analytics 4 con IP anonimizada, para medir visitas y
                    mejorar el sitio.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsChecked}
                  onChange={(e) => setAnalyticsChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                  aria-label="Permitir cookies analíticas"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => apply(false)}
                className="rounded-sm border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/80 hover:border-primary hover:text-primary"
              >
                Rechazar todo
              </button>
              <button
                onClick={() => apply(true)}
                className="rounded-sm border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Aceptar todo
              </button>
              <button
                onClick={() => apply(analyticsChecked)}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                Guardar selección
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
