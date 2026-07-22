import { supabase } from "@/integrations/supabase/client";

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  tag: string;
  featured?: boolean;
}

// Sin demo estático: la galería siempre proviene de la BD gestionada desde el panel.
export const galleryItems: GalleryItem[] = [];

export async function fetchPublicGallery(): Promise<GalleryItem[]> {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("image_url, alt, caption, tag, sort_order, is_featured")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    src: r.image_url,
    alt: r.alt ?? "",
    caption: r.caption ?? "",
    tag: r.tag ?? "",
    featured: Boolean((r as { is_featured?: boolean }).is_featured),
  }));
}

export async function fetchFeaturedGallery(limit = 3): Promise<GalleryItem[]> {
  const all = await fetchPublicGallery();
  const featured = all.filter((i) => i.featured);
  return (featured.length > 0 ? featured : all).slice(0, limit);
}
