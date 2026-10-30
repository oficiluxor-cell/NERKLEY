"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import AIChatSupport from "@/components/AIChatSupport";
import { SmartSearchableProduct, filterAndSortProducts, matchesCategoryFilter } from "@/lib/smartSearch";
import { hasFreeShipping, extractDisplayBadge } from "@/lib/shipping";
import {
  getProductPresentation,
  isProductCombo,
  ProductPresentationType,
} from "@/lib/presentation";

interface Product extends SmartSearchableProduct {}

const RANDOM_NAMES = [
  "Carlos M.", "Valentina R.", "Andrés F.", "Camila P.", "Sebastián G.",
  "Laura T.", "Mateo L.", "Daniela C.", "Santiago B.", "Valeria N.",
  "Juan D.", "Mariana S.", "Diego A.", "Sofía V.", "Alejandro P."
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedPresentation, setSelectedPresentation] = useState<ProductPresentationType>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [loading, setLoading] = useState(true);
  
  const { cartCount, setIsCartOpen, setIsOrdersOpen, addToCart, openWarrantyModal, isCartBouncing } = useCart();

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

  // Productos de la categoría seleccionada para calcular contadores de Unidades y Combos
  const currentCategoryProducts = useMemo(() => {
    return products.filter((p) => matchesCategoryFilter(p.category, selectedCategory));
  }, [products, selectedCategory]);

  const presentationCounts = useMemo(() => {
    let unidades = 0;
    let combos = 0;
    currentCategoryProducts.forEach((p) => {
      if (isProductCombo(p)) {
        combos++;
      } else {
        unidades++;
      }
    });
    return {
      todos: currentCategoryProducts.length,
      unidades,
      combos,
    };
  }, [currentCategoryProducts]);

  const filteredProducts = filterAndSortProducts(
    products,
    selectedCategory,
    searchQuery,
    sortBy,
    selectedPresentation
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-white selection:text-black flex flex-col relative overflow-hidden">
      
      {/* ATMÓSFERA DARK LUXURY (AURA DE ESTUDIO PREMIUM) */}
      <div className="fixed inset-0 z-[-1] bg-[#0a0a0c] overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[20%] w-[60vw] h-[60vw] bg-amber-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-500/5 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '16s' }}></div>
        <div className="absolute top-[40%] left-[-10%] w-[45vw] h-[45vw] bg-neutral-800/20 rounded-full blur-[120px]"></div>
      </div>

      {/* BARRA SUPERIOR DE ANUNCIOS (COMPACTA Y SIN DESBORDES EN MÓVIL) */}
      <div className="bg-[#050507] text-neutral-300 border-b border-white/10 text-[9.5px] sm:text-[11px] uppercase tracking-wider py-1.5 sm:py-2 text-center font-medium shadow-inner overflow-hidden relative z-50">
        <div className="transition-all duration-500 ease-in-out px-3 truncate" dangerouslySetInnerHTML={{ __html: announcements[currentAnnouncement] }}>
        </div>
      </div>

      {/* HEADER PRINCIPAL RESPONSIVE ELEGANTE */}
      <header className="border-b border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300 shadow-xl w-full">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-3 flex justify-between items-center gap-1.5 sm:gap-2">
          {/* Logo y Nombre de Marca */}
          <Link href="/" className="flex items-center gap-2 group min-w-0 shrink">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#0a0a0d] border border-amber-400/40 flex items-center justify-center p-0.5 sm:p-1 shadow-[0_0_12px_rgba(232,198,98,0.2)] group-hover:scale-105 group-hover:border-amber-400/80 transition-all shrink-0">
              <img src="/logo-app.svg" alt="NERKLEY Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-xl font-serif font-bold tracking-[0.18em] sm:tracking-[0.22em] uppercase leading-none text-white truncate">
                NERKLEY
              </span>
              <span className="hidden sm:block text-[8px] sm:text-[8.5px] uppercase tracking-[0.25em] text-amber-400/90 font-sans mt-0.5 font-semibold">
                Haute Boutique &bull; Colombia
              </span>
            </div>
          </Link>

          {/* Menú de Navegación Desktop */}
          <nav className="space-x-8 text-xs font-semibold uppercase tracking-[0.2em] hidden md:flex text-neutral-400">
            <a href="#catalogo" className="hover:text-white transition-colors py-1 relative group">
              Catálogo
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full" />
            </a>
            <button
              type="button"
              onClick={() => openWarrantyModal("shipping")}
              className="hover:text-white transition-colors py-1 relative group cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400"
            >
              Garantía & Envíos
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full" />
            </button>
          </nav>

          {/* Botones de Acción: Mis Pedidos y Carrito (100% contenidos dentro de la pantalla) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              onClick={() => setIsOrdersOpen(true)}
              className="bg-white/5 border border-white/15 text-neutral-300 hover:text-white px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-wider hover:bg-white/10 hover:border-white/30 transition-all font-semibold cursor-pointer rounded-lg flex items-center gap-1 shrink-0"
              title="Consultar estado de mis pedidos"
            >
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="hidden xs:inline sm:inline">Pedidos</span>
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative bg-gradient-to-r from-white to-neutral-200 text-black px-2.5 sm:px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-wider hover:from-neutral-100 hover:to-white active:scale-95 flex items-center gap-1.5 cursor-pointer font-bold shrink-0 rounded-lg transition-all duration-300 shadow-[0_4px_15px_rgba(255,255,255,0.15)] ${
                isCartBouncing ? "scale-105 ring-2 ring-amber-400 bg-amber-400 text-black shadow-[0_0_25px_rgba(232,198,98,0.7)]" : ""
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-black text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center border border-black shadow-xs shrink-0">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION DE LUJO Y ALTA CONVERSIÓN (ORGANIZADO, ELEGANTE Y CÓMODO) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#101017] via-[#0c0c10] to-[#0a0a0c] border-b border-white/10 pt-7 pb-8 sm:pt-12 sm:pb-12 px-4 text-center">
        {/* Glow de fondo de alta costura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[550px] h-[340px] sm:h-[550px] bg-gradient-to-tr from-amber-500/10 via-amber-400/5 to-transparent rounded-full blur-[90px] pointer-events-none"></div>

        <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-amber-300 font-semibold mb-2.5 border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 rounded-full backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Boutique Oficial &bull; Edición Exclusiva
          </span>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-light tracking-tight text-white uppercase leading-none mb-2.5">
            NERKLEY SHOWROOM
          </h1>

          <p className="max-w-lg text-neutral-300 text-xs sm:text-sm font-light leading-relaxed mb-5">
            Perfumería de autor, calzado de diseñador, relojes y piezas seleccionadas con la máxima exigencia de calidad.
          </p>

          {/* BUSCADOR INTELIGENTE EN PRIMER PLANO (COMODIDAD INMEDIATA) */}
          <div className="w-full max-w-xl mb-4">
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 text-sm pointer-events-none">
                ✨
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  const el = document.getElementById("catalogo");
                  if (el && e.target.value.length === 1) {
                    el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                placeholder="Buscar perfume (One Million, Club de Nuit, Lattafa...), categoría o marca..."
                className="w-full bg-[#13131c]/90 border border-white/20 focus:border-amber-400 pl-10 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm text-white placeholder-neutral-400 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] focus:outline-hidden focus:ring-1 focus:ring-amber-400/40 transition-all tracking-wide"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-base font-bold cursor-pointer p-1"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* CARRUSEL DE CHIPS DE CATEGORÍAS (1-TAP FILTRADO RÁPIDO) */}
          <div className="w-full max-w-xl flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => {
                setSelectedCategory("Todas");
                setSelectedPresentation("todos");
                const el = document.getElementById("catalogo");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === "Todas"
                  ? "bg-white text-black shadow-md"
                  : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10 hover:border-white/30"
              }`}
            >
              ✨ Todo ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedPresentation("todos");
                  const el = document.getElementById("catalogo");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  matchesCategoryFilter(cat, selectedCategory)
                    ? "bg-white text-black shadow-md"
                    : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10 hover:border-white/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* SUB-FILTROS DE MODALIDAD (UNIDADES VS COMBOS) */}
          <div className="w-full max-w-xl flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-2 pb-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedPresentation("todos");
                const el = document.getElementById("catalogo");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedPresentation === "todos"
                  ? "bg-neutral-200 text-black shadow-md font-bold"
                  : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>✨ Todos</span>
              <span className="text-[9px] font-mono opacity-70">({presentationCounts.todos})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPresentation("unidad");
                const el = document.getElementById("catalogo");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedPresentation === "unidad"
                  ? "bg-white text-black shadow-md font-bold"
                  : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>📦 Unidad</span>
              <span className="text-[9px] font-mono opacity-70">({presentationCounts.unidades})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedPresentation("combo");
                const el = document.getElementById("catalogo");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedPresentation === "combo"
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-black shadow-[0_0_15px_rgba(232,198,98,0.4)] font-black"
                  : "bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
              }`}
            >
              <span>🎁 Combos</span>
              <span className="text-[9px] font-mono font-bold">({presentationCounts.combos})</span>
            </button>
          </div>

          {/* MICRO-CINTA DE REASEGURO (RÁPIDA, ELEGANTE Y COMPACTA) */}
          <div className="mt-5 pt-4 border-t border-white/10 w-full grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-left">
            <button
              type="button"
              onClick={() => openWarrantyModal("warranty")}
              className="p-2 sm:p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base sm:text-lg">🛡️</span>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-white block truncate">100% Originales</span>
                <span className="text-[8.5px] text-neutral-400 block truncate">Batch codes verificados</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("shipping")}
              className="p-2 sm:p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base sm:text-lg">🚚</span>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-white block truncate">Envíos Nacionales</span>
                <span className="text-[8.5px] text-neutral-400 block truncate">Rastreo oficial asegurado</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("payments")}
              className="p-2 sm:p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base sm:text-lg">💳</span>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-white block truncate">Pagos Wompi</span>
                <span className="text-[8.5px] text-neutral-400 block truncate">Nequi, Bancolombia, PSE</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("returns")}
              className="p-2 sm:p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base sm:text-lg">🔄</span>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-white block truncate">Garantía Total</span>
                <span className="text-[8.5px] text-neutral-400 block truncate">Soporte directo 24/7</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN DEL CATÁLOGO DE PRODUCTOS (INMEDIATO, SIN ESPERAS NI VACÍOS) */}
      <section id="catalogo" className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12 w-full relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-white/10 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-light uppercase tracking-wider text-white flex items-center gap-2">
              <span>Colección Disponible</span>
              <span className="text-[10px] font-mono bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                {filteredProducts.length} {filteredProducts.length === 1 ? "artículo" : "artículos"}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-[10px] sm:text-xs text-neutral-400">
                {selectedCategory === "Todas" ? "Todas las categorías" : `Categoría: ${selectedCategory}`}
              </p>
              <span className="text-neutral-600 hidden sm:inline">•</span>
              {/* SUB-TABS RÁPIDAS EN EL CATÁLOGO */}
              <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedPresentation("todos")}
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    selectedPresentation === "todos"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Todo ({presentationCounts.todos})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPresentation("unidad")}
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    selectedPresentation === "unidad"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Unidad ({presentationCounts.unidades})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPresentation("combo")}
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-black transition-all cursor-pointer ${
                    selectedPresentation === "combo"
                      ? "bg-amber-400 text-black shadow-xs"
                      : "text-amber-300 hover:text-amber-200"
                  }`}
                >
                  🎁 Combos ({presentationCounts.combos})
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Ordenamiento Compacto y Elegante */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-[#14141c] border border-white/15 pl-3 pr-8 py-2 text-xs text-neutral-200 uppercase tracking-wider font-semibold rounded-lg focus:outline-hidden focus:border-amber-400 transition-all cursor-pointer shadow-sm appearance-none"
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

        {loading ? (
          <div className="text-center py-20 text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.3em] animate-pulse font-medium">
            Sincronizando inventario exclusivo NERKLEY...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-14 px-4 border border-dashed border-white/15 bg-white/5 max-w-xl mx-auto rounded-xl shadow-sm">
            <span className="text-2xl md:text-3xl block mb-2 opacity-80">🔍</span>
            <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-widest font-bold text-white mb-1.5">
              Pieza no encontrada
            </h4>
            <p className="text-[10px] md:text-xs text-neutral-400 font-light leading-relaxed mb-4">
              {searchQuery ? (
                <>No encontramos coincidencias para <strong className="text-white">"{searchQuery}"</strong>.</>
              ) : selectedPresentation === "combo" ? (
                <>No hay combos registrados bajo la categoría <strong className="text-white">"{selectedCategory}"</strong> todavía. ¡Pronto nuevos lanzamientos en promoción!</>
              ) : selectedPresentation === "unidad" ? (
                <>No hay unidades individuales registradas bajo la categoría <strong className="text-white">"{selectedCategory}"</strong>.</>
              ) : (
                <>No hay piezas registradas bajo la categoría <strong className="text-white">"{selectedCategory}"</strong>.</>
              )}
            </p>
            <button
              onClick={() => {
                setSelectedCategory("Todas");
                setSelectedPresentation("todos");
                setSearchQuery("");
              }}
              className="bg-white text-black px-6 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-neutral-200 transition-all rounded-xs cursor-pointer shadow-md"
            >
              Ver Todas las Piezas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const imageList = product.images ? product.images.split(",").map((img) => img.trim()) : [];
              const mainImage = imageList[0] || null;

              return (
                <div
                  key={product.id}
                  className="group bg-[#111116] border border-white/10 hover:border-white/25 p-2 sm:p-3 md:p-4.5 rounded-xl transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:-translate-y-1 flex flex-col justify-between relative"
                >
                  <div>
                    {/* ENLACE Y FOTO DEL PRODUCTO */}
                    <Link href={`/product/${product.slug}`} className="block">
                      <div className="aspect-[3/4] bg-[#16161f] mb-2 sm:mb-3 flex items-center justify-center relative overflow-hidden rounded-lg border border-white/5 group-hover:border-white/20 transition-colors cursor-pointer p-2 sm:p-3">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-neutral-600 gap-1">
                            <span className="text-2xl opacity-40">💎</span>
                            <span className="text-[8px] md:text-xs uppercase tracking-[0.3em] font-serif">[ NERKLEY ]</span>
                          </div>
                        )}

                        {/* Insignia COMBO destacada sobre la foto */}
                        {isProductCombo(product) && (
                          <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black text-[7.5px] md:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-[0_2px_10px_rgba(232,198,98,0.5)] z-10 pointer-events-none flex items-center gap-1">
                            <span>🎁</span> COMBO
                          </div>
                        )}

                        {/* Descuento si aplica */}
                        {product.discount_percent && product.discount_percent > 0 ? (
                          <div className={`absolute ${isProductCombo(product) ? "top-7 left-2 md:top-8 md:left-2.5" : "top-2 left-2 md:top-2.5 md:left-2.5"} bg-red-600 text-white text-[7.5px] md:text-[9px] font-bold uppercase tracking-wider px-1.5 md:px-2 py-0.5 rounded shadow-md z-10 pointer-events-none`}>
                            -{product.discount_percent}%
                          </div>
                        ) : null}

                        {/* Estado de stock */}
                        <div className="absolute top-2 right-2 md:top-2.5 md:right-2.5 bg-black/80 backdrop-blur-md text-neutral-300 border border-white/10 text-[7px] md:text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold z-10 pointer-events-none">
                          {product.stock && product.stock <= 3 ? "¡Últimas!" : "Stock"}
                        </div>
                      </div>
                    </Link>

                    {/* Categoría y Badges dinámicos desde el Administrador */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                      {product.category && (
                        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-neutral-400 font-semibold block truncate">
                          {product.category}
                        </span>
                      )}

                      {/* BADGE COMBO */}
                      {isProductCombo(product) && (
                        <span className="bg-gradient-to-r from-amber-500/25 to-amber-600/15 border border-amber-400/50 text-amber-300 text-[7px] md:text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          🎁 COMBO
                        </span>
                      )}
                      
                      {product.badge && extractDisplayBadge(product.badge) !== "" && (
                        <span className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/40 text-amber-300 text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-xs animate-pulse">
                          ✨ {extractDisplayBadge(product.badge)}
                        </span>
                      )}

                      {hasFreeShipping(product) && (
                        <span className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-xs">
                          🚚 Envío Gratis
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-white mb-1 md:mb-1.5 line-clamp-none min-h-[2.4rem] md:min-h-[2.6rem] leading-snug hover:text-amber-200 transition-colors cursor-pointer">
                        {product.name}
                      </h3>
                    </Link>
                  </div>

                  {/* PRECIO Y ACCIONES */}
                  <div className="pt-2 sm:pt-3 border-t border-white/10 flex flex-col justify-between mt-2 gap-2">
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

                    <div className="grid grid-cols-[1fr_auto] gap-1.5 sm:gap-2 items-center">
                      <Link
                        href={`/product/${product.slug}`}
                        className="bg-transparent border border-white/20 text-white py-1.5 sm:py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-white hover:text-black hover:border-white transition-all text-center flex items-center justify-center cursor-pointer rounded-xs shadow-sm"
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
                        className="bg-white text-black p-2 sm:p-2.5 hover:bg-neutral-200 transition-all flex items-center justify-center shadow-lg active:scale-90 group/btn cursor-pointer font-bold rounded-xs"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* SECCIÓN DETALLADA DE PROTOCOLOS & GARANTÍAS (AL FINAL PARA MÁXIMA CONFIANZA ANTES DE COMPRAR) */}
      <section className="border-t border-white/10 bg-[#0c0c10] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-semibold block mb-1">
              Seguridad & Respaldo Oficial
            </span>
            <h3 className="text-lg sm:text-2xl font-serif text-white uppercase tracking-wider">
              Por qué comprar en NERKLEY
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => openWarrantyModal("warranty")}
              className="group text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🛡️
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-white group-hover:text-amber-300 transition-colors">
                  Calidad Seleccionada
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Artículos originales, batch codes y acabados premium verificados individualmente.
                </p>
                <span className="text-[9px] uppercase tracking-widest text-amber-400/90 font-semibold mt-2 block">
                  Ver protocolo &rarr;
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("shipping")}
              className="group text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🚚
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-white group-hover:text-amber-300 transition-colors">
                  Envíos a Toda Colombia
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Tarifa fija de $15.000 COP o Envío Gratis según la promoción activa con guía oficial.
                </p>
                <span className="text-[9px] uppercase tracking-widest text-amber-400/90 font-semibold mt-2 block">
                  Ver detalles de envío &rarr;
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("payments")}
              className="group text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                💳
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-white group-hover:text-amber-300 transition-colors">
                  Pagos Blindados Wompi
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Nequi, Bancolombia, PSE y Tarjetas con cifrado bancario seguro SHA-256.
                </p>
                <span className="text-[9px] uppercase tracking-widest text-amber-400/90 font-semibold mt-2 block">
                  Ver pasarela segura &rarr;
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWarrantyModal("returns")}
              className="group text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-start gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                🔄
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-white group-hover:text-amber-300 transition-colors">
                  Cambios & Garantía
                </h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Póliza de transporte y cambios directos ante cualquier anomalía o defecto.
                </p>
                <span className="text-[9px] uppercase tracking-widest text-amber-400/90 font-semibold mt-2 block">
                  Ver políticas completas &rarr;
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="relative z-10 mt-auto bg-[#070709] border-t border-white/10 py-10 md:py-14 px-4 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-[#111115] border border-amber-400/30 flex items-center justify-center p-1.5 mb-2.5 shadow-[0_0_15px_rgba(232,198,98,0.15)]">
            <img src="/logo-app.svg" alt="NERKLEY Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl md:text-2xl font-serif font-bold tracking-[0.35em] uppercase mb-1.5 text-white">NERKLEY</span>
          <p className="text-[10px] md:text-xs text-neutral-400 font-light mb-4">
            Online Store Oficial &bull; Perfumería, Calzado, Joyería & Streetwear.
          </p>
          <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest text-neutral-500 mb-5 font-medium">
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
          <div className="flex items-center justify-center gap-4 text-[9px] uppercase tracking-wider text-neutral-500 mb-3">
            <Link href="/privacidad" className="hover:text-amber-400 transition-colors">Política de Privacidad</Link>
            <span>&bull;</span>
            <button onClick={() => openWarrantyModal("shipping")} className="hover:text-amber-400 transition-colors cursor-pointer">Garantías & Envíos</button>
          </div>
          <p className="text-[8px] md:text-[9px] text-neutral-600 uppercase tracking-[0.2em]">
            &copy; 2026 NERKLEY CONCEPTS. Todos los derechos reservados.
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

      {/* ASISTENTE VIRTUAL IA DE VENTAS 24/7 */}
      <AIChatSupport />
    </div>
  );
}
