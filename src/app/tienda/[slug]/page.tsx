"use client";

import { useEffect, useState, use, useMemo, Suspense } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { getSellerBySlug, getSellerProducts, getSellerStories, Seller, SellerStory } from "@/lib/marketplace";
import AIChatSupport from "@/components/AIChatSupport";

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
  is_active?: boolean;
}

function BoutiqueProfileContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const rawSlug = resolvedParams?.slug || "";

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<SellerStory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros internos del catálogo
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  // Estado del Visor de Historias (Stories Viewer estilo Instagram/Facebook)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Toast de notificación
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { addToCart, setIsCartOpen } = useCart();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function loadBoutiqueData() {
      setLoading(true);
      const sellerData = await getSellerBySlug(rawSlug);
      if (sellerData) {
        setSeller(sellerData);
        const [prods, str] = await Promise.all([
          getSellerProducts(sellerData.id, sellerData.store_name),
          getSellerStories(sellerData.id),
        ]);
        setProducts(prods);

        // Si la boutique aún no tiene historias personalizadas, generamos historias predeterminadas de bienvenida
        if (!str || str.length === 0) {
          const sampleStories: SellerStory[] = [
            {
              id: "story_default_1",
              seller_id: sellerData.id,
              image_url: sellerData.banner_url || "https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=1200",
              caption: `✨ ¡Bienvenidos a la boutique oficial de ${sellerData.store_name} en NERKLEY! Envíos 100% asegurados a toda Colombia.`,
              created_at: new Date().toISOString(),
              product_name: prods[0]?.name,
              product_price: prods[0]?.sale_price,
              product_slug: prods[0]?.slug,
            },
            ...(prods.slice(0, 3).map((p, idx) => ({
              id: `story_prod_${idx}`,
              seller_id: sellerData.id,
              image_url: p.images?.split(",")[0]?.trim() || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200",
              caption: `🔥 ${p.name} - Disponible ahora para entrega inmediata con garantía directa.`,
              created_at: new Date().toISOString(),
              product_name: p.name,
              product_price: p.sale_price,
              product_slug: p.slug,
            }))),
          ];
          setStories(sampleStories);
        } else {
          setStories(str);
        }
      }
      setLoading(false);
    }

    loadBoutiqueData();
  }, [rawSlug]);

  // Controlador de tiempo del Visor de Historias (Stories)
  useEffect(() => {
    if (activeStoryIndex === null || isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Avanzar a la siguiente historia
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
            // Cerrar historias al terminar
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2.5; // ~4 segundos por historia
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, isStoryPaused, stories.length]);

  const openStory = (index: number) => {
    setActiveStoryIndex(index);
    setStoryProgress(0);
    setIsStoryPaused(false);
  };

  const closeStory = () => {
    setActiveStoryIndex(null);
    setStoryProgress(0);
  };

  const handleNextStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null) {
      if (activeStoryIndex < stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1);
        setStoryProgress(0);
      } else {
        closeStory();
      }
    }
  };

  const handlePrevStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStoryIndex !== null) {
      if (activeStoryIndex > 0) {
        setActiveStoryIndex(activeStoryIndex - 1);
        setStoryProgress(0);
      } else {
        setStoryProgress(0);
      }
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["Todas", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "Todas" && p.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });
  }, [products, categoryFilter, searchFilter]);

  const handleBuyNow = (product: Product) => {
    addToCart({
      id: `${product.id}-default`,
      product_id: product.id,
      name: product.name,
      price: product.sale_price,
      image: product.images?.split(",")[0]?.trim() || "",
      quantity: 1,
      maxStock: product.stock || 10,
      seller_id: seller?.id,
      seller_name: seller?.store_name,
    });
    setIsCartOpen(true);
  };

  const handleAddDirect = (product: Product) => {
    addToCart({
      id: `${product.id}-default`,
      product_id: product.id,
      name: product.name,
      price: product.sale_price,
      image: product.images?.split(",")[0]?.trim() || "",
      quantity: 1,
      maxStock: product.stock || 10,
      seller_id: seller?.id,
      seller_name: seller?.store_name,
    });
    showToast(`¡${product.name} añadido al carrito!`);
  };

  const handleShareProfile = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("¡Enlace del perfil copiado al portapapeles!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest text-neutral-400">Cargando Perfil de Boutique...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="text-4xl">🏪</span>
        <h1 className="text-2xl font-serif font-bold text-white uppercase tracking-wider">Boutique no encontrada</h1>
        <p className="text-xs text-neutral-400 max-w-md">
          No pudimos localizar la tienda o creador con el identificador &ldquo;{rawSlug}&rdquo;. Verifica el enlace o explora el catálogo oficial de NERKLEY.
        </p>
        <Link
          href="/"
          className="bg-white text-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
        >
          &larr; Volver a la Tienda Principal
        </Link>
      </div>
    );
  }

  const isVerified = seller.status === "verified" || seller.is_verified;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-amber-400 selection:text-black">
      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white text-black px-5 py-3 border border-white shadow-2xl flex items-center gap-3 animate-bounce rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SUPERIOR NERKLEY */}
      <header className="border-b border-white/10 bg-[#0d0d12]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif tracking-[0.3em] font-bold text-base text-white hover:text-amber-300 transition-colors">
              NERKLEY
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
              BOUTIQUE VERIFICADA
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors hidden sm:inline">
              Tienda Oficial
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>🛒</span>
              <span>Carrito</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SECCIÓN ESTILO FACEBOOK / INSTAGRAM: PORTADA & PERFIL SOCIAL */}
      {/* ========================================================= */}
      <div className="relative bg-[#0d0d12] border-b border-white/10">
        {/* FOTO DE PORTADA / BANNER */}
        <div className="relative w-full h-44 sm:h-64 md:h-80 bg-gradient-to-r from-[#14141c] via-[#1c1811] to-[#0a0a0c] overflow-hidden">
          {seller.banner_url ? (
            <img
              src={seller.banner_url}
              alt="Portada de Boutique"
              className="w-full h-full object-cover opacity-85"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-black/40 to-[#0a0a0c]"></div>
              <span className="text-4xl sm:text-6xl md:text-8xl font-serif font-black tracking-[0.3em] text-white/5 uppercase select-none">
                {seller.store_name}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/30 to-transparent pointer-events-none" />

          {/* Insignia de Protección de Compra */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-amber-400/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] text-amber-300 font-bold uppercase tracking-wider">
            <span>🛡️</span>
            <span>Garantía Escrow NERKLEY</span>
          </div>
        </div>

        {/* CONTENEDOR DE PERFIL (SUPERPUESTO ESTILO FACEBOOK) */}
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
            {/* AVATAR + DETALLES BÁSICOS */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* FOTO DE PERFIL / LOGO CON ARO SOCIAL DORADO */}
              <div className="relative group cursor-pointer" onClick={() => stories.length > 0 && openStory(0)}>
                <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 shadow-[0_0_25px_rgba(232,198,98,0.4)] ${stories.length > 0 ? "animate-pulse" : ""}`}>
                  <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center border-2 border-black">
                    {seller.logo_url ? (
                      <img src={seller.logo_url} alt={seller.store_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-serif font-bold text-amber-300">
                        {seller.store_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {stories.length > 0 && (
                  <div className="absolute bottom-1 right-1 bg-amber-400 text-black px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">
                    Ver Historias
                  </div>
                )}
              </div>

              {/* IDENTIDAD DEL VENDEDOR */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white uppercase tracking-wider">
                    {seller.store_name}
                  </h1>
                  {isVerified && (
                    <span className="text-emerald-400 text-xl" title="Boutique Oficial Certificada">
                      ⭐
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-neutral-300">
                  <span className="text-amber-300 font-semibold">{seller.category || "Variado"}</span>
                  <span>&bull;</span>
                  <span>📍 {seller.city}, {seller.department}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-emerald-400 font-bold">5.0 ⭐⭐⭐⭐⭐</span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Por: <strong className="text-white">{seller.owner_name}</strong> &bull; Tienda Aliada NERKLEY
                </p>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN SOCIAL (MENSAJE, COMPARTIR, COMPRAR) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
              <a
                href={`https://wa.me/57${seller.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hola ${seller.owner_name}, vi tu boutique "${seller.store_name}" en NERKLEY y quiero consultar por tus productos disponibles.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span>💬</span>
                <span>Contactar Vendedor</span>
              </a>

              <button
                type="button"
                onClick={handleShareProfile}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🔗</span>
                <span>Compartir</span>
              </button>

              <a
                href="#catalogo"
                className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>🛍️</span>
                <span>Comprar ({products.length})</span>
              </a>
            </div>
          </div>

          {/* BIOGRAFÍA / HISTORIA DE LA BOUTIQUE */}
          {seller.bio && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-neutral-200 leading-relaxed text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block mb-1">
                Sobre esta Boutique &bull; Biografía
              </span>
              <p className="italic font-light">&ldquo;{seller.bio}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECCIÓN DE HISTORIAS / STORIES (COMO FACEBOOK / INSTAGRAM) */}
      {/* ========================================================= */}
      {stories.length > 0 && (
        <section className="border-b border-white/10 py-6 bg-[#0a0a0c]">
          <div className="max-w-6xl mx-auto px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-amber-300 flex items-center gap-2">
                <span>📸</span>
                <span>Historias & Novedades de la Boutique</span>
              </h2>
              <span className="text-[10px] text-neutral-400">Toca para ver en pantalla completa</span>
            </div>

            {/* CARRUSEL DE BURBUJAS DE HISTORIAS */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {stories.map((st, idx) => (
                <button
                  key={st.id}
                  onClick={() => openStory(idx)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(232,198,98,0.3)]">
                    <div className="w-full h-full rounded-full bg-black overflow-hidden border border-black">
                      <img src={st.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-300 font-medium group-hover:text-amber-300 truncate max-w-[70px]">
                    {st.product_name || `Historia ${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* VISOR MODAL DE HISTORIAS EN PANTALLA COMPLETA */}
      {/* ========================================================= */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div
          className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 select-none"
          onClick={closeStory}
        >
          <div
            className="relative w-full sm:max-w-md h-full sm:h-[90vh] bg-neutral-950 sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={() => setIsStoryPaused(true)}
            onMouseUp={() => setIsStoryPaused(false)}
            onTouchStart={() => setIsStoryPaused(true)}
            onTouchEnd={() => setIsStoryPaused(false)}
          >
            {/* BARRAS DE PROGRESO SUPERIORES (ESTILO INSTAGRAM/FACEBOOK) */}
            <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
              {stories.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < activeStoryIndex
                          ? "100%"
                          : i === activeStoryIndex
                          ? `${storyProgress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* CABECERA DE LA HISTORIA */}
            <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-400 bg-black">
                  <img src={seller.logo_url || stories[activeStoryIndex].image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block drop-shadow-md">
                    {seller.store_name}
                  </span>
                  <span className="text-[9px] text-neutral-300 drop-shadow-md">
                    Historia de Boutique &bull; Activa
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeStory}
                className="w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* IMAGEN DE LA HISTORIA */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <img
                src={stories[activeStoryIndex].image_url}
                alt=""
                className="w-full h-full object-contain"
              />

              {/* BOTONES LATERALES PARA RETROCEDER / AVANZAR */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={handlePrevStory}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={handleNextStory}
              />
            </div>

            {/* PIE DE HISTORIA: PIE DE FOTO & ACCIÓN DE COMPRA DIRECTA */}
            <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/85 to-transparent space-y-3">
              {stories[activeStoryIndex].caption && (
                <p className="text-white text-xs sm:text-sm font-medium drop-shadow-md leading-relaxed">
                  {stories[activeStoryIndex].caption}
                </p>
              )}

              {/* SI LA HISTORIA TIENE UN PRODUCTO ETIQUETADO */}
              {stories[activeStoryIndex].product_name && (
                <div className="p-3 bg-white/10 backdrop-blur-md border border-amber-400/50 rounded-xl flex items-center justify-between gap-3 shadow-lg">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold block">
                      🛍️ Producto de la Historia
                    </span>
                    <span className="text-xs font-bold text-white block truncate">
                      {stories[activeStoryIndex].product_name}
                    </span>
                    {stories[activeStoryIndex].product_price && (
                      <span className="text-xs font-mono font-black text-emerald-400">
                        $ {Number(stories[activeStoryIndex].product_price).toLocaleString("es-CO")} COP
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const matched = products.find(
                        (p) => p.name === stories[activeStoryIndex].product_name || p.slug === stories[activeStoryIndex].product_slug
                      );
                      if (matched) {
                        handleBuyNow(matched);
                        closeStory();
                      } else {
                        const prodId = stories[activeStoryIndex].product_id || `story_prod_${Date.now()}`;
                        addToCart({
                          id: `${prodId}-story`,
                          product_id: prodId,
                          name: stories[activeStoryIndex].product_name!,
                          price: stories[activeStoryIndex].product_price || 150000,
                          image: stories[activeStoryIndex].image_url,
                          quantity: 1,
                          maxStock: 10,
                          seller_id: seller.id,
                          seller_name: seller.store_name,
                        });
                        setIsCartOpen(true);
                        closeStory();
                      }
                    }}
                    className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                  >
                    ⚡ Comprar Directo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECCIÓN PRINCIPAL: CATÁLOGO DE PRODUCTOS (COMPRAR DIRECTO) */}
      {/* ========================================================= */}
      <main id="catalogo" className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white uppercase tracking-wider">
              Productos Publicados por {seller.store_name}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Compra directamente los artículos de esta boutique con garantía de entrega y fondos protegidos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">
              {filteredProducts.length} de {products.length} productos
            </span>
          </div>
        </div>

        {/* FILTROS Y BÚSQUEDA DENTRO DE LA BOUTIQUE */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Categorías de la boutique */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer shrink-0 ${
                  categoryFilter === cat
                    ? "bg-amber-400 text-black shadow-md"
                    : "bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador dentro de la boutique */}
          <div className="relative sm:w-64">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar en esta tienda..."
              className="w-full bg-[#111116] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 placeholder-neutral-500"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* LISTADO DE PRODUCTOS EN CUADRÍCULA SOCIAL */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center border border-white/10 bg-white/5 rounded-2xl space-y-3">
            <span className="text-4xl">🛍️</span>
            <p className="text-sm font-semibold text-white">No se encontraron productos en este filtro</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Prueba con otra palabra de búsqueda o categoría.
            </p>
            {categoryFilter !== "Todas" || searchFilter ? (
              <button
                onClick={() => {
                  setCategoryFilter("Todas");
                  setSearchFilter("");
                }}
                className="text-amber-400 text-xs underline cursor-pointer"
              >
                Restablecer filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const img = prod.images ? prod.images.split(",")[0].trim() : null;
              return (
                <div
                  key={prod.id}
                  className="bg-[#111116] border border-white/10 hover:border-amber-400/40 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div>
                    {/* FOTO DEL PRODUCTO */}
                    <Link href={`/product/${prod.slug}`} className="block relative aspect-square bg-black overflow-hidden cursor-pointer">
                      {img ? (
                        <img
                          src={img}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs uppercase tracking-widest">
                          NERKLEY
                        </div>
                      )}

                      {/* Insignia de descuento */}
                      {prod.discount_percent && prod.discount_percent > 0 ? (
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                          -{prod.discount_percent}% OFF
                        </div>
                      ) : null}

                      {/* Insignia de boutique */}
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                        <span>⭐</span>
                        <span>{seller.store_name}</span>
                      </div>
                    </Link>

                    {/* DETALLES DEL PRODUCTO */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        <span>{prod.category}</span>
                        <span className="text-neutral-400 font-mono">Stock: {prod.stock} uds</span>
                      </div>

                      <Link href={`/product/${prod.slug}`}>
                        <h3 className="text-sm font-bold text-white hover:text-amber-300 transition-colors line-clamp-1" title={prod.name}>
                          {prod.name}
                        </h3>
                      </Link>

                      {prod.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      )}

                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg font-mono font-bold text-white">
                          $ {Number(prod.sale_price).toLocaleString("es-CO")} COP
                        </span>
                        {prod.original_price && prod.original_price > prod.sale_price && (
                          <span className="text-xs font-mono text-neutral-500 line-through">
                            ${Number(prod.original_price).toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE COMPRA DIRECTA */}
                  <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddDirect(prod)}
                      className="bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-white/15 flex items-center justify-center gap-1"
                    >
                      <span>🛒</span>
                      <span>Al Carrito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBuyNow(prod)}
                      className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>⚡</span>
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BANNER INFORMATIVO DE SEGURIDAD Y COMPRA PROTEGIDA */}
        <section className="bg-gradient-to-r from-[#14141c] via-[#1c1811] to-[#14141c] border border-amber-400/30 p-6 sm:p-8 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <span>🛡️</span> Compra 100% Protegida en NERKLEY
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-white uppercase tracking-wider">
            ¿Cómo funciona tu compra con {seller.store_name}?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed">
            Cuando compras en esta boutique, tu pago es procesado de forma segura con Wompi (Bancolombia, Nequi, Tarjetas). El dinero permanece en custodia de NERKLEY hasta que la transportadora confirme que el paquete llegó a tus manos.
          </p>
          <div className="flex justify-center pt-2">
            <Link
              href="/"
              className="text-xs uppercase tracking-wider text-amber-300 hover:text-white underline font-semibold"
            >
              &larr; Volver al Catálogo Principal de NERKLEY
            </Link>
          </div>
        </section>
      </main>

      <AIChatSupport />
    </div>
  );
}

export default function BoutiqueProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
          Cargando Boutique Oficial NERKLEY...
        </div>
      }
    >
      <BoutiqueProfileContent params={params} />
    </Suspense>
  );
}
