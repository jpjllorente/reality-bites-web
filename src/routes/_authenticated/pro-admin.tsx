import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { NavTabs } from "./productos";
import { getStripeEnvironment } from "@/lib/stripe";
import { amIAdmin } from "@/lib/auth-admin.functions";
import {
  listProCustomers,
  createProCustomer,
  updateProCustomer,
  listProOrdersAdmin,
  confirmAndInvoiceProOrder,
  markProOrderDelivered,
  cancelProOrderAdmin,
} from "@/lib/pro-admin.functions";

export const Route = createFileRoute("/_authenticated/pro-admin")({
  head: () => ({
    meta: [
      { title: "Clientes PRO — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProAdminPage,
});

type CustomerForm = {
  id?: string;
  email: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  billing_email: string;
  contact_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  payment_terms_days: 0 | 7 | 15 | 30 | 60;
  discount_percent: number;
  is_active: boolean;
  notes: string;
};

const EMPTY_CUSTOMER: CustomerForm = {
  email: "",
  legal_name: "",
  trade_name: "",
  tax_id: "",
  billing_email: "",
  contact_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  province: "",
  country: "ES",
  payment_terms_days: 0,
  discount_percent: 0,
  is_active: true,
  notes: "",
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  nuevo: "bg-sky-100 text-sky-900 border-sky-300",
  confirmado: "bg-amber-100 text-amber-900 border-amber-300",
  facturado: "bg-indigo-100 text-indigo-900 border-indigo-300",
  pagado: "bg-emerald-100 text-emerald-900 border-emerald-300",
  entregado: "bg-neutral-200 text-neutral-800 border-neutral-400",
  cancelado: "bg-rose-100 text-rose-900 border-rose-300",
};

function euros(cents: number | null | undefined) {
  return `${((cents ?? 0) / 100).toFixed(2)} €`;
}

function ProAdminPage() {
  const { user } = Route.useRouteContext();
  const fetchAmIAdmin = useServerFn(amIAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["am-i-admin", user?.id],
    queryFn: () => fetchAmIAdmin(),
  });

  const [tab, setTab] = useState<"clientes" | "pedidos">("clientes");

  if (adminCheck && !adminCheck.isAdmin) {
    return (
      <>
        <Header />
        <main className="grain bg-background py-24">
          <p className="mx-auto max-w-md text-center text-sm text-muted-foreground">
            No tienes permisos de administrador.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="grain bg-background py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-secondary">
                Área profesional
              </p>
              <h1 className="font-display text-3xl tracking-widest text-primary">
                CLIENTES Y PEDIDOS PRO
              </h1>
            </div>
            <NavTabs current="pro" />
          </div>

          <div className="mt-8 flex gap-2">
            {(["clientes", "pedidos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                  tab === t
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-foreground/20 text-foreground/70 hover:border-primary hover:text-primary"
                }`}
              >
                {t === "clientes" ? "Clientes PRO" : "Pedidos PRO"}
              </button>
            ))}
          </div>

          {tab === "clientes" ? <CustomersTab /> : <OrdersTab />}
        </div>
      </main>
      <Footer />
    </>
  );
}

function CustomersTab() {
  const list = useServerFn(listProCustomers);
  const create = useServerFn(createProCustomer);
  const update = useServerFn(updateProCustomer);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pro-customers"],
    queryFn: () => list(),
  });
  const [editing, setEditing] = useState<CustomerForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!editing) return;
    if (!editing.legal_name.trim() || !editing.tax_id.trim()) {
      toast.error("Razón social y NIF/CIF son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        billing_email: editing.billing_email || editing.email,
      };
      const res: any = editing.id
        ? await update({ data: { ...payload, id: editing.id } as any })
        : await create({
            data: {
              ...payload,
              environment: getStripeEnvironment(),
              returnUrl: `${window.location.origin}/reset-password`,
            } as any,
          });
      if (res?.error) throw new Error(res.error);
      toast.success(
        editing.id ? "Cliente actualizado" : "Cliente creado e invitado por email",
      );
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setEditing({ ...EMPTY_CUSTOMER })}
        className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
      >
        + Nuevo cliente PRO
      </button>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(data ?? []).map((c: any) => (
          <article
            key={c.id}
            className="rounded-sm border border-foreground/15 bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-base font-semibold">
                  {c.legal_name}
                  {!c.is_active && (
                    <span className="ml-2 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                      inactivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.tax_id} · {c.billing_email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.address_line1}, {c.postal_code} {c.city}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-secondary">
                  Dto {c.discount_percent}% · Pago{" "}
                  {c.payment_terms_days === 0
                    ? "inmediato (tarjeta)"
                    : `a ${c.payment_terms_days} días`}
                  {c.default_payment_method_id ? " · tarjeta guardada" : " · sin tarjeta"}
                </p>
              </div>
              <button
                onClick={() =>
                  setEditing({
                    id: c.id,
                    email: c.billing_email,
                    legal_name: c.legal_name,
                    trade_name: c.trade_name ?? "",
                    tax_id: c.tax_id,
                    billing_email: c.billing_email,
                    contact_name: c.contact_name ?? "",
                    phone: c.phone ?? "",
                    address_line1: c.address_line1,
                    address_line2: c.address_line2 ?? "",
                    postal_code: c.postal_code,
                    city: c.city,
                    province: c.province ?? "",
                    country: c.country ?? "ES",
                    payment_terms_days: c.payment_terms_days ?? 0,
                    discount_percent: c.discount_percent ?? 0,
                    is_active: c.is_active ?? true,
                    notes: c.notes ?? "",
                  })
                }
                className="rounded-sm border border-foreground/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest hover:border-primary hover:text-primary"
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/50 p-4">
          <div className="mx-auto max-w-2xl rounded-sm border border-foreground/20 bg-background p-5">
            <h2 className="font-display text-xl tracking-widest text-primary">
              {editing.id ? "EDITAR CLIENTE PRO" : "NUEVO CLIENTE PRO"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Al crear el cliente se envía una invitación por email para que active su
              cuenta y acceda al portal profesional.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!editing.id && (
                <Field
                  label="Email de acceso"
                  value={editing.email}
                  onChange={(v) => setEditing((s) => (s ? { ...s, email: v } : s))}
                />
              )}
              <Field
                label="Razón social"
                value={editing.legal_name}
                onChange={(v) => setEditing((s) => (s ? { ...s, legal_name: v } : s))}
              />
              <Field
                label="Nombre comercial"
                value={editing.trade_name}
                onChange={(v) => setEditing((s) => (s ? { ...s, trade_name: v } : s))}
              />
              <Field
                label="NIF / CIF"
                value={editing.tax_id}
                onChange={(v) => setEditing((s) => (s ? { ...s, tax_id: v } : s))}
              />
              <Field
                label="Email de facturación"
                value={editing.billing_email}
                onChange={(v) => setEditing((s) => (s ? { ...s, billing_email: v } : s))}
              />
              <Field
                label="Persona de contacto"
                value={editing.contact_name}
                onChange={(v) => setEditing((s) => (s ? { ...s, contact_name: v } : s))}
              />
              <Field
                label="Teléfono"
                value={editing.phone}
                onChange={(v) => setEditing((s) => (s ? { ...s, phone: v } : s))}
              />
              <Field
                label="Dirección"
                value={editing.address_line1}
                onChange={(v) => setEditing((s) => (s ? { ...s, address_line1: v } : s))}
              />
              <Field
                label="Dirección (línea 2)"
                value={editing.address_line2}
                onChange={(v) => setEditing((s) => (s ? { ...s, address_line2: v } : s))}
              />
              <Field
                label="Código postal"
                value={editing.postal_code}
                onChange={(v) => setEditing((s) => (s ? { ...s, postal_code: v } : s))}
              />
              <Field
                label="Ciudad"
                value={editing.city}
                onChange={(v) => setEditing((s) => (s ? { ...s, city: v } : s))}
              />
              <Field
                label="Provincia"
                value={editing.province}
                onChange={(v) => setEditing((s) => (s ? { ...s, province: v } : s))}
              />
              <Field
                label="País (ISO 2)"
                value={editing.country}
                onChange={(v) =>
                  setEditing((s) => (s ? { ...s, country: v.toUpperCase().slice(0, 2) } : s))
                }
              />
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Condiciones de pago
                </span>
                <select
                  value={editing.payment_terms_days}
                  onChange={(e) =>
                    setEditing((s) =>
                      s
                        ? { ...s, payment_terms_days: Number(e.target.value) as 0 }
                        : s,
                    )
                  }
                  className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value={0}>Cobro inmediato con tarjeta guardada</option>
                  <option value={7}>Factura a 7 días</option>
                  <option value={15}>Factura a 15 días</option>
                  <option value={30}>Factura a 30 días</option>
                  <option value={60}>Factura a 60 días</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Descuento adicional (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.discount_percent}
                  onChange={(e) =>
                    setEditing((s) =>
                      s
                        ? {
                            ...s,
                            discount_percent: Math.max(
                              0,
                              Math.min(100, Number(e.target.value) || 0),
                            ),
                          }
                        : s,
                    )
                  }
                  className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) =>
                    setEditing((s) => (s ? { ...s, is_active: e.target.checked } : s))
                  }
                />
                <span className="text-xs uppercase tracking-widest">Cuenta activa</span>
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Notas internas
              </span>
              <textarea
                rows={3}
                value={editing.notes}
                onChange={(e) =>
                  setEditing((s) => (s ? { ...s, notes: e.target.value } : s))
                }
                className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-sm border border-foreground/20 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-sm bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const list = useServerFn(listProOrdersAdmin);
  const invoice = useServerFn(confirmAndInvoiceProOrder);
  const deliver = useServerFn(markProOrderDelivered);
  const cancel = useServerFn(cancelProOrderAdmin);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pro-orders-admin"],
    queryFn: () => list(),
  });
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<any>, ok: string) {
    setBusy(id);
    try {
      const res = await fn();
      if (res?.error) throw new Error(res.error);
      toast.success(ok);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <div className="space-y-4">
        {(data ?? []).map((o: any) => (
          <article
            key={o.id}
            className="rounded-sm border border-foreground/15 bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-base font-semibold">
                  {o.pro_customer?.legal_name ?? "Cliente"}{" "}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{String(o.id).slice(0, 8)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("es-ES")}
                  {o.requested_delivery_date
                    ? ` · entrega solicitada ${o.requested_delivery_date}`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                  ORDER_STATUS_STYLE[o.status] ?? "border-foreground/20"
                }`}
              >
                {o.status}
              </span>
            </div>

            <ul className="mt-3 space-y-1 text-xs">
              {(o.items ?? []).map((it: any, i: number) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {it.qty} × {it.name}
                    {it.variant ? ` — ${it.variant}` : ""}
                    {it.portion ? " (porción)" : ""}
                  </span>
                  <span className="font-mono">
                    {euros(it.unit_price_cents * it.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 pt-3 text-xs">
              <span className="font-mono">
                Base {euros(o.subtotal_cents)} · IVA {euros(o.tax_cents)} ·{" "}
                <strong>Total {euros(o.total_cents)}</strong>
              </span>
              <div className="flex flex-wrap gap-2">
                {o.stripe_invoice_url && (
                  <a
                    href={o.stripe_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm border border-foreground/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest hover:border-primary hover:text-primary"
                  >
                    Ver factura
                  </a>
                )}
                {(o.status === "nuevo" || o.status === "confirmado") && (
                  <>
                    <button
                      disabled={busy === o.id}
                      onClick={() =>
                        run(
                          o.id,
                          () =>
                            invoice({
                              data: {
                                orderId: o.id,
                                environment: getStripeEnvironment(),
                              },
                            }),
                          "Pedido facturado",
                        )
                      }
                      className="rounded-sm bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
                    >
                      Confirmar y facturar
                    </button>
                    <button
                      disabled={busy === o.id}
                      onClick={() => {
                        const reason = prompt("Motivo de cancelación (opcional)") ?? "";
                        run(
                          o.id,
                          () => cancel({ data: { orderId: o.id, reason } }),
                          "Pedido cancelado",
                        );
                      }}
                      className="rounded-sm border border-foreground/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                {(o.status === "facturado" || o.status === "pagado") && (
                  <button
                    disabled={busy === o.id}
                    onClick={() =>
                      run(
                        o.id,
                        () => deliver({ data: { orderId: o.id } }),
                        "Pedido entregado",
                      )
                    }
                    className="rounded-sm bg-secondary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-secondary-foreground disabled:opacity-50"
                  >
                    Marcar entregado
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay pedidos profesionales.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
