import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitCustomOrder } from "@/lib/custom-orders.functions";


const ORDER_TYPES = [
  "Tarta a medida",
  "Tarta de boda",
  "Cupcakes / mini bites",
  "Mesa dulce / catering",
  "Pedido corporativo",
  "Otro",
];

const BUDGETS = [
  "Menos de 50 €",
  "50 – 100 €",
  "100 – 200 €",
  "200 – 400 €",
  "Más de 400 €",
  "A definir",
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  orderType: "Tarta a medida",
  eventDate: "",
  servings: "",
  flavors: "",
  budgetRange: "A definir",
  message: "",
};

export function CustomOrders() {
  const submit = useServerFn(submitCustomOrder);
  const [form, setForm] = useState(emptyForm);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [otherAllergen, setOtherAllergen] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleAllergen = (a: string) =>
    setAllergens((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const allergensList = [
        ...allergens,
        ...(otherAllergen.trim() ? [otherAllergen.trim()] : []),
      ].join(", ");
      await submit({
        data: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          orderType: form.orderType,
          eventDate: form.eventDate,
          servings: form.servings ? Number(form.servings) : null,
          flavors: form.flavors,
          allergens: allergensList,
          budgetRange: form.budgetRange,
          message: form.message,
        },
      });
      toast.success("¡Solicitud enviada! Te contactamos en menos de 24h.");
      setForm(emptyForm);
      setAllergens([]);
      setOtherAllergen("");
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="encargos" className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
            — Encargos a medida
          </p>
          <h2 className="font-display text-5xl leading-none sm:text-7xl">
            Tu ocasión, <br />
            <span className="text-secondary">nuestra receta.</span>
          </h2>
          <p className="mt-6 max-w-md text-primary-foreground/80">
            Tartas de cumpleaños, bodas, celebraciones de empresa o eventos privados.
            Diseñamos la pieza contigo desde el concepto hasta el último detalle comestible.
          </p>



          <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6 text-sm">
            {[
              { k: "72h", v: "Antelación mínima" },
              { k: "10+", v: "Personas mínimo" },
              { k: "100%", v: "Elaboración propia" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="font-display text-3xl text-secondary">{s.k}</dt>
                <dd className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/60">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {done ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center rounded-sm border border-primary-foreground/15 bg-background p-8 text-center text-foreground shadow-[var(--shadow-plate)] sm:p-12"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="mt-6 font-display text-3xl text-primary">¡Solicitud enviada!</h3>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Gracias por confiar en nosotros. Hemos recibido tu solicitud y te
              contactaremos en menos de 24h. Revisa tu email (también la carpeta
              de spam) para la confirmación.
            </p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-8 rounded-sm border border-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Enviar otra solicitud
            </button>
          </div>
        ) : (
        <form
          onSubmit={onSubmit}
          className="rounded-sm border border-primary-foreground/15 bg-background p-6 text-foreground shadow-[var(--shadow-plate)] sm:p-8"
        >
          <h3 className="font-display text-3xl text-primary">Cuéntanos tu idea</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Rellena estos campos y te respondemos en menos de 24h.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Cómo te llamas"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                maxLength={40}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="+34 …"
              />
            </Field>
            <Field label="Tipo de encargo">
              <select
                value={form.orderType}
                onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                className="input"
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha del evento">
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Nº de personas">
              <input
                type="number"
                min={1}
                max={1000}
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: e.target.value })}
                className="input"
                placeholder="10"
              />
            </Field>
            <Field label="Presupuesto orientativo" className="sm:col-span-2">
              <select
                value={form.budgetRange}
                onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                className="input"
              >
                {BUDGETS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Sabores preferidos" className="sm:col-span-2">
              <input
                maxLength={500}
                value={form.flavors}
                onChange={(e) => setForm({ ...form, flavors: e.target.value })}
                className="input"
                placeholder="Chocolate, frutos rojos, pistacho…"
              />
            </Field>


            <Field label="Detalles adicionales" className="sm:col-span-2">
              <textarea
                rows={4}
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="input resize-none"
                placeholder="Estilo, colores, referencias, mensaje sobre la tarta…"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-sm bg-secondary py-3 text-sm font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar solicitud"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Al enviar aceptas que te contactemos por email o teléfono.
          </p>
        </form>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 2px;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color .15s;
        }
        .input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px oklch(0.36 0.045 140 / 0.15);
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
