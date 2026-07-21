import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { isAdminEmail } from "@/lib/admin";
import {
  listProductsAdmin,
  upsertProduct,
  deleteProduct,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/productos")({
  head: () => ({
    meta: [
      { title: "Productos — Panel 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProductsPage,
});

const CATEGORIES = ["Repostería", "Café", "Bites"] as const;

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  tags: string[];
  seo_title: string;
  seo_description: string;
};

const EMPTY: Row = {
  id: "",
  slug: "",
  name: "",
  description: "",
  price_cents: 0,
  category: "Repostería",
  image_url: "",
  sort_order: 0,
  is_active: true,
  tags: [],
  seo_title: "",
  seo_description: "",
};

function ProductsPage() {
  const { user } = Route.useRouteContext();
  const isAdmin = isAdminEmail(user?.email);
  const list = useServerFn(listProductsAdmin);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);
  const [editing, setEditing] = useState<Row | null>(null);
  const [dirty, setDirty] = useState<{ slug: boolean; seo_title: boolean; seo_description: boolean }>({
    slug: false,
    seo_title: false,
    seo_description: false,
  });

  function slugify(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " y ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }
  function truncate(s: string, n: number) {
    const t = s.trim().replace(/\s+/g, " ");
    if (t.length <= n) return t;
    const cut = t.slice(0, n);
    const sp = cut.lastIndexOf(" ");
    return (sp > 40 ? cut.slice(0, sp) : cut).trim();
  }
  function openNew() {
    setDirty({ slug: false, seo_title: false, seo_description: false });
    setEditing({ ...EMPTY });
  }
  function openEdit(r: Row) {
    setDirty({ slug: true, seo_title: true, seo_description: true });
    setEditing(r);
  }
  function onNameChange(v: string) {
    setEditing((s) => {
      if (!s) return s;
      const next = { ...s, name: v };
      if (!dirty.slug) next.slug = slugify(v);
      if (!dirty.seo_title) next.seo_title = truncate(`${v} — 144 Reality`, 70);
      return next;
    });
  }
  function onDescriptionChange(v: string) {
    setEditing((s) => {
      if (!s) return s;
      const next = { ...s, description: v };
      if (!dirty.seo_description) next.seo_description = truncate(v, 200);
      return next;
    });
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="grain py-24 text-center">
          <p className="text-sm">Acceso restringido.</p>
        </main>
        <Footer />
      </>
    );
  }

  async function onSave() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.slug.trim()) {
      toast.error("Nombre y slug obligatorios");
      return;
    }
    try {
      await save({
        data: {
          id: editing.id || undefined,
          slug: editing.slug.trim(),
          name: editing.name.trim(),
          description: editing.description,
          price_cents: Math.round(editing.price_cents),
          category: editing.category,
          image_url: editing.image_url,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
          tags: editing.tags.map((t) => t.trim()).filter(Boolean),
          seo_title: editing.seo_title.trim(),
          seo_description: editing.seo_description.trim(),
        },
      });
      toast.success("Guardado");
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Eliminado");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const rows = (data ?? []) as Row[];

  return (
    <>
      <Header />
      <main className="grain bg-background py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                — Panel interno
              </p>
              <h1 className="font-display text-5xl leading-none text-primary sm:text-6xl">
                Productos
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <NavTabs current="productos" />
              <button
                onClick={openNew}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                + Nuevo
              </button>
            </div>
          </div>

          {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <article
                key={r.id}
                className="flex gap-3 rounded-sm border border-foreground/15 bg-card p-3"
              >
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    className="h-24 w-24 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-sm bg-muted" />
                )}
                <div className="flex flex-1 flex-col">
                  <p className="font-serif text-sm font-semibold">
                    {r.name}{" "}
                    {!r.is_active && (
                      <span className="ml-1 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                        oculto
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.category} · {(r.price_cents / 100).toFixed(2)} € · orden {r.sort_order}
                  </p>
                  {r.tags?.length > 0 && (
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-secondary">
                      {r.tags.join(" · ")}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2 pt-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-sm border border-foreground/20 px-2 py-1 text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="rounded-sm border border-foreground/20 px-2 py-1 text-[11px] uppercase tracking-widest hover:border-destructive hover:text-destructive"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {rows.length === 0 && !isLoading && (
            <p className="mt-10 text-sm text-muted-foreground">
              Sin productos en la base de datos. Mientras esté vacía, la tienda muestra los ejemplos por defecto.
            </p>
          )}
        </div>
      </main>
      <Footer />

      {editing && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-primary/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-foreground/15 bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-3xl text-primary">
                {editing.id ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button onClick={() => setEditing(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="space-y-3">
              <MediaUpload
                value={editing.image_url}
                onChange={(url) => setEditing((e) => (e ? { ...e, image_url: url } : e))}
              />
              <Text label="Nombre *" value={editing.name} onChange={onNameChange} />
              <Text
                label="Slug *"
                value={editing.slug}
                onChange={(v) => {
                  setDirty((d) => ({ ...d, slug: true }));
                  setEditing((e) => (e ? { ...e, slug: v } : e));
                }}
              />
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Descripción</span>
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Precio (€)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(editing.price_cents / 100).toString()}
                    onChange={(e) =>
                      setEditing((s) =>
                        s ? { ...s, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) } : s,
                      )
                    }
                    className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Categoría</span>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing((s) => (s ? { ...s, category: e.target.value } : s))}
                    className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Orden</span>
                  <input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing((s) => (s ? { ...s, sort_order: parseInt(e.target.value || "0") } : s))}
                    className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing((s) => (s ? { ...s, is_active: e.target.checked } : s))}
                  />
                  <span className="text-xs uppercase tracking-widest">Visible</span>
                </label>
              </div>
              <Text
                label="Etiquetas (separadas por comas)"
                value={editing.tags.join(", ")}
                onChange={(v) =>
                  setEditing((s) =>
                    s ? { ...s, tags: v.split(",").map((t) => t.trim()).filter(Boolean) } : s,
                  )
                }
              />
              <div className="rounded-sm border border-dashed border-foreground/20 p-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-secondary">
                  SEO — se usa en la ficha del producto
                </p>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Título SEO ({editing.seo_title.length}/70)
                    </span>
                    <input
                      type="text"
                      maxLength={70}
                      value={editing.seo_title}
                      onChange={(e) => {
                        setDirty((d) => ({ ...d, seo_title: true }));
                        setEditing((s) => (s ? { ...s, seo_title: e.target.value } : s));
                      }}
                      placeholder="Ej: Tartaleta de pistacho artesanal en Bullas"
                      className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Meta descripción ({editing.seo_description.length}/200)
                    </span>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={editing.seo_description}
                      onChange={(e) => {
                        setDirty((d) => ({ ...d, seo_description: true }));
                        setEditing((s) => (s ? { ...s, seo_description: e.target.value } : s));
                      }}
                      placeholder="Frase corta y única que aparecerá en Google."
                      className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="rounded-sm bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground hover:bg-secondary/90"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

export function NavTabs({ current }: { current: "dashboard" | "productos" | "galeria" }) {
  const tabs = [
    { to: "/dashboard", key: "dashboard", label: "Pedidos" },
    { to: "/productos", key: "productos", label: "Productos" },
    { to: "/galeria-admin", key: "galeria", label: "Galería" },
  ] as const;
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={`rounded-sm border px-3 py-2 text-xs font-semibold uppercase tracking-widest transition ${
            current === t.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-foreground/20 text-foreground/70 hover:border-primary hover:text-primary"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
