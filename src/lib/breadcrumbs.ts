export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${origin}${c.path}`,
      })),
    }),
  };
}
