import { useMemo, useState } from "react";
import { products, type Category } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";

const categories: Array<Category | "Todo"> = ["Todo", "Repostería", "Café", "Bites"];

const WHATSAPP_NUMBER = "34600000000"; // placeholder — reemplázalo

function formatPrice(v: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

export function Catalog() {
  const [filter, setFilter] = useState<Category | "Todo">("Todo");
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();

  const list = useMemo(
    () => (filter === "Todo" ? products : products.filter((p) => p.category === filter)),
    [filter],
  );

  const whatsappHref = useMemo(() => {
    if (cart.items.length === 0) return `https://wa.me/${WHATSAPP_NUMBER}`;
    const lines = cart.items.map(
      (i) => `• ${i.qty} × ${i.product.name} — ${formatPrice(i.qty * i.product.price)}`,
    );
    const msg =
      `Hola 144 Reality, me gustaría hacer este pedido:%0A%0A` +
      lines.join("%0A") +
      `%0A%0ATotal: ${formatPrice(cart.total)}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  }, [cart.items, cart.total]);

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
              Elige lo que te apetezca, arma tu pedido y lo enviamos a WhatsApp para confirmar
              recogida o entrega. Sin trámites raros.
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
                    {p.name}
                  </h3>
                  <span className="shrink-0 font-display text-2xl text-secondary">
                    {formatPrice(p.price)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
                <button
                  onClick={() => {
                    cart.add(p);
                    setCartOpen(true);
                  }}
                  className="mt-auto inline-flex items-center justify-center rounded-sm border border-primary/30 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
                >
                  + Añadir al pedido
                </button>
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
                    <li key={i.product.id} className="flex gap-3 border-b border-foreground/10 pb-4">
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
                          <p className="font-serif text-sm font-semibold">{i.product.name}</p>
                          <button
                            onClick={() => cart.remove(i.product.id)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Quitar
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(i.product.price)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => cart.setQty(i.product.id, i.qty - 1)}
                            className="grid h-7 w-7 place-items-center rounded-sm border border-foreground/20 hover:border-primary"
                            aria-label="Restar"
                          >−</button>
                          <span className="w-6 text-center font-mono text-sm">{i.qty}</span>
                          <button
                            onClick={() => cart.setQty(i.product.id, i.qty + 1)}
                            className="grid h-7 w-7 place-items-center rounded-sm border border-foreground/20 hover:border-primary"
                            aria-label="Sumar"
                          >+</button>
                          <span className="ml-auto font-display text-lg text-primary">
                            {formatPrice(i.qty * i.product.price)}
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
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={`block w-full rounded-sm bg-secondary py-3 text-center text-sm font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 ${
                  cart.items.length === 0 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Enviar pedido por WhatsApp
              </a>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Te contestamos para confirmar recogida o entrega. Sin pago online.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
