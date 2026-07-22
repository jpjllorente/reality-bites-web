import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { fetchPublicProducts, type Category, type Product } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { StripeEmbeddedCheckout } from "@/components/site/StripeEmbeddedCheckout";
import { createInStoreOrder } from "@/lib/payments.functions";
import { toast } from "sonner";

const categories: Array<Category | "Todo"> = ["Todo", "Repostería", "Café", "Bites"];

function formatPrice(v: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}


export function Catalog({ initialProducts }: { initialProducts?: Product[] } = {}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Category | "Todo">("Todo");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [items, setItems] = useState<Product[]>(initialProducts ?? []);
  const cart = useCart();

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) return;
    fetchPublicProducts().then(setItems).catch(() => setItems([]));
  }, [initialProducts]);

  const list = useMemo(
    () => (filter === "Todo" ? items : items.filter((p) => p.category === filter)),
    [filter, items],
  );


  const [payOpen, setPayOpen] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<{
    items: { slug: string; qty: number; variantId?: string; portion?: boolean }[];
    customer: { name: string; phone: string; email?: string; notes?: string };
  } | null>(null);

  function validateForm() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Nombre y teléfono son obligatorios");
      return false;
    }
    if (cart.items.length === 0) return false;
    return true;
  }

  function buildPayload() {
    return {
      items: cart.items.map((i) => ({
        slug: i.product.slug,
        qty: i.qty,
        variantId: i.variantId,
        portion: i.portion || undefined,
      })),
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
    };
  }


  function onGoToPayment() {
    if (!validateForm()) return;
    setSubmitting(true);
    setCheckoutPayload(buildPayload());
    setCheckoutOpen(false);
    setCartOpen(false);
    setPayOpen(true);
    setSubmitting(false);
  }

  async function onPayInStore() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await createInStoreOrder({
        data: {
          items: payload.items,
          customer: {
            name: payload.customer.name,
            phone: payload.customer.phone,
            email: payload.customer.email || "",
            notes: payload.customer.notes || "",
          },
        },
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      cart.clear();
      setCheckoutOpen(false);
      setCartOpen(false);
      navigate({ to: "/tienda/reservado", search: { order_id: res.orderId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tienda/pago-completado?session_id={CHECKOUT_SESSION_ID}`
      : "";




  return (
    <section id="catalogo" className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-foreground/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
              — Carta 001
            </p>
            <h2 className="font-display text-5xl leading-none text-primary sm:text-7xl">
              Catálogo & <span className="text-secondary">tienda</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Elige lo que te apetezca, arma tu pedido y te enviamos la confirmación por email.
              Sin trámites raros.
            </p>

          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="group relative inline-flex items-center gap-3 rounded-sm border border-primary bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-widest text-primary-foreground transition hover:bg-primary/90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l2.4 12.6a2 2 0 0 0 2 1.4h8.2a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
            </svg>
            Tu pedido
            <span className="grid min-w-6 place-items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {cart.count}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                filter === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/20 bg-transparent text-foreground/70 hover:border-primary hover:text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li
              key={p.id}
              className="group relative flex flex-col overflow-hidden rounded-sm border border-foreground/10 bg-card shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  width={900}
                  height={900}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-sm bg-background/90 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg font-bold leading-tight text-foreground">
                    <Link
                      to="/tienda/$slug"
                      params={{ slug: p.slug }}
                      className="hover:text-primary hover:underline underline-offset-4"
                    >
                      {p.name}
                    </Link>
                  </h3>
                  <span className="shrink-0 font-display text-2xl text-secondary">
                    {formatPrice(p.price)}
                  </span>
                </div>
                {p.tags && p.tags.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-sm border border-secondary/40 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm text-muted-foreground">{p.description}</p>
                {p.inStock === false ? (
                  <button
                    disabled
                    className="mt-auto inline-flex cursor-not-allowed items-center justify-center rounded-sm border border-foreground/20 bg-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Agotado
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      cart.add(p);
                      setCartOpen(true);
                    }}
                    className="mt-auto inline-flex items-center justify-center rounded-sm border border-primary/30 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    + Añadir al pedido
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar"
            onClick={() => setCartOpen(false)}
            className="flex-1 bg-primary/60 backdrop-blur-sm"
          />
          <aside className="flex w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-5">
              <h3 className="font-display text-2xl tracking-widest text-primary">TU PEDIDO</h3>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-sm p-2 text-foreground/60 hover:bg-muted"
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.items.length === 0 ? (
                <p className="mt-10 text-center text-sm text-muted-foreground">
                  Aún no has añadido nada. Elige algo dulce ↖
                </p>
              ) : (
                <ul className="space-y-4">
                  {cart.items.map((i) => (
                    <li key={i.key} className="flex gap-3 border-b border-foreground/10 pb-4">
                      <img
                        src={i.product.image}
                        alt=""
                        className="h-16 w-16 rounded-sm object-cover"
                        width={64}
                        height={64}
                        loading="lazy"
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-serif text-sm font-semibold">
                            {i.product.name}
                            {i.variantName && (
                              <span className="ml-1 text-muted-foreground">— {i.variantName}</span>
                            )}
                            {i.portion && (
                              <span className="ml-1 rounded bg-secondary/15 px-1 text-[10px] uppercase text-secondary">porción</span>
                            )}
                          </p>
                          <button
                            onClick={() => cart.remove(i.key)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Quitar
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(i.unitPrice)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => cart.setQty(i.key, i.qty - 1)}
                            className="grid h-7 w-7 place-items-center rounded-sm border border-foreground/20 hover:border-primary"
                            aria-label="Restar"
                          >−</button>
                          <span className="w-6 text-center font-mono text-sm">{i.qty}</span>
                          <button
                            onClick={() => cart.setQty(i.key, i.qty + 1)}
                            className="grid h-7 w-7 place-items-center rounded-sm border border-foreground/20 hover:border-primary"
                            aria-label="Sumar"
                          >+</button>
                          <span className="ml-auto font-display text-lg text-primary">
                            {formatPrice(i.qty * i.unitPrice)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}

                </ul>
              )}
            </div>

            <div className="border-t border-foreground/10 bg-muted/40 px-6 py-5">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="font-display text-3xl text-primary">
                  {formatPrice(cart.total)}
                </span>
              </div>
              <button
                disabled={cart.items.length === 0}
                onClick={() => setCheckoutOpen(true)}
                className="block w-full rounded-sm bg-secondary py-3 text-center text-sm font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 disabled:pointer-events-none disabled:opacity-40"
              >
                Continuar pedido
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Elige pagar ahora con tarjeta/Bizum o reservar y pagar en tienda.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-primary/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-sm border border-foreground/15 bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">— Confirmar pedido</p>
                <h3 className="mt-1 font-display text-3xl text-primary">Tus datos</h3>
              </div>
              <button onClick={() => setCheckoutOpen(false)} className="rounded-sm p-2 text-foreground/60 hover:bg-muted" aria-label="Cerrar">✕</button>
            </div>
            <div className="mt-5 space-y-3">
              <Field label="Nombre *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <Field label="Teléfono *" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} type="tel" />
              <Field label="Email (opcional)" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notas (opcional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Recogida, entrega, hora preferida…"
                />
              </label>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="font-display text-2xl text-primary">{formatPrice(cart.total)}</span>
              </div>
              <button
                disabled={submitting}
                onClick={onGoToPayment}
                className="w-full rounded-sm bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 disabled:opacity-50"
              >
                {submitting ? "Cargando…" : "Pagar ahora online"}
              </button>
              <button
                disabled={submitting}
                onClick={onPayInStore}
                className="w-full rounded-sm border border-primary bg-transparent px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Reservar y pagar en tienda"}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                Pago online seguro con tarjeta, Bizum o Apple/Google Pay (según lo que tengas activo).
              </p>
            </div>
          </div>
        </div>
      )}

      {payOpen && checkoutPayload && (
        <div className="fixed inset-0 z-[70] grid place-items-start overflow-y-auto bg-primary/80 p-4" role="dialog" aria-modal="true">
          <div className="mx-auto my-8 w-full max-w-3xl rounded-sm border border-foreground/15 bg-background p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">— Pago seguro</p>
                <h3 className="mt-1 font-display text-2xl text-primary">Completa tu pedido</h3>
              </div>
              <button
                onClick={() => { setPayOpen(false); setCheckoutPayload(null); }}
                className="rounded-sm p-2 text-foreground/60 hover:bg-muted"
                aria-label="Cerrar"
              >✕</button>
            </div>
            <StripeEmbeddedCheckout
              items={checkoutPayload.items}
              customer={checkoutPayload.customer}
              returnUrl={returnUrl}
            />
          </div>
        </div>
      )}
    </section>
  );
}


function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
