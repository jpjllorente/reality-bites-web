// Server-only helper: takes an original product photo and returns an
// "enhanced" version composed with the 144 Reality logo using OpenAI's
// image edits API (gpt-image-1). On any failure it returns null so the
// caller keeps the original upload.

const LOGO_STORAGE_PATH = "branding/logo.png";

const PROMPT = `Eres el director creativo y fotógrafo gastronómico oficial de la marca 144 Reality Bites & Coffee.
Tu única función es transformar fotografías reales de productos en fotografías publicitarias premium manteniendo absoluta fidelidad al producto.
La prioridad absoluta es conservar exactamente el producto original.
Nunca debes modificar el alimento.
Nunca debes reinterpretarlo.
Nunca debes embellecerlo cambiando sus características.

==================================================
PROHIBIDO
Está absolutamente prohibido:
• cambiar la receta
• cambiar la forma
• cambiar el tamaño
• cambiar el volumen
• cambiar el color real
• añadir ingredientes
• eliminar ingredientes
• añadir chocolate
• añadir frutas
• añadir azúcar
• añadir cacao
• añadir hojas
• añadir toppings
• añadir decoración
• modificar glaseados
• crear nuevas texturas
• inventar elementos
Si para mejorar la fotografía necesitas modificar el producto, NO lo hagas.

==================================================
ÚNICAMENTE PUEDES MEJORAR
• iluminación
• exposición
• balance de blancos
• nitidez
• enfoque
• contraste
• profundidad de campo
• reducción de ruido
• pequeñas imperfecciones naturales

==================================================
ESCENARIO CORPORATIVO OBLIGATORIO
ESTA PARTE ES OBLIGATORIA.
NO ES UNA SUGERENCIA.
TODAS LAS IMÁGENES DEBEN GENERARSE SIEMPRE EN ESTE MISMO ESCENARIO.
NO EXISTEN EXCEPCIONES.
El producto debe estar apoyado sobre una mesa de madera natural.
Detrás del producto debe existir SIEMPRE una pared de ladrillo pintada en verde militar.
Está absolutamente prohibido utilizar:
• fondos blancos
• fondos grises
• fondos lisos
• fondos de estudio
• fondos transparentes
• escenarios diferentes
• paredes de otro color
El escenario corporativo nunca debe cambiar.

==================================================
LOGOTIPO
El logotipo (segunda imagen adjunta) debe aparecer integrado en la pared de ladrillo verde militar.
Debe parecer pintado directamente sobre el ladrillo, siguiendo las irregularidades y textura de la pared.
Debe ser completamente BLANCO.
Nunca negro.
Nunca gris.
Nunca de otro color.
No modificar su diseño.
No modificar sus proporciones.
No moverlo a otra ubicación distinta de la pared.

==================================================
COMPOSICIÓN
Mantener el mismo ángulo de cámara siempre que sea posible.
Mantener la composición original.
Mantener la perspectiva.
Mantener el tamaño del producto.

==================================================
ESTILO
Fotografía gastronómica premium.
Realista.
Artesanal.
Muy apetecible.
Alta gama.
Lista para publicidad.
Lista para Instagram.
Lista para Facebook.
Debe parecer realizada con una cámara Full Frame profesional y un objetivo macro luminoso.

==================================================
CRITERIOS DE VALIDACIÓN
La imagen generada será INCORRECTA si ocurre cualquiera de las siguientes situaciones:
- aparece un fondo blanco
- aparece un fondo gris
- desaparece la mesa de madera
- desaparece la pared verde militar
- el logotipo aparece negro
- el logotipo aparece gris
- el logotipo no parece pintado en la pared
- el producto cambia de forma
- el producto cambia de tamaño
- el producto cambia de color
- aparecen ingredientes nuevos
- desaparecen ingredientes`;

async function fetchLogoBytes(): Promise<{
  bytes: Uint8Array;
  contentType: string;
} | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage
      .from("media")
      .download(LOGO_STORAGE_PATH);
    if (error || !data) {
      console.warn("[image-enhance] logo no disponible", error?.message);
      return null;
    }
    const buf = new Uint8Array(await data.arrayBuffer());
    return { bytes: buf, contentType: data.type || "image/png" };
  } catch (e) {
    console.warn("[image-enhance] logo fetch fallo", e);
    return null;
  }
}

export async function enhanceProductImage(
  originalBytes: Uint8Array,
  originalContentType: string,
): Promise<Uint8Array | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[image-enhance] OPENAI_API_KEY no configurada");
    return null;
  }

  const logo = await fetchLogoBytes();

  try {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", PROMPT);
    form.append("size", "1024x1024");
    form.append("n", "1");
    form.append(
      "image[]",
      new Blob([originalBytes as BlobPart], { type: originalContentType || "image/png" }),
      "product.png",
    );
    if (logo) {
      form.append(
        "image[]",
        new Blob([logo.bytes as BlobPart], { type: logo.contentType }),
        "logo.png",
      );
    }

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[image-enhance] OpenAI ${res.status}: ${body.slice(0, 400)}`);
      return null;
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      console.warn("[image-enhance] respuesta sin b64_json");
      return null;
    }
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch (e) {
    console.warn("[image-enhance] excepción", e);
    return null;
  }
}
