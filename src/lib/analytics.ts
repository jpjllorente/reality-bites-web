// Google Analytics 4 helper.
// Set VITE_GA_MEASUREMENT_ID in your environment (e.g. G-XXXXXXXXXX) to enable.
// Only loads AFTER the user accepts cookies (see CookieBanner).

export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let loaded = false;

export function loadGA() {
  if (loaded || typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  loaded = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
}

export function trackPageview(path: string) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag("event", "page_view", { page_path: path });
}
