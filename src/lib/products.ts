import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";

export type Category = "Repostería" | "Café" | "Bites";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
}

// Fallback local si la BD está vacía. Los admins gestionan los productos reales
// desde /dashboard/productos.
export const products: Product[] = [
  { id: "tartaleta-pistacho", name: "Tartaleta de pistacho & frambuesa", description: "Masa sablé, ganache de pistacho y frambuesa fresca.", price: 4.9, category: "Repostería", image: product1 },
  { id: "esfera-chocolate", name: "Esfera 70% con hoja de oro", description: "Chocolate belga, corazón líquido de caramelo salado.", price: 5.5, category: "Repostería", image: product2 },
  { id: "croissant-mantequilla", name: "Croissant de mantequilla", description: "Hojaldre artesano, 72 horas de fermentación.", price: 2.4, category: "Bites", image: product3 },
  { id: "cappuccino", name: "Cappuccino de especialidad", description: "Blend de origen, leche cremada, latte art.", price: 2.8, category: "Café", image: product4 },
  { id: "cheesecake-frutos", name: "Cheesecake de frutos rojos", description: "Base de galleta tostada, queso cremoso, coulis de bosque.", price: 4.5, category: "Repostería", image: product5 },
  { id: "cookies-choco", name: "Cookies choco & sal marina", description: "Chunks de chocolate 60%, escamas de sal Maldon.", price: 2.2, category: "Bites", image: product6 },
];

import { supabase } from "@/integrations/supabase/client";

export async function fetchPublicProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, description, price_cents, category, image_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return products;
  return data.map((r) => ({
    id: r.slug || r.id,
    name: r.name,
    description: r.description ?? "",
    price: (r.price_cents ?? 0) / 100,
    category: (r.category as Category) ?? "Repostería",
    image: r.image_url || "",
  }));
}
