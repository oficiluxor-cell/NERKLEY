"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

interface Product {
  id: string;
  name: string;
  slug: string;
  sale_price: number;
  original_price?: number;
  discount_percent?: number;
  category: string;
  images?: string;
  stock?: number;
  badge?: string;
}

const RANDOM_NAMES = [
  "Carlos M.", "Valentina R.", "Andrés F.", "Camila P.", "Sebastián G.",
  "Laura T.", "Mateo L.", "Daniela C.", "Santiago B.", "Valeria N.",
  "Juan D.", "Mariana S.", "Diego A.", "Sofía V.", "Alejandro P."
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [loading, setLoading] = useState(true);
  
  const { cartCount, setIsCartOpen, setIsOrdersOpen, addToCart } = useCart();

  const announcements = [
    "🚀 Envíos Asegurados a todo el país (Colombia)",
    "💎 Concept Store Oficial &bull; Piezas y Calidad Exclusiva",
    "💳 Pagos 100% Blindados con Wompi & Bancolombia",
    "🛡️ Empaque Seguro y Garantía Verificada en Cada Pedido"
  ];
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  const [purchaseNotification, setPurchaseNotification] = useState<{ name: string, productName: string, image: string | null } | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnnouncement((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar productos:", error);
      } else if (data) {
        setProducts(data);

        const categoriesMap = new Map<string, string>();
        data.forEach((item: Product) => {
          if (item.category) {
            const normalizedKey = item.category.trim().toLowerCase();
            if (!categoriesMap.has(normalizedKey)) {
              const formattedName = item.category.trim().charAt(0).toUpperCase() + item.category.trim().slice(1).toLowerCase();
              categoriesMap.set(normalizedKey, formattedName);
            }
          }
        });

        setCategories(Array.from(categoriesMap.values()));
      }
      setLoading(false);
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length === 0) return;

    let timeoutId: NodeJS.Timeout;
    let hideTimeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const nextInterval = Math.floor(Math.random() * (35000 - 15000 + 1) + 15000);
      
      timeoutId = setTimeout(() => {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        const img = randomProduct.images ? randomProduct.images.split(",")[0].trim() : null;

        setPurchaseNotification({ name: randomName, productName: randomProduct.name, image: img });
        setShowNotification(true);

        hideTimeoutId = setTimeout(() => {
          setShowNotification(false);
          scheduleNext();
        }, 6000);
      }, nextInterval);
    };

    timeoutId = setTimeout(() => scheduleNext(), 5000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [products]);

  const filteredProducts = [...products]
    .filter((p) => {
      const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const priceA = Number(a.sale_price) || 0;
      const priceB = Number(b.sale_price) || 0;

      if (sortBy === "price-asc") {
        return priceA - priceB;
      }
      if (sortBy === "price-desc") {
        return priceB - priceA;
      }
      if (sortBy === "discount") {
        const discA = Number(a.discount_percent) || 0;
        const discB = Number(b.discount_percent) || 0;
        return discB - discA;
      }
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" });
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-white selection:text-black flex flex-col relative overflow-hidden">
      
      {/* ATMÓSFERA DARK LUXURY (AURA DE ESTUDIO PREMIUM) */}
      <div className="fixed inset-0 z-[-1] bg-[#0a0a0c] overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[20%] w-[60vw] h-[60vw] bg-amber-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-500/5 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '16s' }}></div>
        <div className="absolute top-[40%] left-[-10%] w-[45vw] h-[45vw] bg-neutral-800/20 rounded-full blur-[120px]"></div>
      </div>

      {/* BARRA SUPERIOR DE ANUNCIOS */}
      <div className="bg-[#050507] text-neutral-300 border-b border-white/10 text-[10px] md:text-[11px] uppercase tracking-[0.25em] py-2.5 text-center font-medium shadow-inner overflow-hidden relative z-50">
        <div className="transition-all duration-500 ease-in-out px-4" dangerouslySetInnerHTML={{ __html: announcements[currentAnnouncement] }}>
        </div>
      </div>

      {/* HEADER PRINCIPAL */}
      <header className="border-b border-white/10 bg-[#0a0a0c]/85 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:scale-105 transition-transform duration-300"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="50" cy="18" r="9" fill="currentColor" />
              <path d="M 30 25 C 20 35, 20 60, 38 72 C 34 60, 36 40, 50 32 C 64 40, 66 60, 62 72 C 80 60, 80 35, 70 25" />
              <ellipse cx="50" cy="48" rx="11" ry="14" />
              <line x1="50" y1="34" x2="50" y2="62" />
              <path d="M 40 42 C 30 42, 24 48, 22 55" />
              <path d="M 60 42 C 70 42, 76 48, 78 55" />
              <path d="M 40 56 C 30 60, 26 68, 28 78" />
              <path d="M 60 56 C 70 60, 74 68, 72 78" />
            </svg>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.3em] uppercase leading-none text-white">
                NERKLEY
              </span>
              <span className="text-[7px] md:text-[9px] uppercase tracking-[0.35em] text-neutral-400 font-sans mt-0.5">
                Concept Store
              </span>
            </div>
          </Link>

          <nav className="space-x-10 text-xs font-semibold uppercase tracking-[0.2em] hidden md:flex text-neutral-400">
            <a href="#catalogo" className="hover:text-white transition-colors py-1 relative group">
              Catálogo
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#garantias" className="hover:text-white transition-colors py-1 relative group">
              Garantía & Envíos
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsOrdersOpen(true)}
              className="bg-white/5 backdrop-blur-md border border-white/15 text-neutral-200 px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/30 hover:text-white transition-all font-semibold cursor-pointer"
            >
              Mis Pedidos
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-white text-black px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 flex items-center gap-2 cursor-pointer font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] md:text-[11px] font-extrabold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-[#0a0a0c] animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION DE LUJO URBANO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0e0e12] via-[#0a0a0c] to-[#0a0a0c] border-b border-white/10 py-24 md:py-32 px-4 md:px-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none filter blur-sm">
          <svg className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="50" cy="18" r="9" fill="currentColor" />
            <path d="M 30 25 C 20 35, 20 60, 38 72 C 34 60, 36 40, 50 32 C 64 40, 66 60, 62 72 C 80 60, 80 35, 70 25" />
            <ellipse cx="50" cy="48" rx="11" ry="14" />
            <line x1="50" y1="34" x2="50" y2="62" />
            <path d="M 40 42 C 30 42, 24 48, 22 55" />
            <path d="M 60 42 C 70 42, 76 48, 78 55" />
            <path d="M 40 56 C 30 60, 26 68, 28 78" />
            <path d="M 60 56 C 70 60, 74 68, 72 78" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-block text-[9px] md:text-[11px] uppercase tracking-[0.45em] text-amber-400/90 font-semibold mb-4 border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm">
            Exclusividad &bull; Streetwear &bull; Alta Gama
          </span>
          <h2 className="text-4xl md:text-7xl font-serif font-light tracking-tight mb-6 text-white uppercase leading-none">
            NERKLEY SHOWROOM
          </h2>
          <p className="max-w-xl mx-auto text-neutral-400 text-xs md:text-base font-light leading-relaxed mb-8 md:mb-10">
            Perfumería de autor, calzado de diseñador, streetwear exclusivo, gorras y piezas seleccionadas con la máxima exigencia de calidad.
          </p>
          <a
            href="#catalogo"
            className="inline-block bg-white text-black px-8 md:px-10 py-3.5 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 cursor-pointer"
          >
            Explorar Colección &darr;
          </a>
        </div>
      </section>

      {/* BARRA DE GARANTÍA Y CONFIANZA */}
      <section id="garantias" className="border-b border-white/10 bg-[#0e0e12] py-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Calidad Seleccionada</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Artículos originales y acabados premium verificados.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <span className="text-2xl">🚚</span>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Envíos a Colombia</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Despacho seguro con guía y empaque blindado.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Pagos Seguros Wompi</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Bancolombia, Nequi, PSE y Tarjetas con cifrado bancario.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Atención Personalizada</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Acompañamiento y soporte directo en cada pedido.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN DEL CATÁLOGO */}
      <section id="catalogo" className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 md:mb-10 border-b border-white/10 pb-6 gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-serif font-light uppercase tracking-wider text-white">
              Catálogo de Piezas
            </h3>
            <p className="text-[10px] md:text-xs text-neutral-400 mt-1 md:mt-2 tracking-wide font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? "artículo disponible" : "artículos disponibles"}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto">
            {/* Buscador + Ordenamiento Dinámico */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <div className="relative flex-1 sm:w-64 md:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar pieza..."
                  className="w-full bg-white/5 border border-white/15 px-3 md:px-4 py-2 md:py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:bg-white/10 transition-all tracking-wider shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-sm font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Selector de Ordenamiento */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto bg-[#141418] border border-white/15 pl-3 md:pl-4 pr-8 py-2 md:py-2.5 text-[10px] md:text-xs text-neutral-200 uppercase tracking-widest font-semibold focus:outline-none focus:border-white transition-all cursor-pointer shadow-sm appearance-none"
                >
                  <option value="featured">✨ Destacados</option>
                  <option value="price-asc">💵 Precio: Menor a Mayor</option>
                  <option value="price-desc">💎 Precio: Mayor a Menor</option>
                  <option value="discount">🔥 Mayor Descuento</option>
                  <option value="name-asc">🔤 Nombre: A - Z</option>
                </select>
                <svg
                  className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Categorías dinámicas desde el Administrador */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("Todas")}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all font-semibold shadow-sm cursor-pointer ${
                  selectedCategory === "Todas"
                    ? "bg-white text-black"
                    : "bg-white/5 border border-white/15 text-neutral-400 hover:border-white/40 hover:text-white hover:bg-white/10"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all font-semibold shadow-sm cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-white text-black"
                      : "bg-white/5 border border-white/15 text-neutral-400 hover:border-white/40 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.3em] animate-pulse font-medium">
            Sincronizando inventario exclusivo NERKLEY...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 md:px-6 border border-dashed border-white/15 bg-white/5 max-w-xl mx-auto shadow-sm">
            <span className="text-2xl md:text-3xl block mb-3 opacity-80">🔍</span>
            <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-widest font-bold text-white mb-2">
              Pieza no encontrada
            </h4>
            <p className="text-[10px] md:text-xs text-neutral-400 font-light leading-relaxed mb-6">
              No encontramos coincidencias para <strong className="text-white">"{searchQuery}"</strong>.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("Todas"); setSortBy("featured"); }}
              className="bg-white text-black px-5 py-2.5 text-[9px] md:text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-200 transition-all shadow-md cursor-pointer"
            >
              Ver Todo el Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-8">
            {filteredProducts.map((product) => {
              const mainImage = product.images ? product.images.split(",")[0].trim() : null;

              return (
                <div
                  key={product.id}
                  className="group bg-[#111115] border border-white/10 p-2.5 md:p-5 transition-all duration-500 hover:border-white/30 hover:shadow-[0_20px_45px_rgba(0,0,0,0.8)] hover:-translate-y-1 flex flex-col justify-between relative shadow-lg"
                >
                  <div>
                    {/* VITRINA DE IMAGEN */}
                    <Link href={`/product/${product.slug}`} className="block">
                      <div className="aspect-[3/4] bg-[#16161b] mb-3 md:mb-4 flex items-center justify-center relative overflow-hidden border border-white/5 group-hover:border-white/20 transition-all cursor-pointer p-3 shadow-inner">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <span className="text-[8px] md:text-xs text-neutral-600 uppercase tracking-[0.3em] font-serif">
                            [ NERKLEY ]
                          </span>
                        )}

                        {/* Descuento si aplica */}
                        {product.discount_percent && product.discount_percent > 0 ? (
                          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-red-600 text-white text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-md z-10 pointer-events-none">
                            -{product.discount_percent}%
                          </div>
                        ) : null}

                        {/* Estado de stock */}
                        <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/80 backdrop-blur-md text-neutral-300 border border-white/10 text-[7px] md:text-[8px] uppercase tracking-widest px-2 py-0.5 font-semibold z-10 pointer-events-none">
                          {product.stock && product.stock <= 3 ? "¡Últimas!" : "Stock"}
                        </div>
                      </div>
                    </Link>

                    {/* Categoría y Badges dinámicos desde el Administrador */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {product.category && (
                        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-semibold block truncate">
                          {product.category}
                        </span>
                      )}
                      
                      {product.badge && product.badge.trim() !== "" && (
                        <span className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/40 text-amber-300 text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs animate-pulse">
                          ✨ {product.badge}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/product/${product.slug}`}>
                      <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-white mb-1 md:mb-2 line-clamp-1 hover:text-amber-200 transition-colors cursor-pointer">
                        {product.name}
                      </h4>
                    </Link>
                  </div>

                  {/* PRECIO Y ACCIONES */}
                  <div className="pt-2.5 md:pt-4 border-t border-white/10 flex flex-col justify-between mt-2 md:mt-4 gap-2">
                    <div>
                      {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                        <span className="text-[9px] md:text-[11px] line-through text-neutral-500 block font-light">
                          $ {Number(product.original_price).toLocaleString()}
                        </span>
                      ) : null}
                      <p className="text-xs md:text-base font-bold text-white tracking-tight font-mono">
                        $ {Number(product.sale_price).toLocaleString()} <span className="text-[8px] md:text-[10px] font-normal text-neutral-400">COP</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-1 items-center">
                      <Link
                        href={`/product/${product.slug}`}
                        className="bg-transparent border border-white/20 text-white py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-white hover:text-black hover:border-white transition-all text-center flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        Detalles
                      </Link>

                      <button
                        onClick={() => {
                          addToCart({
                            id: product.id,
                            product_id: product.id,
                            name: product.name,
                            price: product.sale_price,
                            image: mainImage,
                            quantity: 1,
                            maxStock: product.stock || 10,
                          });
                        }}
                        title="Agregar al carrito"
                        className="bg-white text-black p-2.5 hover:bg-neutral-200 transition-all flex items-center justify-center shadow-lg active:scale-90 group/btn cursor-pointer font-bold"
                      >
                        <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="relative z-10 mt-auto bg-[#070709] border-t border-white/10 py-12 md:py-16 px-4 md:px-6 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.35em] uppercase mb-2 text-white">NERKLEY</span>
          <p className="text-[10px] md:text-xs text-neutral-400 font-light mb-4 md:mb-6">
            Concept Store Oficial &bull; Perfumería, Calzado, Joyería & Streetwear.
          </p>
          <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest text-neutral-500 mb-6 font-medium">
            <span>Wompi</span>
            <span>&bull;</span>
            <span>Bancolombia</span>
            <span>&bull;</span>
            <span>Nequi</span>
            <span>&bull;</span>
            <span>PSE</span>
            <span>&bull;</span>
            <span>Tarjetas</span>
          </div>
          <p className="text-[8px] md:text-[9px] text-neutral-600 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} NERKLEY CONCEPTS. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* NOTIFICACIÓN SOCIAL PROOF EN DARK GLASS */}
      <div 
        className={`fixed bottom-4 md:bottom-6 left-4 md:left-6 z-50 bg-[#121216]/95 backdrop-blur-xl border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.8)] p-3 flex items-center gap-3 md:gap-4 transition-all duration-700 max-w-[280px] md:max-w-sm rounded-lg text-white ${showNotification ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 bg-[#18181f] flex-shrink-0 border border-white/10 overflow-hidden flex items-center justify-center p-1 shadow-inner rounded-md">
          {purchaseNotification?.image ? (
            <img src={purchaseNotification.image} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[6px] uppercase font-serif text-neutral-500">Nerkley</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] md:text-xs font-bold text-white">{purchaseNotification?.name}</span>
            <span className="text-[8px] md:text-[9px] text-neutral-400">compró hace instantes</span>
          </div>
          <p className="text-[9px] md:text-[10px] font-medium text-neutral-300 line-clamp-1">
            {purchaseNotification?.productName}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-emerald-400 font-bold">Compra Verificada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
