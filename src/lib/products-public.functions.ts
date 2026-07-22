import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  inStock: boolean;
};

/**
 * Server-side fetch of the public catalog for SSR loaders and JSON-LD
 * generation. Uses the publishable key + narrow `TO anon` SELECT policy
 * on `public.products`.
 */
export const fetchPublicProductsServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicProduct[]> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data, error } = await client
      .from("products")
      .select(
        "id, slug, name, description, price_cents, category, image_url, sort_order, tags, seo_title, seo_description, in_stock",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.slug || r.id,
      slug: r.slug || r.id,
      name: r.name,
      description: r.description ?? "",
      price: (r.price_cents ?? 0) / 100,
      category: r.category ?? "Repostería",
      image: r.image_url || "",
      tags: (r.tags as string[] | null) ?? [],
      seoTitle: r.seo_title ?? "",
      seoDescription: r.seo_description ?? "",
      inStock: r.in_stock ?? true,
    }));
  },
);
