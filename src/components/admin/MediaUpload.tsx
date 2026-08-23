import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadMedia } from "@/lib/catalog.functions";
import { toast } from "sonner";

export function MediaUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const upload = useServerFn(uploadMedia);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [enhance, setEnhance] = useState(true);

  async function onFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máx 10 MB");
      return;
    }
    setBusy(true);
    const toastId = toast.loading(
      enhance ? "Mejorando imagen con IA… esto puede tardar hasta 1 min" : "Subiendo imagen…",
    );
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const res = await upload({
        data: {
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64: b64,
          enhance,
        },
      });
      onChange(res.url);
      toast.success(
        res.enhanced ? "Imagen mejorada y subida" : "Imagen original subida (sin IA)",
        { id: toastId },
      );
    } catch (e) {
      console.error(e);
      toast.error("Error al subir", { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20">
          {value ? (
            <img
              src={value}
              alt=""
              className="h-20 w-20 rounded-sm border border-foreground/15 object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-sm border border-dashed border-foreground/25 text-[10px] uppercase tracking-widest text-muted-foreground">
              Sin imagen
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center rounded-sm bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[9px] uppercase tracking-widest text-primary">
                  {enhance ? "IA" : "…"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-sm border border-primary px-3 py-1.5 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {busy ? (enhance ? "Mejorando…" : "Subiendo…") : "Subir imagen"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-sm border border-foreground/20 px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <input
          type="checkbox"
          checked={!enhance}
          disabled={busy}
          onChange={(e) => setEnhance(!e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        Subir imagen original (sin mejora IA)
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…o pega una URL"
        className="w-full rounded-sm border border-foreground/20 bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
      />
    </div>
  );
}
