import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { amIAdmin } from "@/lib/auth-admin.functions";
import {
  listProductsAdmin,
  upsertProduct,
  deleteProduct,
} from "@/lib/catalog.functions";
import {
  forceSyncProduct,
  reconcileProductsWithStripe,
  type ProductDiscrepancy,
} from "@/lib/catalog-admin.functions";
import { getStripeEnvironment } from "@/lib/stripe";

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

type Variant = { id: string; name: string; active: boolean };

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  portion_price_cents: number | null;
  category: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  in_stock: boolean;
  tags: string[];
  seo_title: string;
  seo_description: string;
  variants: Variant[];
};

const EMPTY: Row = {
  id: "",
  slug: "",
  name: "",
  description: "",
  price_cents: 0,
  portion_price_cents: null,
  category: "Repostería",
  image_url: "",
  sort_order: 0,
  is_active: true,
  in_stock: true,
  tags: [],
  seo_title: "",
  seo_description: "",
  variants: [],
};


function ProductsPage() {
  const { user } = Route.useRouteContext();
  const fetchAmIAdmin = useServerFn(amIAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: () => fetchAmIAdmin(),
  });
  const isAdmin = Boolean(adminCheck?.isAdmin);
  const list = useServerFn(listProductsAdmin);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);
  const syncOne = useServerFn(forceSyncProduct);
  const reconcile = useServerFn(reconcileProductsWithStripe);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<
    | { checked: number; discrepancies: ProductDiscrepancy[] }
    | { error: string }
    | null
  >(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [dirty, setDirty] = useState<{ slug: boolean; seo_title: boolean; seo_description: boolean }>({
    slug: false,
    seo_title: false,
    seo_description: false,
  });
  const [priceInput, setPriceInput] = useState("0.00");


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
    setPriceInput("0.00");
    setEditing({ ...EMPTY });
  }
  function openEdit(r: Row) {
    setDirty({ slug: true, seo_title: true, seo_description: true });
    setPriceInput((r.price_cents / 100).toFixed(2));
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
    const ids = editing.variants.map((v) => v.id);
    if (new Set(ids).size !== ids.length) {
      toast.error("Hay variantes con el mismo identificador");
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
          portion_price_cents:
            editing.portion_price_cents && editing.portion_price_cents > 0
              ? Math.round(editing.portion_price_cents)
              : null,
          category: editing.category,
          image_url: editing.image_url,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
          in_stock: editing.in_stock,
          tags: editing.tags.map((t) => t.trim()).filter(Boolean),
          seo_title: editing.seo_title.trim(),
          seo_description: editing.seo_description.trim(),
          variants: editing.variants
            .map((v) => ({ id: v.id.trim(), name: v.name.trim(), active: v.active }))
            .filter((v) => v.id && v.name),
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



  async function onSync(id: string) {
    setSyncing(id);
    try {
      const res = await syncOne({ data: { id } });
      if ("error" in res) toast.error(`Stripe: ${res.error}`);
      else toast.success("Sincronizado con Stripe");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(null);
    }
  }

  async function onReconcile() {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await reconcile({ data: { environment: getStripeEnvironment() } });
      setReconcileResult(res);
      if ("error" in res) toast.error(`Stripe: ${res.error}`);
      else if (res.discrepancies.length === 0) toast.success("Sin discrepancias");
      else toast.warning(`${res.discrepancies.length} discrepancia(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReconciling(false);
    }
  }

  function variantsFromDb(v: unknown): Variant[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x): Variant | null => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id : "";
        const name = typeof o.name === "string" ? o.name : "";
        if (!id || !name) return null;
        return { id, name, active: o.active !== false };
      })
      .filter((x): x is Variant => !!x);
  }

  const rows: Row[] = (data ?? []).map((r: any) => ({
    id: r.id,
    slug: r.slug ?? "",
    name: r.name,
    description: r.description ?? "",
    price_cents: r.price_cents ?? 0,
    portion_price_cents: r.portion_price_cents ?? null,
    category: r.category ?? "Repostería",
    image_url: r.image_url ?? "",
    sort_order: r.sort_order ?? 0,
    is_active: r.is_active ?? true,
    in_stock: r.in_stock ?? true,
    tags: (r.tags as string[] | null) ?? [],
    seo_title: r.seo_title ?? "",
    seo_description: r.seo_description ?? "",
    variants: variantsFromDb(r.variants),
  }));


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
                    {r.is_active && !r.in_stock && (
                      <span className="ml-1 rounded bg-destructive/15 px-1 text-[10px] uppercase text-destructive">
                        agotado
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
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    value={priceInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".");
                      if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
                      setPriceInput(raw);
                      const parsed = parseFloat(raw);
                      setEditing((s) =>
                        s ? { ...s, price_cents: isNaN(parsed) ? 0 : Math.round(parsed * 100) } : s,
                      );
                    }}
                    onBlur={() => {
                      setPriceInput((editing.price_cents / 100).toFixed(2));
                    }}
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
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={editing.in_stock}
                    onChange={(e) => setEditing((s) => (s ? { ...s, in_stock: e.target.checked } : s))}
                  />
                  <span className="text-xs uppercase tracking-widest">En stock</span>
                </label>
              </div>

              <PortionPriceEditor
                value={editing.portion_price_cents}
                onChange={(cents) => setEditing((s) => (s ? { ...s, portion_price_cents: cents } : s))}
              />

              <VariantsEditor
                variants={editing.variants}
                onChange={(vs) => setEditing((s) => (s ? { ...s, variants: vs } : s))}
              />

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

function PortionPriceEditor({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
}) {
  const enabled = value != null && value > 0;
  const [open, setOpen] = useState(enabled);
  const [input, setInput] = useState(enabled ? ((value as number) / 100).toFixed(2) : "0.00");

  if (!open && !enabled) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setInput("0.00");
        }}
        className="rounded-sm border border-dashed border-foreground/30 px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
      >
        + Añadir precio por porción
      </button>
    );
  }
  return (
    <div className="rounded-sm border border-dashed border-foreground/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">
          Precio por porción (opcional)
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setInput("0.00");
            onChange(null);
          }}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
        >
          Quitar
        </button>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={input}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
          setInput(raw);
          const parsed = parseFloat(raw);
          onChange(isNaN(parsed) ? null : Math.round(parsed * 100));
        }}
        onBlur={() => {
          if (value != null && value > 0) setInput((value / 100).toFixed(2));
        }}
        className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        Se sincroniza con Stripe como precio adicional del mismo producto.
      </p>
    </div>
  );
}

function VariantsEditor({
  variants,
  onChange,
}: {
  variants: { id: string; name: string; active: boolean }[];
  onChange: (v: { id: string; name: string; active: boolean }[]) => void;
}) {
  function slugId(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }
  function add() {
    const base = "variante";
    let idx = variants.length + 1;
    let id = `${base}-${idx}`;
    while (variants.some((v) => v.id === id)) {
      idx += 1;
      id = `${base}-${idx}`;
    }
    onChange([...variants, { id, name: "", active: true }]);
  }
  return (
    <div className="rounded-sm border border-dashed border-foreground/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">
          Variantes (ej: topping, sabor…)
        </p>
        <button
          type="button"
          onClick={add}
          className="rounded-sm border border-foreground/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary"
        >
          + Añadir
        </button>
      </div>
      {variants.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Sin variantes. El producto se vende tal cual.
        </p>
      )}
      <ul className="space-y-2">
        {variants.map((v, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={v.name}
              placeholder="Nombre (ej: Oreo)"
              onChange={(e) => {
                const name = e.target.value;
                const next = [...variants];
                const autoId = slugId(name) || `variante-${i + 1}`;
                next[i] = {
                  ...v,
                  name,
                  id: v.id.startsWith("variante-") || v.id === "" ? autoId : v.id,
                };
                onChange(next);
              }}
              className="min-w-[140px] flex-1 rounded-sm border border-foreground/20 bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={v.id}
              placeholder="id"
              onChange={(e) => {
                const next = [...variants];
                next[i] = { ...v, id: slugId(e.target.value) };
                onChange(next);
              }}
              className="w-32 rounded-sm border border-foreground/20 bg-background px-2 py-1 font-mono text-[11px] focus:border-primary focus:outline-none"
            />
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest">
              <input
                type="checkbox"
                checked={v.active}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...v, active: e.target.checked };
                  onChange(next);
                }}
              />
              Activa
            </label>
            <button
              type="button"
              onClick={() => onChange(variants.filter((_, j) => j !== i))}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NavTabs({ current }: { current: "dashboard" | "productos" | "galeria" | "pagos" }) {
  const tabs = [
    { to: "/dashboard", key: "dashboard", label: "Pedidos" },
    { to: "/pagos", key: "pagos", label: "Pagos" },
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
