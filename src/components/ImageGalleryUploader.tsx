"use client";

import { useState, useRef } from "react";

interface ImageGalleryUploaderProps {
  value: string; // URLs separadas por comas
  onChange: (newValue: string) => void;
  label?: string;
  helperText?: string;
}

/**
 * Comprime y optimiza imágenes tomadas con cámara o galería móvil antes de subirlas
 * Reduce fotos de 15MB a ~200KB en milisegundos sin pérdida perceptible de calidad
 */
async function compressImageFile(file: File, maxDim = 1280, quality = 0.85): Promise<File> {
  // Archivos no comprimibles o ya pequeños
  if (file.type === "image/gif" || file.type === "image/svg+xml" || file.size < 350 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const cleanName = file.name.replace(/\.[^.]+$/, "") + ".webp";
              const optimized = new File([blob], cleanName, { type: "image/webp" });
              resolve(optimized);
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function ImageGalleryUploader({
  value,
  onChange,
  label = "Fotos del Producto",
  helperText = "Toca para abrir la galería o cámara de tu celular",
}: ImageGalleryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de URLs limpia
  const imageList = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const updateImageList = (newList: string[]) => {
    onChange(newList.join(", "));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUploadedUrls: string[] = [];
    const total = files.length;

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        setUploadProgress(`Procesando foto ${i + 1} de ${total}...`);

        // 1. Optimizar imagen
        const optimizedFile = await compressImageFile(file);

        // 2. Subir mediante la API protegida a Supabase Storage
        const formData = new FormData();
        formData.append("file", optimizedFile);

        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status} al subir imagen`);
        }

        const data = await res.json();
        if (data.url) {
          newUploadedUrls.push(data.url);
        }
      }

      // Concatenar a la lista existente
      const updated = [...imageList, ...newUploadedUrls];
      updateImageList(updated);
    } catch (err: any) {
      console.error("Error subiendo foto:", err);
      alert(`Hubo un problema al subir la foto: ${err?.message || "Error desconocido"}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = imageList.filter((_, i) => i !== index);
    updateImageList(updated);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= imageList.length) return;

    const copy = [...imageList];
    const temp = copy[index];
    copy[index] = copy[newIndex];
    copy[newIndex] = temp;
    updateImageList(copy);
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const copy = [...imageList];
    const [selected] = copy.splice(index, 1);
    copy.unshift(selected);
    updateImageList(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
            {label} ({imageList.length})
          </label>
          <span className="text-[10px] text-neutral-400 font-light block">
            {helperText}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[9.5px] text-amber-400 hover:text-amber-300 uppercase tracking-wider underline cursor-pointer"
        >
          {showManualInput ? "Ocultar URLs de texto" : "Escribir URLs manualmente"}
        </button>
      </div>

      {/* INPUT FILE OCULTO NATIVO PARA CELULAR Y PC */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* BOTÓN GRANDE TÁCTIL PARA ABRIR GALERÍA DIRECTA */}
      <div
        onClick={() => {
          if (!uploading && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={`w-full p-4 sm:p-6 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
          uploading
            ? "bg-amber-500/10 border-amber-400/50 cursor-wait animate-pulse"
            : "bg-[#111116] border-white/15 hover:border-amber-400 hover:bg-white/[0.03]"
        }`}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl mb-2 group-hover:scale-110 group-hover:border-amber-400/50 transition-all">
          {uploading ? "⏳" : "📸"}
        </div>

        {uploading ? (
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider block">
              Subiendo a la nube de NERKLEY...
            </span>
            <span className="text-[11px] text-neutral-400 block font-mono">
              {uploadProgress || "Optimizando y guardando fotos..."}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider block group-hover:text-amber-300 transition-colors">
              Toca aquí para seleccionar de tu galería
            </span>
            <span className="text-[10px] sm:text-[11px] text-neutral-400 block">
              Puedes elegir 1 o varias fotos a la vez (JPG, PNG, WEBP)
            </span>
          </div>
        )}
      </div>

      {/* GALERÍA DE MINIATURAS CON ORDENACIÓN Y CONTROL TÁCTIL */}
      {imageList.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[9.5px] uppercase tracking-widest text-neutral-400 font-semibold block">
            Fotos seleccionadas (la primera es la portada que verá el cliente):
          </span>

          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {imageList.map((imgUrl, index) => {
              const isCover = index === 0;

              return (
                <div
                  key={`${imgUrl}-${index}`}
                  className={`group relative bg-[#0a0a0c] border rounded-lg overflow-hidden flex flex-col justify-between transition-all ${
                    isCover
                      ? "border-amber-400 shadow-[0_0_15px_rgba(232,198,98,0.25)] ring-1 ring-amber-400/60"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  {/* Etiqueta de Portada */}
                  {isCover && (
                    <div className="absolute top-1 left-1 z-10 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                      ⭐ Portada
                    </div>
                  )}

                  {/* Imagen */}
                  <div className="aspect-square bg-black/60 flex items-center justify-center p-1.5 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Barra de Acciones */}
                  <div className="bg-[#14141c] p-1.5 flex items-center justify-between border-t border-white/10 text-xs">
                    <div className="flex items-center gap-1">
                      {/* Botón Mover a la izquierda / Portada */}
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, "left")}
                          title="Mover foto a la izquierda"
                          className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ◀
                        </button>
                      )}

                      {/* Botón Mover a la derecha */}
                      {index < imageList.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, "right")}
                          title="Mover foto a la derecha"
                          className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-neutral-300 flex items-center justify-center text-[10px] cursor-pointer"
                        >
                          ▶
                        </button>
                      )}

                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(index)}
                          title="Poner como foto principal"
                          className="text-[8px] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold px-1 py-0.5 cursor-pointer"
                        >
                          Hacer portada
                        </button>
                      )}
                    </div>

                    {/* Botón Eliminar Foto */}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      title="Eliminar esta foto"
                      className="w-6 h-6 rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center text-xs cursor-pointer transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CAMPO MANUAL DE TEXTO (OPCIONAL O DE RESPALDO) */}
      {showManualInput && (
        <div className="space-y-1.5 pt-2 border-t border-white/10 animate-fadeIn">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
            URLs de Fotos en texto plano (separadas por comas)
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://...foto1.jpg, https://...foto2.jpg"
            className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
          />
        </div>
      )}
    </div>
  );
}
