import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { loadGA, trackPageview, GA_MEASUREMENT_ID } from "@/lib/analytics";

const STORAGE_KEY = "144reality.cookieConsent";

type Consent = "accepted" | "rejected" | null;

function readConsent(): Consent {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const c = readConsent();
    setConsent(c);
    if (c === "accepted") loadGA();
  }, []);

  // Track SPA navigations after consent
  useEffect(() => {
    if (consent !== "accepted" || !GA_MEASUREMENT_ID) return;
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      trackPageview(toLocation.pathname + toLocation.searchStr);
    });
    return () => unsub();
  }, [consent, router]);

  if (!mounted || consent !== null) return null;

  const decide = (choice: Exclude<Consent, null>) => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setConsent(choice);
    if (choice === "accepted") loadGA();
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md">
      <div className="rounded-sm border border-primary/20 bg-background/95 p-4 shadow-lg backdrop-blur">
        <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
          Cookies
        </p>
        <p className="mt-2 text-sm text-foreground/85">
          Usamos cookies analíticas para entender cómo se usa la web y mejorar tu
          experiencia. Puedes aceptarlas o rechazarlas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => decide("accepted")}
            className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            Aceptar
          </button>
          <button
            onClick={() => decide("rejected")}
            className="rounded-sm border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
