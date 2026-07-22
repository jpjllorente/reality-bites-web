import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://144reality.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/tienda", changefreq: "weekly", priority: "0.9" },
          { path: "/galeria", changefreq: "weekly", priority: "0.8" },
          { path: "/encargos", changefreq: "monthly", priority: "0.8" },
          { path: "/contacto", changefreq: "monthly", priority: "0.7" },
          { path: "/privacidad", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("products")
            .select("slug, updated_at")
            .eq("is_active", true);
          if (data) {
            for (const p of data) {
              if (!p.slug) continue;
              entries.push({
                path: `/tienda/${p.slug}`,
                lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
                changefreq: "weekly",
                priority: "0.7",
              });
            }
          }
        } catch (err) {
          console.error("sitemap products fetch failed", err);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
