// Server-only helper: takes an original product photo, redimensiona/comprime
// para reducir coste y latencia, la envía a OpenAI (gpt-image-1, quality
// "medium") junto con el logo de marca, y devuelve el resultado ya
// re-encodeado a WebP listo para servir en la web. Si algo falla devuelve
// null y el llamador conserva la imagen original.

import { decode as decodeJpeg, encode as encodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng } from "@jsquash/png";
import { decode as decodeWebp, encode as encodeWebp } from "@jsquash/webp";
import resize from "@jsquash/resize";

const LOGO_STORAGE_PATH = "branding/logo.png";
const MAX_EDGE = 1024;

// Prompt reducido: mismas reglas, sin repeticiones. Preserva escenario,
// logo blanco pintado en pared y fidelidad al producto.
const PROMPT = `Director creativo y fotógrafo gastronómico de "144 Reality Bites & Coffee". Transforma la foto real del producto en imagen publicitaria premium sin alterar el alimento.

PRODUCTO — Prohibido cambiar receta, forma, tamaño, volumen, color real, ingredientes, glaseados o texturas; no añadir ni quitar toppings, frutas, chocolate, cacao, azúcar, hojas ni decoración. Si mejorar la foto exige modificar el producto, no lo hagas.

MEJORAS PERMITIDAS — solo iluminación, exposición, balance de blancos, nitidez, enfoque, contraste, profundidad de campo, reducción de ruido y pequeñas imperfecciones naturales.

ESCENARIO OBLIGATORIO (sin excepciones) — producto sobre mesa de madera natural, con pared de ladrillo pintada en verde militar detrás. Prohibidos fondos blancos, grises, lisos, de estudio, transparentes o cualquier otro escenario/color de pared.

LOGOTIPO (segunda imagen adjunta) — integrado en la pared de ladrillo verde militar, aparentando estar pintado sobre el ladrillo siguiendo su textura. Color BLANCO puro, nunca negro, gris ni otro color. Mantén su diseño y proporciones, siempre en la pared.

COMPOSICIÓN — conserva ángulo, composición, perspectiva y tamaño del producto originales.

ESTILO — fotografía gastronómica premium, realista, artesanal, muy apetecible, alta gama, apta para publicidad e Instagram/Facebook; aspecto de cámara Full Frame con objetivo macro luminoso.

INVÁLIDA si aparece fondo blanco/gris, desaparece la mesa o la pared verde militar, el logo no es blanco o no parece pintado en la pared, o el producto cambia de forma/tamaño/color/ingredientes.`;

async function decodeToImageData(bytes: Uint8Array, contentType: string) {
  const ct = contentType.toLowerCase();
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  if (ct.includes("png")) return decodePng(buf);
  if (ct.includes("webp")) return decodeWebp(buf);
  // Trata todo lo demás (jpeg, jpg, heic exportado como jpeg, octet-stream) como JPEG.
  return decodeJpeg(buf);
}

async function shrinkForOpenAI(
  bytes: Uint8Array,
  contentType: string,
): Promise<{ bytes: Uint8Array; contentType: string; filename: string }> {
  try {
    const img = await decodeToImageData(bytes, contentType);
    const { width, height } = img;
    const maxSide = Math.max(width, height);
    let out = img;
    if (maxSide > MAX_EDGE) {
      const scale = MAX_EDGE / maxSide;
      out = await resize(img, {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        method: "lanczos3",
      });
    }
    // Recodifica a JPEG q82 sin metadatos EXIF (jsquash no los preserva).
    const encoded = await encodeJpeg(out, { quality: 82 });
    return {
      bytes: new Uint8Array(encoded),
      contentType: "image/jpeg",
      filename: "product.jpg",
    };
  } catch (e) {
    console.warn("[image-enhance] shrink falló, envío original", e);
    return { bytes, contentType: contentType || "image/jpeg", filename: "product" };
  }
}

async function toWebp(pngBytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const img = await decodePng(
      pngBytes.buffer.slice(
        pngBytes.byteOffset,
        pngBytes.byteOffset + pngBytes.byteLength,
      ) as ArrayBuffer,
    );
    const encoded = await encodeWebp(img, { quality: 80 });
    return new Uint8Array(encoded);
  } catch (e) {
    console.warn("[image-enhance] webp encode falló", e);
    return null;
  }
}

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

export type EnhancedImage = { bytes: Uint8Array; contentType: string; extension: string };

export async function enhanceProductImage(
  originalBytes: Uint8Array,
  originalContentType: string,
): Promise<EnhancedImage | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[image-enhance] OPENAI_API_KEY no configurada");
    return null;
  }

  const [shrunk, logo] = await Promise.all([
    shrinkForOpenAI(originalBytes, originalContentType),
    fetchLogoBytes(),
  ]);

  try {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", PROMPT);
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("n", "1");
    form.append(
      "image[]",
      new Blob([shrunk.bytes as BlobPart], { type: shrunk.contentType }),
      shrunk.filename,
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
    const pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const webp = await toWebp(pngBytes);
    if (webp) {
      return { bytes: webp, contentType: "image/webp", extension: "webp" };
    }
    // Fallback: si el reencoder WebP falló, servimos el PNG original de OpenAI.
    return { bytes: pngBytes, contentType: "image/png", extension: "png" };
  } catch (e) {
    console.warn("[image-enhance] excepción", e);
    return null;
  }
}
