import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  loadGA,
  trackPageview,
  updateConsent,
  initConsentMode,
  GA_MEASUREMENT_ID,
} from "@/lib/analytics";

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

function writeConsent(analytics: boolean): Consent {
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [mounted, setMounted] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(true);
  const router = useRouter();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Init Consent Mode defaults ASAP, then hydrate stored decision.
  useEffect(() => {
    initConsentMode();
    setMounted(true);
    const c = readConsent();
    setConsent(c);
    setAnalyticsChecked(c?.analytics ?? true);
    if (c) {
      updateConsent({ analytics: c.analytics });
      if (c.analytics) loadGA();
    }

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

  // Focus management + Escape + focus trap for the preferences dialog.
  useEffect(() => {
    if (!prefsOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const node = dialogRef.current;
    if (!node) return;

    // Focus the dialog container so screen readers announce it.
    node.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPrefsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger.
      lastFocusedRef.current?.focus?.();
    };
  }, [prefsOpen]);

  if (!mounted) return null;

  const apply = (analytics: boolean) => {
    const value = writeConsent(analytics);
    setConsent(value);
    setAnalyticsChecked(analytics);
    setPrefsOpen(false);
    updateConsent({ analytics });
    if (analytics) loadGA();
  };

  const showBanner = consent === null && !prefsOpen;

  return (
    <>
      {showBanner && (
        <div
          ref={bannerRef}
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md"
        >
          <div className="rounded-sm border border-primary/20 bg-background/95 p-4 shadow-lg backdrop-blur">
            <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
              Cookies
            </p>
            <p className="mt-2 text-sm text-foreground/85">
              Usamos cookies técnicas (necesarias) y analíticas para entender
              cómo se usa la web y mejorar tu experiencia. Puedes aceptarlas,
              rechazarlas o configurarlas.{" "}
              <Link
                to="/privacidad"
                className="underline decoration-primary underline-offset-2 hover:text-primary"
              >
                Más información
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => apply(true)}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Aceptar todo
              </button>
              <button
                onClick={() => apply(false)}
                className="rounded-sm border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Rechazar
              </button>
              <button
                onClick={() => setPrefsOpen(true)}
                className="rounded-sm border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/80 hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
          onClick={(e) => {
            // Click on backdrop closes only if a prior decision exists.
            if (e.target === e.currentTarget && consent !== null) {
              setPrefsOpen(false);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="w-full max-w-lg rounded-sm border border-primary/20 bg-background p-5 shadow-xl focus:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
                  Preferencias de cookies
                </p>
                <h2
                  id={titleId}
                  className="mt-1 font-serif text-2xl text-foreground"
                >
                  Configura tus cookies
                </h2>
              </div>
              {consent !== null && (
                <button
                  type="button"
                  onClick={() => setPrefsOpen(false)}
                  aria-label="Cerrar preferencias de cookies"
                  className="min-h-11 min-w-11 rounded-sm border border-transparent px-2 text-lg text-foreground/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  ×
                </button>
              )}
            </div>

            <p id={descId} className="mt-2 text-sm text-foreground/80">
              Elige qué categorías quieres permitir. Puedes cambiarlo en
              cualquier momento desde el pie de página. Consulta nuestra{" "}
              <Link
                to="/privacidad"
                className="underline decoration-primary underline-offset-2 hover:text-primary"
                onClick={() => setPrefsOpen(false)}
              >
                Política de privacidad
              </Link>
              .
            </p>

            <fieldset className="mt-4 space-y-3 border-0 p-0">
              <legend className="sr-only">Categorías de cookies</legend>

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
                <span
                  aria-hidden="true"
                  className="mt-1 font-mono text-[10px] uppercase tracking-widest text-secondary"
                >
                  Siempre
                </span>
                <span className="sr-only">Siempre activas</span>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-sm border border-primary/15 p-3 hover:border-primary/40 focus-within:border-primary">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Analíticas
                  </p>
                  <p className="text-xs text-foreground/70">
                    Google Analytics 4 con IP anonimizada y Consent Mode v2.
                    Solo se carga si aceptas.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsChecked}
                  onChange={(e) => setAnalyticsChecked(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Permitir cookies analíticas (Google Analytics 4)"
                />
              </label>
            </fieldset>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => apply(false)}
                className="min-h-11 rounded-sm border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground/80 hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Rechazar todo
              </button>
              <button
                onClick={() => apply(true)}
                className="min-h-11 rounded-sm border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Aceptar todo
              </button>
              <button
                onClick={() => apply(analyticsChecked)}
                className="min-h-11 rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
