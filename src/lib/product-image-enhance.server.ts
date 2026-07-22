// Server-only helper: takes an original product photo and returns an
// "enhanced" version composed with the 144 Reality logo using OpenAI's
// image edits API (gpt-image-1). On any failure it returns null so the
// caller keeps the original upload.

const LOGO_STORAGE_PATH = "branding/logo.png";

const PROMPT = [
  "Mejora esta fotografía de producto de repostería para una tienda online de estilo industrial moderno.",
  "Fondo neutro y limpio, iluminación suave y profesional, colores naturales y apetitosos, encuadre cuadrado centrado en el producto.",
  "Compón discretamente el logotipo de la marca (segunda imagen) en una esquina como marca de agua sutil, sin tapar el producto, respetando la tipografía y la mariposa originales.",
  "No añadas texto adicional. Resultado fotorrealista, alta calidad.",
].join(" ");

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
