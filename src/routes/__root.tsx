import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CookieBanner } from "@/components/site/CookieBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no se ha podido cargar
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo ha fallado. Puedes reintentar o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      {
        name: "description",
        content:
          "Repostería moderna, servicio en sala y encargos a medida en un local confortable y acogedor en Bullas, Murcia.",
      },
      { name: "author", content: "144 Reality" },
      { name: "google-site-verification", content: "BoqAg7KSjlWtfzde9AcAAAkz4X7k4Dl5BeqCKIkcHMg" },
      { property: "og:title", content: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      {
        property: "og:description",
        content:
          "Repostería moderna, servicio en sala y encargos a medida en un local confortable y acogedor en Bullas, Murcia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "144 Reality — Bites & Coffee | Repostería moderna & café de especialidad" },
      { name: "twitter:description", content: "Repostería moderna, servicio en sala y encargos a medida en un local confortable y acogedor en Bullas, Murcia." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2aTFzYNJqUYfQfMni6aWXLFYWj02/social-images/social-1784650264228-07408EC5-D139-47C6-8B5A-98C8F730DE42.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2aTFzYNJqUYfQfMni6aWXLFYWj02/social-images/social-1784650264228-07408EC5-D139-47C6-8B5A-98C8F730DE42.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto+Slab:wght@600;800&family=Work+Sans:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const CANONICAL_HOST = "144reality.com";

function useCanonicalRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { hostname, protocol, pathname, search, hash } = window.location;
    const isWww = hostname === `www.${CANONICAL_HOST}`;
    const isLovable = hostname.endsWith(".lovable.app");
    const isHttp = protocol === "http:" && hostname === CANONICAL_HOST;
    if (isWww || isLovable || isHttp) {
      window.location.replace(`https://${CANONICAL_HOST}${pathname}${search}${hash}`);
    }
  }, []);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useCanonicalRedirect();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <CookieBanner />
    </QueryClientProvider>
  );
}
