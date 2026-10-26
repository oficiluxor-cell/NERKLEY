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
    "🚀 Envíos Express asegurados a todo el país (Colombia)",
    "💳 Pagos 100% seguros con Wompi & Bancolombia",
    "🛡️ Calidad garantizada y soporte directo en cada pedido",
    "✨ Descubre las tendencias exclusivas de temporada en NERKLEY"
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
    <div className="min-h-screen bg-transparent text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col relative overflow-hidden">
      
      {/* FONDO ANIMADO PREMIUM (AURORA NEUTRA) */}
      <div className="fixed inset-0 z-[-1] bg-[#fbfbfb] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-neutral-200/70 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-stone-200/60 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '14s' }}></div>
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-gray-200/50 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '11s' }}></div>
      </div>

      <div className="bg-black text-white text-[11px] uppercase tracking-[0.2em] py-2.5 text-center font-medium shadow-inner overflow-hidden relative z-50">
        <div className="transition-all duration-500 ease-in-out px-4">
          {announcements[currentAnnouncement]}
        </div>
      </div>

      <header className="border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-black group-hover:scale-105 transition-transform duration-300"
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
              <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.3em] uppercase leading-none">
                NERKLEY
              </span>
              <span className="text-[7px] md:text-[9px] uppercase tracking-[0.35em] text-neutral-500 font-sans mt-0.5">
                Official Store
              </span>
            </div>
          </Link>

          <nav className="space-x-10 text-xs font-semibold uppercase tracking-[0.2em] hidden md:flex">
            <a href="#catalogo" className="hover:text-neutral-500 transition-colors py-1 relative group">
              Productos
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#catalogo" className="hover:text-neutral-500 transition-colors py-1 relative group">
              Tendencias
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsOrdersOpen(true)}
              className="bg-white/50 backdrop-blur-md border border-neutral-200 text-neutral-900 px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-white hover:shadow-md transition-all font-semibold cursor-pointer"
            >
              Mis Pedidos
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] md:text-[11px] font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-neutral-950 text-white border-b border-neutral-800 py-24 md:py-32 px-4 md:px-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none filter blur-sm">
          <svg className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
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
          <span className="inline-block text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-neutral-400 font-semibold mb-4 border-b border-neutral-800 pb-1">
            Descubre Tendencias Exclusivas
          </span>
          <h2 className="text-4xl md:text-7xl font-serif font-light tracking-tight mb-6 text-white uppercase">
            Lo Último en NERKLEY
          </h2>
          <p className="max-w-lg mx-auto text-neutral-400 text-xs md:text-base font-light leading-relaxed mb-8 md:mb-10">
            Encuentra los productos más deseados del mercado con calidad garantizada y envío directo a tu puerta.
          </p>
          <a
            href="#catalogo"
            className="inline-block bg-white text-black px-8 md:px-10 py-3 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-lg hover:shadow-2xl hover:-translate-y-0.5"
          >
            Comprar Ahora
          </a>
        </div>
      </section>

      <section id="catalogo" className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 w-full relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 md:mb-10 border-b border-neutral-300/50 pb-6 gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-serif font-light uppercase tracking-wider text-neutral-900">
              Catálogo
            </h3>
            <p className="text-[10px] md:text-xs text-neutral-500 mt-1 md:mt-2 tracking-wide font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? "producto encontrado" : "productos encontrados"}
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
                  placeholder="Buscar producto..."
                  className="w-full bg-white/70 backdrop-blur-md border border-neutral-200 px-3 md:px-4 py-2 md:py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black focus:bg-white transition-all tracking-wider shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-sm font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Menú de Ordenamiento */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto bg-white/70 backdrop-blur-md border border-neutral-200 pl-3 md:pl-4 pr-8 py-2 md:py-2.5 text-[10px] md:text-xs text-neutral-900 uppercase tracking-widest font-semibold focus:outline-none focus:border-black focus:bg-white transition-all cursor-pointer shadow-sm appearance-none"
                >
                  <option value="featured">✨ Destacados</option>
                  <option value="price-asc">💵 Precio: Menor a Mayor</option>
                  <option value="price-desc">💎 Precio: Mayor a Menor</option>
                  <option value="discount">🔥 Mayor Descuento</option>
                  <option value="name-asc">🔤 Nombre: A - Z</option>
                </select>
                <svg
                  className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Categorías */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("Todas")}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all font-semibold shadow-sm cursor-pointer ${
                  selectedCategory === "Todas"
                    ? "bg-black text-white"
                    : "bg-white/60 backdrop-blur-md border border-neutral-200 text-neutral-600 hover:border-black hover:bg-white"
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
                      ? "bg-black text-white"
                      : "bg-white/60 backdrop-blur-md border border-neutral-200 text-neutral-600 hover:border-black hover:bg-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[10px] md:text-xs text-neutral-500 uppercase tracking-[0.3em] animate-pulse font-medium">
            Cargando inventario NERKLEY...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 md:px-6 border border-dashed border-neutral-300 bg-white/50 backdrop-blur-md max-w-xl mx-auto shadow-sm">
            <span className="text-2xl md:text-3xl block mb-3 opacity-80">🔍</span>
            <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-widest font-bold text-neutral-900 mb-2">
              Producto aún no integrado
            </h4>
            <p className="text-[10px] md:text-xs text-neutral-500 font-light leading-relaxed mb-6">
              No encontramos coincidencias para <strong className="text-neutral-900">"{searchQuery}"</strong>.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("Todas"); setSortBy("featured"); }}
              className="bg-black text-white px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-md"
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
                  className="group bg-white/50 backdrop-blur-lg border border-white/60 p-2 md:p-5 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:bg-white/80 hover:-translate-y-1 flex flex-col justify-between relative shadow-sm"
                >
                  <div>
                    <Link href={`/product/${product.slug}`} className="block">
                      <div className="aspect-[3/4] bg-white mb-2 md:mb-4 flex items-center justify-center relative overflow-hidden border border-neutral-100 group-hover:border-neutral-200 transition-colors cursor-pointer p-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <span className="text-[8px] md:text-xs text-neutral-300 uppercase tracking-[0.3em] font-serif">
                            [ NERKLEY ]
                          </span>
                        )}

                        {product.discount_percent && product.discount_percent > 0 ? (
                          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-red-600 text-white text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 md:px-2 py-0.5 md:py-1 shadow-md z-10 pointer-events-none">
                            -{product.discount_percent}%
                          </div>
                        ) : null}

                        <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-neutral-900/90 backdrop-blur-md text-white text-[7px] md:text-[9px] uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 font-semibold z-10 pointer-events-none">
                          Stock
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                      {product.category && (
                        <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-semibold block truncate">
                          {product.category}
                        </span>
                      )}
                      
                      {product.badge && product.badge.trim() !== "" && (
                        <span className="bg-black text-white text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 animate-pulse rounded-sm">
                          ✨ {product.badge}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/product/${product.slug}`}>
                      <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-neutral-900 mb-1 md:mb-2 line-clamp-1 hover:underline cursor-pointer">
                        {product.name}
                      </h4>
                    </Link>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-neutral-200/60 flex flex-col justify-between mt-2 md:mt-4 gap-2">
                    <div>
                      {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                        <span className="text-[9px] md:text-[11px] line-through text-neutral-400 block font-light">
                          $ {Number(product.original_price).toLocaleString()}
                        </span>
                      ) : null}
                      <p className="text-xs md:text-base font-bold text-neutral-900 tracking-tight">
                        $ {Number(product.sale_price).toLocaleString()} <span className="text-[8px] md:text-[10px] font-normal text-neutral-500">COP</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-1 items-center">
                      <Link
                        href={`/product/${product.slug}`}
                        className="bg-white border border-neutral-200 text-neutral-900 py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:border-black transition-all text-center flex items-center justify-center cursor-pointer shadow-sm"
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
                        className="bg-black text-white p-2.5 hover:bg-neutral-800 transition-all flex items-center justify-center shadow-lg active:scale-90 group/btn cursor-pointer"
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

      <footer className="relative z-10 mt-auto bg-white/80 backdrop-blur-xl border-t border-neutral-200/50 py-10 md:py-12 px-4 md:px-6 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <span className="text-lg md:text-xl font-serif font-bold tracking-[0.3em] uppercase mb-2">NERKLEY</span>
          <p className="text-[10px] md:text-xs text-neutral-500 font-light mb-4 md:mb-6">Tu tienda en línea de confianza.</p>
          <p className="text-[8px] md:text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
            &copy; 2026 TIENDAS NERKLEY. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* COMPONENTE DE NOTIFICACIÓN FAKE SOCIAL PROOF (MODERNIZADO) */}
      <div 
        className={`fixed bottom-4 md:bottom-6 left-4 md:left-6 z-50 bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-3 flex items-center gap-3 md:gap-4 transition-all duration-700 max-w-[280px] md:max-w-sm rounded-lg ${showNotification ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 bg-white flex-shrink-0 border border-neutral-100 overflow-hidden flex items-center justify-center p-1 shadow-sm rounded-md">
          {purchaseNotification?.image ? (
            <img src={purchaseNotification.image} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[6px] uppercase font-serif text-neutral-400">Nerkley</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] md:text-xs font-bold text-neutral-900">{purchaseNotification?.name}</span>
            <span className="text-[8px] md:text-[9px] text-neutral-500">compró hace instantes</span>
          </div>
          <p className="text-[9px] md:text-[10px] font-medium text-neutral-700 line-clamp-1">
            {purchaseNotification?.productName}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-emerald-600 font-bold">Compra Verificada</span>
          </div>
        </div>
      </div>
    </div>
  );
}