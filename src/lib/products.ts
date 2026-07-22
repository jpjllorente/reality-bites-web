import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

export type Category = "Repostería" | "Café" | "Bites";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  inStock?: boolean;
}

// Fallback local si la BD está vacía. Los admins gestionan los productos reales
// desde /dashboard/productos.
export const products: Product[] = [
  { id: "tartaleta-pistacho", slug: "tartaleta-pistacho", name: "Tartaleta de pistacho & frambuesa", description: "Masa sablé, ganache de pistacho y frambuesa fresca.", price: 4.9, category: "Repostería", image: product1, tags: ["Novedad", "Sin gluten"], seoTitle: "", seoDescription: "" },
  { id: "esfera-chocolate", slug: "esfera-chocolate", name: "Esfera 70% con hoja de oro", description: "Chocolate belga, corazón líquido de caramelo salado.", price: 5.5, category: "Repostería", image: product2, tags: ["Signature"], seoTitle: "", seoDescription: "" },
  { id: "croissant-mantequilla", slug: "croissant-mantequilla", name: "Croissant de mantequilla", description: "Hojaldre artesano, 72 horas de fermentación.", price: 2.4, category: "Bites", image: product3, tags: ["Artesano"], seoTitle: "", seoDescription: "" },
  { id: "cappuccino", slug: "cappuccino", name: "Cappuccino de especialidad", description: "Blend de origen, leche cremada, latte art.", price: 2.8, category: "Café", image: product4, tags: ["Especialidad"], seoTitle: "", seoDescription: "" },
  { id: "cheesecake-frutos", slug: "cheesecake-frutos", name: "Cheesecake de frutos rojos", description: "Base de galleta tostada, queso cremoso, coulis de bosque.", price: 4.5, category: "Repostería", image: product5, tags: ["Popular"], seoTitle: "", seoDescription: "" },
  { id: "cookies-choco", slug: "cookies-choco", name: "Cookies choco & sal marina", description: "Chunks de chocolate 60%, escamas de sal Maldon.", price: 2.2, category: "Bites", image: product6, tags: ["Vegetariano"], seoTitle: "", seoDescription: "" },
];

import { supabase } from "@/integrations/supabase/client";

export async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price_cents, category, image_url, sort_order, tags, seo_title, seo_description, in_stock")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.slug || r.id,
    slug: r.slug || r.id,
    name: r.name,
    description: r.description ?? "",
    price: (r.price_cents ?? 0) / 100,
    category: (r.category as Category) ?? "Repostería",
    image: r.image_url || "",
    tags: (r.tags as string[] | null) ?? [],
    seoTitle: (r as { seo_title?: string }).seo_title ?? "",
    seoDescription: (r as { seo_description?: string }).seo_description ?? "",
    inStock: (r as { in_stock?: boolean }).in_stock ?? true,
  }));
}

export async function fetchPublicProductBySlug(slug: string): Promise<Product | null> {
  const all = await fetchPublicProducts();
  return all.find((p) => p.slug === slug) ?? null;
}
