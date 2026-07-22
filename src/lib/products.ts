export type Category = "Repostería" | "Café" | "Bites";

export interface ProductVariant {
  id: string;
  name: string;
  active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  portionPrice?: number | null;
  category: Category;
  image: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  inStock?: boolean;
  variants: ProductVariant[];
}

// Los productos se gestionan desde /dashboard/productos. Sin datos demo estáticos.
export const products: Product[] = [];


import { supabase } from "@/integrations/supabase/client";

function normalizeVariants(v: unknown): ProductVariant[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): ProductVariant | null => {
      if (!x || typeof x !== "object") return null;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const name = typeof o.name === "string" ? o.name : "";
      if (!id || !name) return null;
      return { id, name, active: o.active !== false };
    })
    .filter((x): x is ProductVariant => !!x);
}

export async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await (supabase
    .from("products") as any)
    .select("id, slug, name, description, price_cents, portion_price_cents, category, image_url, sort_order, tags, seo_title, seo_description, in_stock, variants")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.slug || r.id,
    slug: r.slug || r.id,
    name: r.name,
    description: r.description ?? "",
    price: (r.price_cents ?? 0) / 100,
    portionPrice: r.portion_price_cents != null ? r.portion_price_cents / 100 : null,
    category: (r.category as Category) ?? "Repostería",
    image: r.image_url || "",
    tags: (r.tags as string[] | null) ?? [],
    seoTitle: r.seo_title ?? "",
    seoDescription: r.seo_description ?? "",
    inStock: r.in_stock ?? true,
    variants: normalizeVariants(r.variants),
  }));
}

export async function fetchPublicProductBySlug(slug: string): Promise<Product | null> {
  const all = await fetchPublicProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
