// Google Analytics 4 + Google Consent Mode v2.
// Set VITE_GA_MEASUREMENT_ID in your environment (e.g. G-XXXXXXXXXX) to enable.
// Consent defaults are declared BEFORE GA loads, so any tag that fires respects
// the user's decision from the very first request.

export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let stubReady = false;
let scriptLoaded = false;

function ensureStub() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // Standard gtag shim — pushes calls into dataLayer even before the script loads.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
  stubReady = true;
}

/**
 * Declare Consent Mode v2 defaults. Call once as early as possible (client-side)
 * BEFORE any GA/Ads tag can run. All storage denied by default; the user opts in
 * via the cookie banner. `wait_for_update` gives the banner a short window to
 * upgrade consent before pings fire.
 */
export function initConsentMode() {
  if (typeof window === "undefined") return;
  ensureStub();
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  // Extra hardening: redact ad data if any Ads tag ever fires without consent.
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("set", "url_passthrough", true);
}

/** Update consent after the user chooses. Safe to call repeatedly. */
export function updateConsent(opts: { analytics: boolean }) {
  if (typeof window === "undefined") return;
  ensureStub();
  window.gtag("consent", "update", {
    analytics_storage: opts.analytics ? "granted" : "denied",
  });
}

/** Load the GA script. Idempotent. Should be called after consent is granted. */
export function loadGA() {
  if (scriptLoaded || typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  ensureStub();
  scriptLoaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
}

export function trackPageview(path: string) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;
  if (!stubReady) return;
  window.gtag("event", "page_view", { page_path: path });
}
