"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { hasFreeShipping, extractDisplayBadge } from "@/lib/shipping";
import { isProductCombo } from "@/lib/presentation";
import { parseCategory, getProductSubcategory } from "@/lib/categories";

interface Seller {
  id: string;
  store_name: string;
  slug: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  department?: string;
  category?: string;
  rating?: number;
  total_sales_count?: number;
  logo_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  video_url?: string | null;
  is_verified?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sale_price: number;
  original_price?: number;
  discount_percent?: number;
  category: string;
  images?: string;
  sizes?: string;
  colors?: string;
  stock: number;
  badge?: string;
  seller_id?: string;
  seller_name?: string;
  is_official?: boolean;
}

function extractSellerVideo(bio?: string | null): { cleanBio: string; videoUrl: string | null } {
  if (!bio) return { cleanBio: "", videoUrl: null };
  const match = bio.match(/\[video:\s*([^\]]+)\]/i);
  if (match) {
    const videoUrl = match[1].trim();
    const cleanBio = bio.replace(/\[video:\s*([^\]]+)\]/gi, "").trim();
    return { cleanBio, videoUrl };
  }
  return { cleanBio: bio, videoUrl: null };
}

function formatVideoEmbed(url?: string | null) {
  if (!url) return null;
  const clean = url.trim();
  const ytMatch = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch) {
    return { type: "youtube" as const, src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }
  const tiktokMatch = clean.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)\/video\/([0-9]+)/i);
  if (tiktokMatch) {
    return { type: "tiktok" as const, src: `https://www.tiktok.com/embed/v2/${tiktokMatch[2]}` };
  }
  if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.includes("video")) {
    return { type: "mp4" as const, src: clean };
  }
  return { type: "iframe" as const, src: clean };
}

export default function TiendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const rawSlug = resolvedParams.slug;
  const decodedSlug = decodeURIComponent(rawSlug).toLowerCase().trim();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros internos de la tienda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "discount">("featured");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const { addToCart, cartCount, setIsCartOpen, isCartBouncing } = useCart();

  useEffect(() => {
    async function loadBoutiqueData() {
      setLoading(true);

      try {
        // 1. Buscar en la tabla de sellers
        const { data: sellersData } = await supabase
          .from("sellers")
          .select("*");

        let matchedSeller: Seller | null = null;

        if (sellersData && sellersData.length > 0) {
          matchedSeller = sellersData.find((s: any) => {
            const sSlug = (s.slug || "").toLowerCase().trim();
            const sName = (s.store_name || "").toLowerCase().trim();
            const normName = sName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
            return sSlug === decodedSlug || sName === decodedSlug || normName === decodedSlug;
          }) || null;
        }

        // 2. Buscar productos de esta boutique
        let prodsQuery = supabase
          .from("products")
          .select("*")
          .eq("is_active", true);

        if (matchedSeller) {
          prodsQuery = prodsQuery.or(
            `seller_id.eq.${matchedSeller.id},seller_name.ilike.%${matchedSeller.store_name}%`
          );
        } else {
          // Fallback: si no está en sellers, buscar productos con ese seller_name
          prodsQuery = prodsQuery.ilike("seller_name", `%${decodedSlug}%`);
        }

        const { data: prodsData } = await prodsQuery.order("created_at", { ascending: false });

        if (prodsData && prodsData.length > 0) {
          setProducts(prodsData);

          // Si el vendedor no existía en sellers, creamos un perfil virtual
          if (!matchedSeller) {
            const firstProd = prodsData[0];
            const detectedName = firstProd.seller_name || decodedSlug;
            matchedSeller = {
              id: firstProd.seller_id || `virtual-${decodedSlug}`,
              store_name: detectedName,
              slug: decodedSlug,
              city: "Medellín",
              department: "Antioquia",
              category: "Boutique Exclusiva",
              rating: 5.0,
              total_sales_count: prodsData.length,
              is_verified: true,
              bio: `Bienvenido a la boutique oficial de ${detectedName} en NERKLEY. Catálogo 100% exclusivo, calidad garantizada y envíos seguros a toda Colombia.`,
            };
          }
        }

        if (matchedSeller) {
          setSeller(matchedSeller);
        }
      } catch (err) {
        console.warn("Error cargando boutique:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBoutiqueData();
  }, [decodedSlug]);

  const { cleanBio, videoUrl } = useMemo(() => {
    return extractSellerVideo(seller?.bio);
  }, [seller?.bio]);

  const activeVideo = seller?.video_url || videoUrl;
  const videoEmbed = useMemo(() => formatVideoEmbed(activeVideo), [activeVideo]);

  // Categorías de los productos de esta tienda
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const parsed = parseCategory(p.category);
      if (parsed.mainCategory) set.add(parsed.mainCategory);
    });
    return Array.from(set);
  }, [products]);

  // Filtrado y ordenamiento de productos
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== "Todas") {
          const parsed = parseCategory(p.category);
          if (parsed.mainCategory !== selectedCategory) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (p.name || "").toLowerCase().includes(q);
          const matchDesc = (p.description || "").toLowerCase().includes(q);
          const matchCat = (p.category || "").toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return Number(a.sale_price) - Number(b.sale_price);
        if (sortBy === "price-desc") return Number(b.sale_price) - Number(a.sale_price);
        if (sortBy === "discount") return Number(b.discount_percent || 0) - Number(a.discount_percent || 0);
        return 0; // featured
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    }
  };

  const handleWhatsAppContact = () => {
    const phone = seller?.phone ? seller.phone.replace(/[^0-9]/g, "") : "573009292323";
    const msg = encodeURIComponent(
      `Hola ${seller?.store_name || "Boutique"}, vi tu perfil oficial en NERKLEY y me gustaría consultar sobre tus productos.`
    );
    window.open(`https://wa.me/${phone.startsWith("57") ? phone : `57${phone}`}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
            Cargando Boutique Oficial...
          </p>
        </div>
      </div>
    );
  }

  if (!seller && products.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="text-4xl">🏛️</span>
        <h2 className="text-2xl font-serif font-bold text-white">Boutique No Encontrada</h2>
        <p className="text-xs text-neutral-400 max-w-md">
          No encontramos ninguna tienda registrada bajo el nombre <strong>"{rawSlug}"</strong>. Puede que el nombre haya cambiado o el enlace no sea correcto.
        </p>
        <Link
          href="/"
          className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
        >
          Volver a NERKLEY ➔
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-amber-400 selection:text-black">
      {/* BARRA SUPERIOR FIJA DE NAVEGACIÓN */}
      <header className="border-b border-white/10 bg-[#0d0d12]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <span>←</span>
              <span className="hidden sm:inline">Volver al Showroom</span>
            </Link>
            <span className="text-neutral-600 hidden sm:inline">|</span>
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif tracking-[0.3em] font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                NERKLEY
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5 cursor-pointer"
              title="Copiar enlace público de la tienda"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">{copiedUrl ? "¡Copiado!" : "Compartir Tienda"}</span>
            </button>

            {/* BOTÓN DEL CARRITO */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`bg-amber-400 hover:bg-amber-300 text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isCartBouncing ? "animate-bounce" : ""
              }`}
            >
              <span>🛍️</span>
              <span className="hidden sm:inline">Carrito</span>
              <span className="bg-black text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER & PERFIL DE LA BOUTIQUE */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-[#14141c] to-[#0a0a0c]">
        {/* BANNER DE PORTADA */}
        <div className="h-48 sm:h-64 lg:h-80 w-full relative bg-gradient-to-r from-neutral-950 via-amber-950/40 to-black overflow-hidden flex items-center justify-center">
          {seller?.banner_url ? (
            <img
              src={seller.banner_url}
              alt={seller.store_name}
              className="w-full h-full object-cover opacity-85"
            />
          ) : (
            <div className="text-center space-y-2 text-neutral-500">
              <span className="text-4xl opacity-30">🏛️</span>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 font-serif">
                Boutique Oficial en NERKLEY
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-black/30" />
        </div>

        {/* CONTENEDOR DE PERFIL FLOTANTE */}
        <div className="max-w-7xl mx-auto px-4 relative -mt-16 sm:-mt-20 pb-8">
          <div className="bg-[#111116] border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                {/* LOGO / FOTO DE PERFIL */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black border-2 border-amber-400 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center relative -mt-12 sm:-mt-14 ring-4 ring-black">
                  {seller?.logo_url ? (
                    <img
                      src={seller.logo_url}
                      alt={seller.store_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-serif font-black text-amber-300">
                      {seller?.store_name ? seller.store_name[0].toUpperCase() : "B"}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                      {seller?.store_name || "Boutique"}
                    </h1>
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      <span>✓</span> Boutique Verificada
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 font-light flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <span className="text-amber-400 font-semibold">{seller?.category || "Moda & Lujo"}</span>
                    <span>&bull;</span>
                    <span>📍 {seller?.city || "Medellín"}, {seller?.department || "Colombia"}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-medium">📦 Despachos a Todo el País</span>
                  </p>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN: WHATSAPP, VIDEO Y COMPARTIR */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 pt-2 sm:pt-0">
                {activeVideo && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <span>▶️</span>
                    <span>Ver Video de Presentación</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleWhatsAppContact}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>Contactar por WhatsApp</span>
                </button>
              </div>
            </div>

            {/* PRESENTACIÓN / BIOGRAFÍA */}
            {cleanBio && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed max-w-3xl">
                  {cleanBio}
                </p>
              </div>
            )}

            {/* MÉTODOS DE CONFIANZA Y GARANTÍA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-[11px]">
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-base text-amber-400">🛡️</span>
                <span>Pagos Seguros Wompi</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-base text-emerald-400">🚚</span>
                <span>Envíos Asegurados</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-base text-amber-300">⭐</span>
                <span>100% Original Verificado</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-base text-blue-400">🔄</span>
                <span>Garantía de Satisfacción</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL DE VIDEO PROMOCIONAL */}
      {showVideoModal && videoEmbed && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-amber-400/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎥</span>
                <h3 className="text-xs uppercase font-bold tracking-widest text-amber-300">
                  Video Oficial &bull; {seller?.store_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="text-neutral-400 hover:text-white text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {videoEmbed.type === "youtube" || videoEmbed.type === "tiktok" || videoEmbed.type === "iframe" ? (
                <iframe
                  src={videoEmbed.src}
                  title="Video Promocional"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={videoEmbed.src} controls autoPlay className="w-full h-full object-contain" />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cerrar Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATÁLOGO DE PRODUCTOS DE LA BOUTIQUE */}
      <main className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        {/* CABECERA DEL CATÁLOGO CON BUSCADOR Y FILTROS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🛍️</span> Catálogo de {seller?.store_name}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Explora los {filteredProducts.length} artículos disponibles para compra directa en esta boutique
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* BUSCADOR DENTRO DE LA TIENDA */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar en ${seller?.store_name || "tienda"}...`}
                className="w-full bg-[#111116] border border-white/15 px-3.5 py-2 text-xs text-white rounded-xl focus:outline-none focus:border-amber-400 placeholder-neutral-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-sm"
                >
                  &times;
                </button>
              )}
            </div>

            {/* ORDENAMIENTO */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#111116] border border-white/15 px-3 py-2 text-xs text-neutral-200 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="featured">✨ Destacados</option>
              <option value="price-asc">💵 Menor Precio</option>
              <option value="price-desc">💎 Mayor Precio</option>
              <option value="discount">🔥 Mayor Descuento</option>
            </select>
          </div>
        </div>

        {/* CHIPS DE CATEGORÍAS */}
        {availableCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("Todas")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === "Todas"
                  ? "bg-amber-400 text-black font-bold shadow-md"
                  : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              Todas ({products.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-amber-400 text-black font-bold shadow-md"
                    : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* GRID DE PRODUCTOS */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center border border-white/10 bg-white/5 rounded-2xl space-y-3">
            <span className="text-4xl">🛍️</span>
            <p className="text-sm font-semibold text-white">No se encontraron productos coincidentes</p>
            <p className="text-xs text-neutral-400">
              {searchQuery
                ? `No hay piezas que coincidan con "${searchQuery}" en la tienda de ${seller?.store_name}.`
                : `Esta boutique aún no tiene artículos publicados en esta categoría.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-amber-400 underline text-xs cursor-pointer font-semibold pt-2"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => {
              const mainImg = p.images?.split(",")[0]?.trim();
              const price = Number(p.sale_price) || 0;
              const isCombo = isProductCombo(p);
              const isFree = hasFreeShipping(p);
              const displayBadge = p.badge ? extractDisplayBadge(p.badge) : "";
              const sub = getProductSubcategory(p);

              return (
                <div
                  key={p.id}
                  className="group bg-[#111116] border border-white/10 hover:border-amber-400/40 p-3 sm:p-4 rounded-2xl transition-all duration-300 hover:shadow-2xl flex flex-col justify-between relative"
                >
                  <div>
                    {/* FOTO CON ENLACE AL DETALLE */}
                    <Link href={`/product/${p.slug}`} className="block relative aspect-square bg-[#16161f] rounded-xl overflow-hidden mb-3 border border-white/5 group-hover:border-white/20 transition-colors">
                      {mainImg ? (
                        <img
                          src={mainImg}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                          Sin foto
                        </div>
                      )}

                      {/* BADGES FLOTANTES */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
                        {isCombo && (
                          <span className="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded shadow">
                            🎁 COMBO
                          </span>
                        )}
                        {isFree && (
                          <span className="text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow">
                            🚚 Envío Gratis
                          </span>
                        )}
                        {p.discount_percent && p.discount_percent > 0 ? (
                          <span className="text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded shadow">
                            -{p.discount_percent}%
                          </span>
                        ) : null}
                      </div>

                      {displayBadge && (
                        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                          <span className="text-[7.5px] sm:text-[8px] uppercase tracking-wider font-semibold bg-black/80 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded shadow truncate max-w-[130px] block">
                            {displayBadge}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* CATEGORÍA Y TÍTULO */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block truncate">
                        {parseCategory(p.category).mainCategory} {sub ? `// ${sub}` : ""}
                      </span>

                      <Link href={`/product/${p.slug}`} className="block">
                        <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-2 hover:text-amber-300 transition-colors" title={p.name}>
                          {p.name}
                        </h3>
                      </Link>

                      {/* PRECIOS */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-sm sm:text-base font-bold font-mono text-white">
                          $ {price.toLocaleString("es-CO")} COP
                        </span>
                        {p.original_price && p.original_price > price && (
                          <span className="text-[10px] sm:text-xs font-mono text-neutral-500 line-through">
                            ${Number(p.original_price).toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>

                      {/* TALLAS DISPONIBLES */}
                      {p.sizes && (
                        <p className="text-[9.5px] text-neutral-400 truncate pt-0.5">
                          Tallas: {p.sizes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* BOTÓN DE COMPRA DIRECTA */}
                  <div className="pt-3 border-t border-white/10 mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart({
                          id: `${p.id}-default`,
                          product_id: p.id,
                          name: p.name,
                          price: p.sale_price,
                          image: mainImg || null,
                          quantity: 1,
                          maxStock: p.stock || 10,
                          free_shipping: isFree,
                          seller_id: p.seller_id || seller?.id,
                          seller_name: p.seller_name || seller?.store_name,
                        });
                        setIsCartOpen(true);
                      }}
                      className="w-full bg-amber-400 hover:bg-amber-300 text-black py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🛍️</span>
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PIE DE PÁGINA DE LA BOUTIQUE */}
      <footer className="border-t border-white/10 bg-[#0d0d12] py-12 px-4 mt-16 text-center text-xs text-neutral-400 space-y-3">
        <div className="max-w-md mx-auto space-y-1">
          <p className="text-white font-serif font-bold uppercase tracking-wider">
            Boutique Oficial {seller?.store_name} &bull; NERKLEY Luxury Store
          </p>
          <p className="text-[11px] text-neutral-500">
            Todos los pedidos realizados a esta boutique cuentan con garantía de retención Escrow y despacho nacional asegurado.
          </p>
        </div>
        <p className="text-[10px] text-neutral-600 pt-2 font-mono">
          &copy; {new Date().getFullYear()} NERKLEY Colombia. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
