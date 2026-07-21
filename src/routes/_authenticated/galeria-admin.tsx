import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { NavTabs } from "./productos";
import { isAdminEmail } from "@/lib/admin";
import {
  listGalleryAdmin,
  upsertGalleryItem,
  deleteGalleryItem,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/galeria-admin")({
  head: () => ({
    meta: [
      { title: "Galería — Panel 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GalleryAdminPage,
});

type Row = {
  id: string;
  image_url: string;
  alt: string;
  caption: string;
  tag: string;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
};

const EMPTY: Row = {
  id: "",
  image_url: "",
  alt: "",
  caption: "",
  tag: "",
  sort_order: 0,
  is_active: true,
  is_featured: false,
};

function GalleryAdminPage() {
  const { user } = Route.useRouteContext();
  const isAdmin = isAdminEmail(user?.email);
  const list = useServerFn(listGalleryAdmin);
  const save = useServerFn(upsertGalleryItem);
  const remove = useServerFn(deleteGalleryItem);
  const [editing, setEditing] = useState<Row | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-gallery"],
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
    if (!editing.image_url.trim()) {
      toast.error("La imagen es obligatoria");
      return;
    }
    try {
      await save({
        data: {
          id: editing.id || undefined,
          image_url: editing.image_url.trim(),
          alt: editing.alt,
          caption: editing.caption,
          tag: editing.tag,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
          is_featured: editing.is_featured,
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
    if (!confirm("¿Eliminar imagen?")) return;
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
                Galería
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <NavTabs current="galeria" />
              <button
                onClick={() => setEditing({ ...EMPTY })}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
              >
                + Nueva
              </button>
            </div>
          </div>

          {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>}

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => (
              <article
                key={r.id}
                className="group relative overflow-hidden rounded-sm border border-foreground/15 bg-card"
              >
                <div className="relative aspect-square bg-muted">
                  {r.image_url && (
                    <img src={r.image_url} alt={r.alt} className="h-full w-full object-cover" />
                  )}
                  {r.is_featured && (
                    <span className="absolute left-2 top-2 rounded-sm bg-secondary px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                      ★ Favorito
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-semibold">{r.caption || r.alt || "—"}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">
                    {r.tag} {!r.is_active && "· oculto"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-sm border border-foreground/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="rounded-sm border border-foreground/20 px-2 py-1 text-[10px] uppercase tracking-widest hover:border-destructive hover:text-destructive"
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
              Sin imágenes en la base de datos. Mientras esté vacía, la galería muestra las de ejemplo.
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
                {editing.id ? "Editar imagen" : "Nueva imagen"}
              </h2>
              <button onClick={() => setEditing(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="space-y-3">
              <MediaUpload
                value={editing.image_url}
                onChange={(url) => setEditing((e) => (e ? { ...e, image_url: url } : e))}
              />
              <Text label="Alt (accesibilidad)" value={editing.alt} onChange={(v) => setEditing((e) => (e ? { ...e, alt: v } : e))} />
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Caption</span>
                <textarea
                  rows={2}
                  value={editing.caption}
                  onChange={(e) => setEditing((s) => (s ? { ...s, caption: e.target.value } : s))}
                  className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Text label="Tag (#Repostería)" value={editing.tag} onChange={(v) => setEditing((e) => (e ? { ...e, tag: v } : e))} />
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
