import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad y cookies — 144 Reality" },
      {
        name: "description",
        content:
          "Cómo tratamos tus datos personales y qué cookies usamos en 144 Reality Bites & Coffee.",
      },
      { property: "og:title", content: "Privacidad y cookies — 144 Reality" },
      {
        property: "og:description",
        content:
          "Información legal sobre datos personales y cookies en 144reality.com.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacidad" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Privacidad — 144 Reality" },
      { name: "twitter:description", content: "Política de privacidad y cookies." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "/privacidad" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-widest text-secondary">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">
          Política de privacidad y cookies
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          Última actualización: {new Date().toLocaleDateString("es-ES")}
        </p>

        <div className="prose prose-neutral mt-8 max-w-none text-foreground/90">
          <h2 className="font-serif text-2xl">Responsable del tratamiento</h2>
          <p>
            144 Reality Bites &amp; Coffee — Calle Francisco González Conde, 37,
            Bullas (Murcia). Contacto:{" "}
            <a href="mailto:hola@144reality.com" className="text-primary underline">
              hola@144reality.com
            </a>
            .
          </p>

          <h2 className="mt-8 font-serif text-2xl">Datos que tratamos</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Formulario de encargos y contacto:</strong> nombre,
              correo, teléfono y detalles del encargo. Base legal:
              consentimiento y ejecución del pedido. Conservados el tiempo
              necesario para atender la solicitud y cumplir obligaciones
              legales.
            </li>
            <li>
              <strong>Pedidos vía WhatsApp:</strong> datos que compartes al
              iniciar la conversación (nombre, teléfono, contenido). Se
              registran para gestionar el pedido.
            </li>
            <li>
              <strong>Analítica web (opcional):</strong> Google Analytics 4 con
              IP anonimizada, solo si aceptas las cookies analíticas.
            </li>
          </ul>

          <h2 className="mt-8 font-serif text-2xl">Cookies</h2>
          <p>
            Usamos dos categorías:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Necesarias</strong> — imprescindibles para el
              funcionamiento del sitio (sesión, preferencias de consentimiento).
              No requieren consentimiento.
            </li>
            <li>
              <strong>Analíticas</strong> — Google Analytics 4. Solo se cargan
              tras tu aceptación. Aplicamos Google Consent Mode v2, por lo que
              cualquier etiqueta respeta tu decisión antes de activarse.
            </li>
          </ul>
          <p>
            Puedes cambiar tu decisión en cualquier momento desde el enlace{" "}
            <strong>Cookies</strong> del pie de página.
          </p>

          <h2 className="mt-8 font-serif text-2xl">Tus derechos</h2>
          <p>
            Puedes ejercer los derechos de acceso, rectificación, supresión,
            oposición, limitación y portabilidad escribiendo a{" "}
            <a href="mailto:hola@144reality.com" className="text-primary underline">
              hola@144reality.com
            </a>
            . Tienes derecho a reclamar ante la Agencia Española de Protección
            de Datos (aepd.es).
          </p>

          <h2 className="mt-8 font-serif text-2xl">Encargados y terceros</h2>
          <p>
            Utilizamos Google Ireland Ltd. (Analytics), proveedores de
            infraestructura de hosting y correo transaccional. Todos actúan como
            encargados del tratamiento bajo contrato.
          </p>
        </div>
      </article>
      <Footer />
    </div>
  );
}
