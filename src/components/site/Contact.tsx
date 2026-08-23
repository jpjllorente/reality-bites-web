import logoAsset from "@/assets/logo-144reality.jpeg.asset.json";

export function Contact() {
  return (
    <section id="contacto" className="relative bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-secondary">
              — Visítanos
            </p>
            <h2 className="font-display text-5xl leading-none text-primary sm:text-7xl">
              Ven a <br /> <span className="text-secondary">visitarnos</span>
            </h2>
            <p className="mt-6 max-w-lg text-muted-foreground">
              Un espacio confortable y acogedor, con madera natural y buena luz.
              Ven, disfruta de nuestra repostería y quédate a un café.
            </p>

            <dl className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoBlock label="Dirección" className="sm:col-span-2">
                <span className="text-2xl font-semibold text-primary">
                  Calle Francisco González Conde, 37
                </span>
                <br />
                <span className="text-lg">30180 Bullas, Murcia</span>
              </InfoBlock>
              <InfoBlock label="Horario">
                Lun – Vie · 08:00 – 20:00
                <br />
                Sáb – Dom · 09:30 – 21:00
              </InfoBlock>
              <InfoBlock label="Contacto">
                +34 681 63 46 23
                <br />
                WhatsApp disponible
              </InfoBlock>
              <InfoBlock label="Sígue­nos">
                <a
                  href="https://instagram.com/144reality_bitesandcoffee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-secondary hover:underline"
                >
                  @144reality_bitesandcoffee
                </a>
                <br />
                Instagram
              </InfoBlock>
            </dl>
          </div>

          {/* Map + card */}
          <div className="relative">
            <div className="overflow-hidden rounded-sm border border-foreground/10 shadow-[var(--shadow-plate)]">
              <iframe
                title="Mapa 144 Reality"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-1.6725%2C38.0430%2C-1.6635%2C38.0490&layer=mapnik&marker=38.0460%2C-1.6680"
                className="h-[420px] w-full grayscale-[0.4]"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-8 left-6 right-6 rounded-sm border border-foreground/10 bg-primary p-6 text-primary-foreground shadow-[var(--shadow-plate)] sm:left-10 sm:right-10 rivet-frame">
              <div className="flex items-center gap-4">
                <img
                  src={logoAsset.url}
                  alt=""
                  className="h-14 w-14 rounded-full ring-2 ring-secondary"
                />
                <div>
                  <p className="font-display text-2xl leading-none tracking-widest">
                    144 REALITY
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-secondary">
                    Bites & Coffee · desde 2024
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-secondary pl-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 font-serif text-lg text-foreground">{children}</dd>
    </div>
  );
}
