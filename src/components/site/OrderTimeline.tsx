import type { TimelineEvent } from "@/lib/order-timeline";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const DOT: Record<TimelineEvent["kind"], string> = {
  info: "bg-secondary",
  success: "bg-primary",
  warning: "bg-orange-500",
  error: "bg-destructive",
};

export function OrderTimeline({
  events,
  title = "Historial del pedido",
  emptyLabel = "Sin actividad todavía.",
  className,
}: {
  events: TimelineEvent[];
  title?: string;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm border border-foreground/15 bg-muted/30 p-4 ${className ?? ""}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        — {title}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {events.map((e) => (
            <li key={e.key} className="flex gap-3">
              <span
                className={`mt-1.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${DOT[e.kind]}`}
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="font-serif text-sm font-semibold text-foreground">{e.label}</p>
                {e.detail && (
                  <p className="text-xs text-muted-foreground">{e.detail}</p>
                )}
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {formatWhen(e.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
