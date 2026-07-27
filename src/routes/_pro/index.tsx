import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  amIPro,
  attachProPaymentMethod,
  createProOrder,
  createProSetupIntent,
  getMyProProfile,
  listMyProOrders,
  listMyProPaymentMethods,
  listProCatalog,
} from "@/lib/pro.functions";

export const Route = createFileRoute("/_pro/")({
  head: () => ({
    meta: [
      { title: "Área Profesional — 144 Reality" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProPortal,
});

const eur = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );

type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  image_url: string;
  price_cents: number;
  wholesale_price_cents: number | null;
  tax_rate_percent: number;
  in_stock: boolean;
  variants: Array<{ id: string; name: string; active?: boolean }> | null;
  tags: string[] | null;
};

type CartLine = {
  product_id: string;
  qty: number;
  variant_id?: string | null;
};

function ProPortal() {
  const fetchAmIPro = useServerFn(amIPro);
  const fetchProfile = useServerFn(getMyProProfile);
  const fetchCatalog = useServerFn(listProCatalog);
  const fetchOrders = useServerFn(listMyProOrders);

  const proCheck = useQuery({ queryKey: ["am-i-pro"], queryFn: () => fetchAmIPro() });
  const profileQ = useQuery({
    queryKey: ["pro-profile"],
    queryFn: () => fetchProfile(),
    enabled: proCheck.data?.isPro === true,
  });
  const catalogQ = useQuery({
    queryKey: ["pro-catalog"],
    queryFn: () => fetchCatalog(),
    enabled: proCheck.data?.isPro === true,
  });
  const ordersQ = useQuery({
    queryKey: ["pro-orders"],
    queryFn: () => fetchOrders(),
    enabled: proCheck.data?.isPro === true,
  });

  const [tab, setTab] = useState<"catalogo" | "pedidos" | "cuenta">("catalogo");

  if (proCheck.isLoading) {
    return <FrameMessage msg="Comprobando permisos…" />;
  }
  if (!proCheck.data?.isPro) {
    return (
      <FrameMessage msg="Acceso restringido al portal profesional. Contacta con 144 Reality si necesitas una cuenta PRO." />
    );
  }
  const profile = profileQ.data;
  const catalog = (catalogQ.data ?? []) as CatalogItem[];
  const orders = (ordersQ.data ?? []) as any[];

  return (
    <>
      <Header />
      <main className="grain bg-background py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-foreground/15 pb-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
                — Área Profesional
              </p>
              <h1 className="font-serif text-3xl">
                {profile?.trade_name || profile?.legal_name || "Portal PRO"}
              </h1>
              {profile?.discount_percent > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Descuento aplicado sobre precios PRO: {profile.discount_percent}%
                </p>
              )}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="rounded-sm border border-foreground/20 px-3 py-2 text-xs uppercase tracking-widest text-foreground/70 hover:border-primary hover:text-primary"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <TabButton active={tab === "catalogo"} onClick={() => setTab("catalogo")}>
              Catálogo & pedido
            </TabButton>
            <TabButton active={tab === "pedidos"} onClick={() => setTab("pedidos")}>
              Mis pedidos ({orders.length})
            </TabButton>
            <TabButton active={tab === "cuenta"} onClick={() => setTab("cuenta")}>
              Cuenta & pago
            </TabButton>
          </div>

          <div className="mt-6">
            {tab === "catalogo" && (
              <CatalogTab
                catalog={catalog}
                discount={profile?.discount_percent ?? 0}
                needsPaymentMethod={!profile?.default_payment_method_id}
              />
            )}
            {tab === "pedidos" && <OrdersTab orders={orders} />}
            {tab === "cuenta" && <AccountTab profile={profile} />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function FrameMessage({ msg }: { msg: string }) {
  return (
    <>
      <Header />
      <main className="grain bg-background py-24">
        <div className="mx-auto max-w-lg px-4 text-center">
          <p className="text-sm text-muted-foreground">{msg}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="rounded-sm border border-foreground/20 px-3 py-2 text-xs uppercase tracking-widest hover:border-primary hover:text-primary"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-sm border px-3 py-2 text-xs font-semibold uppercase tracking-widest transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/20 text-foreground/70 hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- CATALOG ---------------------------------- */

function CatalogTab({
  catalog,
  discount,
  needsPaymentMethod,
}: {
  catalog: CatalogItem[];
  discount: number;
  needsPaymentMethod: boolean;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const submit = useServerFn(createProOrder);
  const qc = useQueryClient();

  const cartLines = useMemo(() => {
    return cart.map((c) => {
      const p = catalog.find((x) => x.id === c.product_id);
      const base = p?.wholesale_price_cents ?? p?.price_cents ?? 0;
      const unitPrice = Math.round((base * (100 - discount)) / 100);
      const variantName =
        c.variant_id && p?.variants
          ? p.variants.find((v) => v.id === c.variant_id)?.name ?? null
          : null;
      const subtotal = unitPrice * c.qty;
      const tax = Math.round((subtotal * (p?.tax_rate_percent ?? 21)) / 100);
      return { ...c, p, base, unitPrice, subtotal, tax, variantName };
    });
  }, [cart, catalog, discount]);

  const totals = cartLines.reduce(
    (acc, l) => ({
      subtotal: acc.subtotal + l.subtotal,
      tax: acc.tax + l.tax,
      total: acc.total + l.subtotal + l.tax,
    }),
    { subtotal: 0, tax: 0, total: 0 },
  );

  function addToCart(product: CatalogItem, variantId?: string) {
    setCart((prev) => {
      const key = product.id + (variantId ?? "");
      const existing = prev.find(
        (l) => l.product_id === product.id && (l.variant_id ?? "") === (variantId ?? ""),
      );
      if (existing) {
        return prev.map((l) =>
          l.product_id === product.id && (l.variant_id ?? "") === (variantId ?? "")
            ? { ...l, qty: l.qty + 1 }
            : l,
        );
      }
      return [...prev, { product_id: product.id, qty: 1, variant_id: variantId ?? null }];
    });
    toast.success(`Añadido: ${product.name}`);
  }

  function updateQty(idx: number, qty: number) {
    setCart((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: Math.max(1, qty) } : l)));
  }
  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await submit({
        data: {
          items: cart.map((c) => ({
            product_id: c.product_id,
            qty: c.qty,
            variant_id: c.variant_id ?? undefined,
          })),
          notes,
          requested_delivery_date: deliveryDate || null,
        },
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Pedido enviado. Recibirás la factura cuando lo confirmemos.");
      setCart([]);
      setNotes("");
      setDeliveryDate("");
      qc.invalidateQueries({ queryKey: ["pro-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar el pedido."),
  });

  if (needsPaymentMethod) {
    return (
      <div className="rounded-sm border border-primary/40 bg-primary/5 p-6 text-sm">
        <p className="mb-3 font-semibold">
          Debes añadir un método de pago antes de realizar tu primer pedido.
        </p>
        <p className="text-muted-foreground">
          Ve a la pestaña <strong>Cuenta &amp; pago</strong> y guarda una tarjeta.
          Las facturas se cobran automáticamente según tus condiciones.
        </p>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay productos disponibles en el catálogo profesional.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.map((p) => {
          const base = p.wholesale_price_cents ?? p.price_cents;
          const discounted = Math.round((base * (100 - discount)) / 100);
          const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
          const [firstVariant] = p.variants ?? [];
          return (
            <article
              key={p.id}
              className="rounded-sm border border-foreground/15 bg-card p-4"
            >
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="mb-3 h-40 w-full rounded-sm object-cover"
                />
              )}
              <h3 className="font-serif text-lg">{p.name}</h3>
              <p className="mb-2 text-xs text-muted-foreground">{p.category}</p>
              <p className="mb-3 line-clamp-2 text-xs text-foreground/70">{p.description}</p>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-primary">{eur(discounted)}</span>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  + IVA {p.tax_rate_percent}%
                </span>
              </div>
              {hasVariants ? (
                <VariantAddControl product={p} onAdd={(vid) => addToCart(p, vid)} />
              ) : (
                <button
                  onClick={() => addToCart(p)}
                  disabled={!p.in_stock}
                  className="w-full rounded-sm border border-primary bg-primary px-3 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p.in_stock ? "Añadir" : "Agotado"}
                </button>
              )}
              {firstVariant && !p.in_stock && (
                <p className="mt-2 text-[11px] text-destructive">Sin stock</p>
              )}
            </article>
          );
        })}
      </div>

      <aside className="sticky top-4 h-fit rounded-sm border border-foreground/15 bg-card p-4">
        <h3 className="mb-3 font-serif text-lg">Carrito</h3>
        {cartLines.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin artículos.</p>
        ) : (
          <>
            <ul className="mb-3 divide-y divide-foreground/10 text-xs">
              {cartLines.map((l, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{l.p?.name}</p>
                      {l.variantName && (
                        <p className="text-muted-foreground">— {l.variantName}</p>
                      )}
                      <p className="text-muted-foreground">
                        {eur(l.unitPrice)} · IVA {l.p?.tax_rate_percent ?? 21}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => updateQty(i, parseInt(e.target.value || "1"))}
                        className="w-14 rounded-sm border border-foreground/20 bg-background px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => removeLine(i)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        aria-label="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-foreground/10 pt-3 text-xs">
              <div className="flex justify-between">
                <span>Base imponible</span>
                <span>{eur(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IVA</span>
                <span>{eur(totals.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-foreground/10 pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{eur(totals.total)}</span>
              </div>
            </div>
            <label className="mt-3 block text-xs">
              <span className="mb-1 block font-mono uppercase tracking-widest text-muted-foreground">
                Fecha entrega deseada
              </span>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-sm border border-foreground/20 bg-background px-2 py-1"
              />
            </label>
            <label className="mt-2 block text-xs">
              <span className="mb-1 block font-mono uppercase tracking-widest text-muted-foreground">
                Notas
              </span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                className="w-full rounded-sm border border-foreground/20 bg-background px-2 py-1"
              />
            </label>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || cart.length === 0}
              className="mt-3 w-full rounded-sm border border-primary bg-primary px-3 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "Enviando…" : "Enviar pedido"}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Al enviar, 144 Reality lo revisará y emitirá una factura que se cobrará según
              tus condiciones de pago.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function VariantAddControl({
  product,
  onAdd,
}: {
  product: CatalogItem;
  onAdd: (variantId: string) => void;
}) {
  const active = (product.variants ?? []).filter((v) => v.active !== false);
  const [sel, setSel] = useState<string>(active[0]?.id ?? "");
  return (
    <div className="flex gap-2">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="flex-1 rounded-sm border border-foreground/20 bg-background px-2 py-2 text-xs"
      >
        {active.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => sel && onAdd(sel)}
        disabled={!sel || !product.in_stock}
        className="rounded-sm border border-primary bg-primary px-3 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Añadir
      </button>
    </div>
  );
}

/* ---------------------------------- ORDERS ---------------------------------- */

const PRO_STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  facturado: "Facturado",
  pagado: "Pagado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function OrdersTab({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no tienes pedidos.</p>;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <article
          key={o.id}
          className="rounded-sm border border-foreground/15 bg-card p-4 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("es-ES")}
              </p>
              <p className="mt-1 font-semibold">
                {eur(o.total_cents)}{" "}
                <span className="text-xs text-muted-foreground">
                  (base {eur(o.subtotal_cents)} + IVA {eur(o.tax_cents)})
                </span>
              </p>
            </div>
            <StatusChip status={o.status} />
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {(o.items ?? []).map((it: any, i: number) => (
              <li key={i} className="flex justify-between gap-3 text-muted-foreground">
                <span>
                  {it.qty}× {it.name}
                  {it.variant ? ` — ${it.variant}` : ""}
                  {it.portion ? " (porción)" : ""}
                </span>
                <span>{eur(it.unit_price_cents * it.qty)}</span>
              </li>
            ))}
          </ul>
          {o.stripe_invoice_url && (
            <a
              href={o.stripe_invoice_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs uppercase tracking-widest text-primary hover:underline"
            >
              Ver / pagar factura →
            </a>
          )}
          {o.stripe_invoice_pdf && (
            <a
              href={o.stripe_invoice_pdf}
              target="_blank"
              rel="noreferrer"
              className="mt-3 ml-4 inline-block text-xs uppercase tracking-widest text-primary hover:underline"
            >
              PDF ↓
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "pagado" || status === "entregado"
      ? "bg-primary text-primary-foreground"
      : status === "cancelado"
      ? "bg-destructive/10 text-destructive"
      : status === "facturado"
      ? "bg-secondary/20 text-secondary"
      : "bg-foreground/10 text-foreground/70";
  return (
    <span
      className={`rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${cls}`}
    >
      {PRO_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ---------------------------------- ACCOUNT ---------------------------------- */

function AccountTab({ profile }: { profile: any }) {
  const fetchList = useServerFn(listMyProPaymentMethods);
  const env = getStripeEnvironment();
  const pmQuery = useQuery({
    queryKey: ["pro-payment-methods"],
    queryFn: () => fetchList({ data: { environment: env } }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-sm border border-foreground/15 bg-card p-4 text-sm">
        <h3 className="mb-3 font-serif text-lg">Datos fiscales</h3>
        {profile ? (
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-xs">
            <dt className="text-muted-foreground">Razón social</dt>
            <dd>{profile.legal_name}</dd>
            {profile.trade_name && (
              <>
                <dt className="text-muted-foreground">Nombre comercial</dt>
                <dd>{profile.trade_name}</dd>
              </>
            )}
            <dt className="text-muted-foreground">CIF/NIF</dt>
            <dd>{profile.tax_id}</dd>
            <dt className="text-muted-foreground">Email facturación</dt>
            <dd>{profile.billing_email}</dd>
            <dt className="text-muted-foreground">Dirección</dt>
            <dd>
              {profile.address_line1}
              {profile.address_line2 ? `, ${profile.address_line2}` : ""}
              <br />
              {profile.postal_code} {profile.city}
              {profile.province ? `, ${profile.province}` : ""}
            </dd>
            <dt className="text-muted-foreground">Condiciones</dt>
            <dd>
              {profile.payment_terms_days === 0
                ? "Contado (cobro automático)"
                : `Pago a ${profile.payment_terms_days} días`}
            </dd>
          </dl>
        ) : (
          <p className="text-muted-foreground">Sin perfil.</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Para modificar tus datos fiscales contacta con 144 Reality.
        </p>
      </section>

      <section className="rounded-sm border border-foreground/15 bg-card p-4 text-sm">
        <h3 className="mb-3 font-serif text-lg">Método de pago</h3>
        {pmQuery.isLoading && <p className="text-muted-foreground">Cargando…</p>}
        {pmQuery.data && "methods" in pmQuery.data && pmQuery.data.methods.length > 0 && (
          <ul className="mb-3 space-y-2 text-xs">
            {pmQuery.data.methods.map((m: any) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-sm border border-foreground/10 px-3 py-2"
              >
                <span>
                  {m.brand.toUpperCase()} · **** {m.last4} · {String(m.exp_month).padStart(2, "0")}/
                  {String(m.exp_year).slice(-2)}
                </span>
                {pmQuery.data && "defaultId" in pmQuery.data && pmQuery.data.defaultId === m.id && (
                  <span className="rounded-sm bg-primary px-2 py-1 text-[10px] uppercase tracking-widest text-primary-foreground">
                    Por defecto
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddPaymentMethod onSaved={() => pmQuery.refetch()} />
      </section>
    </div>
  );
}

function AddPaymentMethod({ onSaved }: { onSaved: () => void }) {
  const createIntent = useServerFn(createProSetupIntent);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const env = getStripeEnvironment();

  async function start() {
    setStarting(true);
    try {
      const res = await createIntent({ data: { environment: env } });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setClientSecret((res as any).clientSecret);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo iniciar el registro.");
    } finally {
      setStarting(false);
    }
  }

  if (!clientSecret) {
    return (
      <button
        onClick={start}
        disabled={starting}
        className="rounded-sm border border-primary bg-primary px-3 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {starting ? "Cargando…" : "Añadir tarjeta"}
      </button>
    );
  }

  const options: StripeElementsOptions = { clientSecret };
  return (
    <Elements stripe={getStripe()} options={options}>
      <SetupForm
        onDone={() => {
          setClientSecret(null);
          onSaved();
        }}
      />
    </Elements>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const attach = useServerFn(attachProPaymentMethod);
  const [busy, setBusy] = useState(false);
  const env = getStripeEnvironment();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (result.error) {
        toast.error(result.error.message ?? "No se pudo confirmar.");
        return;
      }
      const pmId =
        typeof result.setupIntent?.payment_method === "string"
          ? result.setupIntent.payment_method
          : (result.setupIntent?.payment_method as any)?.id;
      if (!pmId) {
        toast.error("Stripe no devolvió el método de pago.");
        return;
      }
      const res = await attach({
        data: { environment: env, paymentMethodId: pmId },
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Método de pago guardado.");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full rounded-sm border border-primary bg-primary px-3 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar tarjeta"}
      </button>
    </form>
  );
}
