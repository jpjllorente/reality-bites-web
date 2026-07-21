import { useState } from "react";
import customCake from "@/assets/custom-cake.jpg";

const WHATSAPP_NUMBER = "34681634623";
const EMAIL = "hola@144reality.com";

export function CustomOrders() {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    date: "",
    people: "",
    type: "Tarta a medida",
    details: "",
  });

  const message =
    `Hola 144 Reality, me gustaría un encargo a medida:%0A%0A` +
    `Nombre: ${form.name}%0A` +
    `Contacto: ${form.contact}%0A` +
    `Fecha: ${form.date}%0A` +
    `Personas: ${form.people}%0A` +
    `Tipo: ${form.type}%0A` +
    `Detalles: ${form.details}`;

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  const mailHref = `mailto:${EMAIL}?subject=Encargo%20a%20medida%20-%20${encodeURIComponent(
    form.name || "144 Reality",
  )}&body=${message.replace(/%0A/g, "%0D%0A")}`;

  return (
    <section id="encargos" className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16 lg:px-10">
        {/* Left: image + copy */}
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

          <div className="mt-8 overflow-hidden rounded-sm border border-primary-foreground/15 rivet-frame">
            <img
              src={customCake}
              alt="Tarta a medida de tres pisos"
              className="h-full w-full object-cover"
              width={1200}
              height={1400}
              loading="lazy"
            />
          </div>

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

        {/* Right: form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.open(waHref, "_blank");
          }}
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Cómo te llamas"
              />
            </Field>
            <Field label="Teléfono / email">
              <input
                required
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="input"
                placeholder="Cómo te contactamos"
              />
            </Field>
            <Field label="Fecha del evento">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Nº de personas">
              <input
                type="number"
                min={1}
                value={form.people}
                onChange={(e) => setForm({ ...form, people: e.target.value })}
                className="input"
                placeholder="10"
              />
            </Field>
            <Field label="Tipo de encargo" className="sm:col-span-2">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
              >
                <option>Tarta a medida</option>
                <option>Mesa dulce / catering</option>
                <option>Pedido corporativo</option>
                <option>Otro</option>
              </select>
            </Field>
            <Field label="Detalles" className="sm:col-span-2">
              <textarea
                rows={4}
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                className="input resize-none"
                placeholder="Sabores preferidos, alergias, estilo…"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-sm bg-secondary py-3 text-sm font-bold uppercase tracking-widest text-secondary-foreground transition hover:bg-secondary/90"
            >
              Enviar por WhatsApp
            </button>
            <a
              href={mailHref}
              className="flex-1 rounded-sm border border-primary py-3 text-center text-sm font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Enviar por email
            </a>
          </div>
        </form>
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
