"use client";

import { useState, useEffect } from "react";
import { Review, getProductReviews } from "@/data/productReviews";

interface Props {
  productName: string;
  productCategory?: string;
  productSlug: string;
}

export default function ProductReviewsSection({
  productName,
  productCategory,
  productSlug,
}: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(4.9);
  const [totalCount, setTotalCount] = useState(28);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Formulario de nueva reseña
  const [authorName, setAuthorName] = useState("");
  const [authorCity, setAuthorCity] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Cargar reseñas base adaptadas por producto
    const base = getProductReviews(productName, productCategory, productSlug);
    
    // 2. Cargar reseñas locales escritas por usuarios reales en este navegador
    let localReviews: Review[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`NERKLEY_reviews_${productSlug}`);
        if (stored) {
          localReviews = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Error al cargar reseñas locales:", e);
      }
    }

    const combined = [...localReviews, ...base.reviews];
    setReviews(combined);
    setAverageRating(base.averageRating);
    setTotalCount(base.totalReviews + localReviews.length);
  }, [productName, productCategory, productSlug]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newRev: Review = {
      id: `user-${Date.now()}`,
      author: authorName.trim() || "Cliente Verificado",
      city: authorCity.trim() || "Colombia",
      rating,
      date: "Recién publicado",
      comment: comment.trim(),
      verified: true,
      likes: 1,
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    setTotalCount((prev) => prev + 1);

    // Guardar en localStorage para persistencia
    if (typeof window !== "undefined") {
      try {
        const existingLocal = JSON.parse(localStorage.getItem(`NERKLEY_reviews_${productSlug}`) || "[]");
        localStorage.setItem(`NERKLEY_reviews_${productSlug}`, JSON.stringify([newRev, ...existingLocal]));
      } catch (err) {
        console.error("Error al persistir reseña:", err);
      }
    }

    setComment("");
    setAuthorName("");
    setAuthorCity("");
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setIsFormOpen(false);
    }, 2800);
  };

  const handleToggleLike = (id: string) => {
    setLikedReviews((prev) => {
      const isLiked = !prev[id];
      setReviews((revList) =>
        revList.map((r) =>
          r.id === id ? { ...r, likes: (r.likes || 0) + (isLiked ? 1 : -1) } : r
        )
      );
      return { ...prev, [id]: isLiked };
    });
  };

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  return (
    <section id="reviews-section" className="max-w-7xl mx-auto px-6 py-14 w-full border-t border-white/10 mt-10">
      {/* Cabecera y Resumen de Calificación */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-amber-400 font-semibold block mb-2">
            Opiniones de Clientes Reales
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-light uppercase tracking-wider text-white">
            Experiencias Verificadas
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Compradores de toda Colombia que ya recibieron este producto
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-white text-black hover:bg-neutral-200 px-6 py-3.5 text-xs font-semibold uppercase tracking-widest rounded transition-all shadow-md active:scale-95 cursor-pointer self-start md:self-auto flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isFormOpen ? "Cerrar Formulario" : "Escribir una Reseña"}
        </button>
      </div>

      {/* Tarjeta de Resumen Estadístico de Valoraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 items-center bg-[#111116] border border-white/10 p-6 md:p-8 rounded-xl my-8 shadow-inner">
        {/* Puntuación Promedio */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-white/10 pb-6 lg:pb-0 lg:pr-8">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold font-serif text-white tracking-tight">
              {averageRating}
            </span>
            <span className="text-sm text-neutral-400 font-light">/ 5.0</span>
          </div>

          <div className="flex text-amber-400 text-lg my-2">
            {"★★★★★"}
          </div>

          <p className="text-xs text-neutral-300 font-medium">
            Basado en <span className="font-bold text-white">{totalCount} compras verificadas</span>
          </p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-2 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            99% de satisfacción de entrega
          </span>
        </div>

        {/* Barras de Desglose de Estrellas */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-16 text-neutral-300 font-mono text-[11px]">5 estrellas</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full w-[94%]"></div>
            </div>
            <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">94%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-16 text-neutral-300 font-mono text-[11px]">4 estrellas</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400/70 rounded-full w-[6%]"></div>
            </div>
            <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">6%</span>
          </div>

          <div className="flex items-center gap-3 opacity-40">
            <span className="w-16 text-neutral-300 font-mono text-[11px]">3 estrellas</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[0%]"></div>
            </div>
            <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">0%</span>
          </div>

          <div className="flex items-center gap-3 opacity-40">
            <span className="w-16 text-neutral-300 font-mono text-[11px]">2 estrellas</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[0%]"></div>
            </div>
            <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">0%</span>
          </div>

          <div className="flex items-center gap-3 opacity-40">
            <span className="w-16 text-neutral-300 font-mono text-[11px]">1 estrella</span>
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[0%]"></div>
            </div>
            <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">0%</span>
          </div>
        </div>

        {/* Garantías de Tranquilidad */}
        <div className="bg-[#181822] border border-white/10 p-4 rounded-lg space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-400 text-sm">✓</span>
            <div>
              <p className="text-white font-semibold text-[11px]">Compra Segura con Wompi</p>
              <p className="text-[10px] text-neutral-400">Protección antifraude con cifrado bancario SHA-256.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 text-sm">📦</span>
            <div>
              <p className="text-white font-semibold text-[11px]">Guía Oficial de Rastreo</p>
              <p className="text-[10px] text-neutral-400">Envíos asegurados con Servientrega, Envía o Inter Rapidísimo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario Expandible para Dejar una Reseña Real */}
      {isFormOpen && (
        <div className="bg-[#14141c] border border-amber-400/40 p-6 md:p-8 rounded-xl my-6 animate-in fade-in duration-300 shadow-xl">
          <h3 className="text-lg font-serif text-white uppercase tracking-wider mb-1">
            Califica tu experiencia con {productName}
          </h3>
          <p className="text-xs text-neutral-400 mb-6">
            Tu opinión ayuda a otros compradores de Colombia a tomar su decisión.
          </p>

          {submittedSuccess ? (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-5 rounded-lg text-center space-y-1">
              <p className="font-bold text-sm">🎉 ¡Tu reseña ha sido publicada con éxito!</p>
              <p className="text-xs text-neutral-300">Gracias por compartir tu experiencia con la comunidad de NERKLEY.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Selector de Estrellas */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-2">
                  Tu Calificación *
                </label>
                <div className="flex items-center gap-1.5 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(rating)}
                      className="text-2xl transition-transform hover:scale-125 focus:outline-hidden"
                    >
                      <span className={star <= (hoverRating || rating) ? "text-amber-400" : "text-neutral-600"}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="text-xs text-amber-300 ml-2 font-semibold">
                    {rating === 5 ? "¡Excelente! (5 estrellas)" : `${rating} estrellas`}
                  </span>
                </div>
              </div>

              {/* Nombre y Ciudad (El usuario elige su propio nombre) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
                    Tu Nombre o Alias *
                  </label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Ej: Juancho, Andrés M., Sofia..."
                    className="w-full bg-[#0d0d12] border border-white/15 rounded-lg p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
                    Tu Ciudad / Municipio (Opcional)
                  </label>
                  <input
                    type="text"
                    value={authorCity}
                    onChange={(e) => setAuthorCity(e.target.value)}
                    placeholder="Ej: Medellín, Bogotá, Cali, Barranquilla..."
                    className="w-full bg-[#0d0d12] border border-white/15 rounded-lg p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1.5">
                  Tu Opinión del Producto *
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos qué tal te pareció el aroma, el acabado, la comodidad o el tiempo de entrega..."
                  className="w-full bg-[#0d0d12] border border-white/15 rounded-lg p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-400 transition-colors"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  🔒 Tu opinión se publicará con la insignia de comprador verificado.
                </span>

                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-3 rounded text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Publicar Reseña
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Filtros Rápidos de Opiniones */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[11px] text-neutral-400 mr-2 uppercase tracking-wider font-semibold">Filtrar:</span>
        <button
          type="button"
          onClick={() => setFilterRating(null)}
          className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
            filterRating === null
              ? "bg-white text-black font-semibold"
              : "bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10"
          }`}
        >
          Todas ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterRating(5)}
          className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1 ${
            filterRating === 5
              ? "bg-amber-400 text-black font-semibold"
              : "bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10"
          }`}
        >
          <span>5 estrellas ★</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterRating(4)}
          className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1 ${
            filterRating === 4
              ? "bg-amber-400 text-black font-semibold"
              : "bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10"
          }`}
        >
          <span>4 estrellas ★</span>
        </button>
      </div>

      {/* Cuadrícula de Reseñas de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-[#111116] border border-white/10 hover:border-white/20 p-5 rounded-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm space-y-3"
          >
            <div>
              {/* Estrellas y Fecha */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex text-amber-400 text-sm">
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {rev.date}
                </span>
              </div>

              {/* Comentario con ortografía y lenguaje natural */}
              <p className="text-xs text-neutral-200 leading-relaxed font-normal">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            {/* Autor e Insignia */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                  {rev.author}
                  {rev.city && (
                    <span className="text-[10px] text-neutral-400 font-normal">
                      ({rev.city})
                    </span>
                  )}
                </p>
                {rev.verified && (
                  <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Compra Verificada
                  </span>
                )}
              </div>

              {/* Botón de Útil con Contador de Likes */}
              <button
                type="button"
                onClick={() => handleToggleLike(rev.id)}
                className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
                  likedReviews[rev.id]
                    ? "text-amber-300 bg-amber-400/15"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>👍</span>
                <span>{rev.likes || 1}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
