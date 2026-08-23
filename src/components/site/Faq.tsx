import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export const faqs = [
  {
    q: "¿Con cuánta antelación debo hacer mi encargo?",
    a: "Recomendamos al menos 5 días de antelación para tartas personalizadas y 2 semanas para mesas dulces o eventos. Para fechas señaladas (San Valentín, Día de la Madre, Navidad) reserva con más tiempo.",
  },
  {
    q: "¿Cuál es el precio mínimo de un encargo personalizado?",
    a: "Las tartas personalizadas parten desde 35€ (6-8 raciones). Mesas dulces y catering se cotizan a medida según número de invitados y tipo de producto.",
  },
  {
    q: "¿Hacéis entregas a domicilio?",
    a: "Realizamos entregas en Bullas y municipios cercanos (consultar radio). También puedes recoger tu pedido en el local sin coste añadido.",
  },
  {
    q: "¿Cómo se realiza el pago y la reserva?",
    a: "Para confirmar el encargo pedimos un 30% de señal por Bizum o transferencia. El resto se abona en la recogida o entrega.",
  },
  {
    q: "¿Puedo cancelar o modificar mi pedido?",
    a: "Puedes modificarlo hasta 72h antes de la fecha de entrega. Cancelaciones con menos de 48h no permiten reembolso de la señal, ya que la producción ya está en marcha.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">FAQ</p>
          <h2 className="mt-2 font-display text-4xl md:text-5xl text-foreground">
            Preguntas frecuentes
          </h2>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-foreground">{item.q}</span>
                  {isOpen ? (
                    <Minus className="h-5 w-5 shrink-0 text-accent" />
                  ) : (
                    <Plus className="h-5 w-5 shrink-0 text-accent" />
                  )}
                </button>
                {isOpen && (
                  <p className="pb-5 pr-9 text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
