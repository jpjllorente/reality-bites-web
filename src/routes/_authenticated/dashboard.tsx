import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { listAllOrders, updateOrderStatus } from "@/lib/shop-orders.functions";
import { amIAdmin } from "@/lib/auth-admin.functions";
import { NavTabs } from "./productos";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

const SHOP_STATUSES = ["new", "contacted", "confirmed", "completed", "cancelled"] as const;
const CUSTOM_STATUSES = ["new", "reviewing", "confirmed", "declined"] as const;
type ShopStatus = (typeof SHOP_STATUSES)[number];
type CustomStatus = (typeof CUSTOM_STATUSES)[number];
type AnyStatus = ShopStatus | CustomStatus;

const STATUS_LABEL: Record<AnyStatus, string> = {
  new: "Nuevo",
  reviewing: "Revisando",
  contacted: "Contactado",
  confirmed: "Confirmado",
  declined: "Rechazado",
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Dashboard() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const fetchAll = useServerFn(listAllOrders);
  const fetchAmIAdmin = useServerFn(amIAdmin);
  const updateStatus = useServerFn(updateOrderStatus);
  const [tab, setTab] = useState<"custom" | "shop">("custom");

  const { data: adminCheck, isLoading: adminLoading } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: () => fetchAmIAdmin(),
  });
  const isAdmin = Boolean(adminCheck?.isAdmin);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: () => fetchAll(),
    enabled: isAdmin,
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  async function onChangeStatus(kind: "custom" | "shop", id: string, status: AnyStatus) {
    try {
      await updateStatus({ data: { kind, id, status } });
      toast.success("Estado actualizado");
      refetch();
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  }

  if (adminLoading) {
    return (
      <>
        <Header />
        <main className="grain bg-background py-24">
          <p className="mx-auto max-w-md px-4 text-center text-sm text-muted-foreground">
            Comprobando permisos…
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="grain bg-background py-24">
          <div className="mx-auto max-w-md px-4 text-center">
            <h1 className="font-display text-4xl text-primary">Acceso restringido</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Tu cuenta ({user?.email}) no está autorizada para este panel.
            </p>
            <button
              onClick={signOut}
              className="mt-6 rounded-sm border border-primary px-4 py-2 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const custom = data?.custom ?? [];
  const shop = data?.shop ?? [];

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
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sesión: {user?.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NavTabs current="dashboard" />
              <button
                onClick={() => refetch()}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"
              >
                Refrescar
              </button>
              <button
                onClick={signOut}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs uppercase tracking-widest text-foreground hover:border-primary hover:text-primary"
              >
                Salir
              </button>
            </div>

          </div>

          <div className="mt-8 flex gap-2">
            <TabBtn active={tab === "custom"} onClick={() => setTab("custom")}>
              Encargos a medida ({custom.length})
            </TabBtn>
            <TabBtn active={tab === "shop"} onClick={() => setTab("shop")}>
              Pedidos de tienda ({shop.length})
            </TabBtn>
          </div>

          {isLoading && (
            <p className="mt-10 text-sm text-muted-foreground">Cargando…</p>
          )}
          {error && (
            <p className="mt-10 text-sm text-destructive">
              Error cargando datos. Comprueba que tu email está en la whitelist.
            </p>
          )}

          {!isLoading && !error && tab === "custom" && (
            <CustomOrdersTable rows={custom} onStatus={(id, s) => onChangeStatus("custom", id, s)} />
          )}
          {!isLoading && !error && tab === "shop" && (
            <ShopOrdersTable rows={shop} onStatus={(id, s) => onChangeStatus("shop", id, s)} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/20 text-foreground/70 hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function StatusSelect<T extends AnyStatus>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (s: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

type CustomRow = {
  id: string;
  created_at: string;
  status: CustomStatus;
  name: string;
  email: string;
  phone: string | null;
  order_type: string;
  event_date: string | null;
  servings: number | null;
  budget_range: string | null;
  flavors: string | null;
  allergens: string | null;
  message: string | null;
};

function CustomOrdersTable({
  rows,
  onStatus,
}: {
  rows: CustomRow[];
  onStatus: (id: string, s: CustomStatus) => void;
}) {
  if (rows.length === 0)
    return <p className="mt-10 text-sm text-muted-foreground">Sin encargos todavía.</p>;
  return (
    <div className="mt-8 space-y-3">
      {rows.map((r) => (
        <details
          key={r.id}
          className="group rounded-sm border border-foreground/15 bg-card p-4 open:border-primary"
        >
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-serif text-base font-semibold text-foreground">
                {r.name} <span className="text-muted-foreground">· {r.order_type}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.created_at)} · {r.email}
                {r.phone ? ` · ${r.phone}` : ""}
              </p>
            </div>
            <div onClick={(e) => e.preventDefault()}>
              <StatusSelect
                value={r.status}
                options={CUSTOM_STATUSES}
                onChange={(s) => onStatus(r.id, s)}
              />
            </div>
          </summary>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Info label="Fecha evento" value={r.event_date ?? "—"} />
            <Info label="Personas" value={r.servings ? String(r.servings) : "—"} />
            <Info label="Presupuesto" value={r.budget_range ?? "—"} />
            <Info label="Sabores" value={r.flavors ?? "—"} />
            <Info label="Alérgenos" value={r.allergens ?? "—"} />
          </dl>
          {r.message && (
            <div className="mt-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Mensaje
              </p>
              <p className="mt-1 whitespace-pre-wrap rounded-sm bg-muted/50 p-3 text-sm">
                {r.message}
              </p>
            </div>
          )}
        </details>
      ))}
    </div>
  );
}

type ShopItem = { id: string; name: string; qty: number; price_cents: number };
type ShopRow = {
  id: string;
  created_at: string;
  status: ShopStatus;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  items: unknown;
  total_cents: number;
};

function ShopOrdersTable({
  rows,
  onStatus,
}: {
  rows: ShopRow[];
  onStatus: (id: string, s: ShopStatus) => void;
}) {
  if (rows.length === 0)
    return <p className="mt-10 text-sm text-muted-foreground">Sin pedidos todavía.</p>;
  return (
    <div className="mt-8 space-y-3">
      {rows.map((r) => {
        const items = (Array.isArray(r.items) ? r.items : []) as ShopItem[];
        return (
          <details
            key={r.id}
            className="group rounded-sm border border-foreground/15 bg-card p-4 open:border-primary"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base font-semibold text-foreground">
                  {r.name}{" "}
                  <span className="text-secondary">· {formatEUR(r.total_cents)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.created_at)} · {r.phone}
                  {r.email ? ` · ${r.email}` : ""}
                </p>
              </div>
              <div onClick={(e) => e.preventDefault()}>
                <StatusSelect
                  value={r.status}
                  options={SHOP_STATUSES}
                  onChange={(s) => onStatus(r.id, s)}
                />
              </div>
            </summary>
            <ul className="mt-4 divide-y divide-foreground/10 text-sm">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    {it.qty} × {it.name}
                  </span>
                  <span className="font-mono">{formatEUR(it.qty * it.price_cents)}</span>
                </li>
              ))}
            </ul>
            {r.notes && (
              <div className="mt-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Notas
                </p>
                <p className="mt-1 whitespace-pre-wrap rounded-sm bg-muted/50 p-3 text-sm">
                  {r.notes}
                </p>
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}
