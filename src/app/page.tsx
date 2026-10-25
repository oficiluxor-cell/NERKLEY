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
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  const { cartCount, setIsCartOpen, setIsOrdersOpen, addToCart } = useCart();

  const [purchaseNotification, setPurchaseNotification] = useState<{ name: string, productName: string, image: string | null } | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`min-h-screen bg-[#F9F9F9] text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col relative overflow-hidden transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* ESTILOS NATIVOS PARA MARQUESINA Y FADE-IN */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 25s linear infinite;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* BARRA SUPERIOR - MARQUESINA INFINITA */}
      <div className="bg-black text-white text-[10px] md:text-[11px] uppercase tracking-[0.25em] py-3 font-semibold overflow-hidden relative z-50 flex whitespace-nowrap">
        <div className="animate-marquee">
          <span className="mx-8">🚀 ENVÍOS EXPRESS A TODO EL PAÍS</span>
          <span className="mx-8">·</span>
          <span className="mx-8">💳 PAGOS 100% SEGUROS CON WOMPI</span>
          <span className="mx-8">·</span>
          <span className="mx-8">🛡️ CALIDAD GARANTIZADA</span>
          <span className="mx-8">·</span>
          <span className="mx-8">✨ DESCUBRE TENDENCIAS EXCLUSIVAS</span>
          <span className="mx-8">·</span>
          {/* Duplicado para el bucle infinito */}
          <span className="mx-8">🚀 ENVÍOS EXPRESS A TODO EL PAÍS</span>
          <span className="mx-8">·</span>
          <span className="mx-8">💳 PAGOS 100% SEGUROS CON WOMPI</span>
          <span className="mx-8">·</span>
          <span className="mx-8">🛡️ CALIDAD GARANTIZADA</span>
          <span className="mx-8">·</span>
          <span className="mx-8">✨ DESCUBRE TENDENCIAS EXCLUSIVAS</span>
        </div>
      </div>

      <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-40 transition-all duration-500 border-b border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <svg
              className="w-8 h-8 md:w-10 md:h-10 text-black group-hover:rotate-90 transition-transform duration-700 ease-in-out"
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
            </svg>
            <div className="flex flex-col">
              <span className="text-2xl font-serif font-bold tracking-[0.3em] uppercase leading-none">
                NERKLEY
              </span>
            </div>
          </Link>

          <nav className="space-x-12 text-[10px] font-bold uppercase tracking-[0.25em] hidden md:flex text-neutral-500">
            <a href="#catalogo" className="hover:text-black transition-colors py-1 relative group">
              Catálogo
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-black transition-all duration-500 group-hover:w-full" />
            </a>
            <a href="#catalogo" className="hover:text-black transition-colors py-1 relative group">
              Exclusivos
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-black transition-all duration-500 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsOrdersOpen(true)}
              className="text-neutral-500 hover:text-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all font-bold cursor-pointer"
            >
              Pedidos
            </button>
            <div className="w-[1px] h-4 bg-neutral-300 hidden md:block"></div>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative text-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 cursor-pointer font-bold group"
            >
              <span className="group-hover:opacity-70 transition-opacity">Carrito</span>
              {cartCount > 0 && (
                <span className="absolute -top-3 -right-4 bg-black text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION - ESTILO EDITORIAL */}
      <section className="relative bg-neutral-950 text-white py-32 md:py-48 px-6 text-center overflow-hidden">
        {/* Efecto de luz sutil de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/40 via-neutral-950 to-neutral-950"></div>
        
        <div className="max-w-3xl mx-auto relative z-10 fade-in-up">
          <span className="inline-block text-[10px] uppercase tracking-[0.5em] text-neutral-400 font-semibold mb-6">
            Colección Oficial
          </span>
          <h2 className="text-5xl md:text-7xl font-serif font-light tracking-tight mb-8 uppercase text-white leading-tight">
            La Esencia de <br/> <span className="font-bold italic">Nerkley</span>
          </h2>
          <a
            href="#catalogo"
            className="inline-block bg-white text-black px-12 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-neutral-200 transition-colors duration-500"
          >
            Explorar Catálogo
          </a>
        </div>
      </section>

      <section id="catalogo" className="max-w-[1400px] mx-auto px-6 py-16 md:py-24 w-full relative z-10 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-neutral-200 pb-8 gap-6 fade-in-up">
          <div>
            <h3 className="text-3xl font-serif font-light uppercase tracking-widest text-neutral-900">
              Catálogo
            </h3>
            <p className="text-[10px] text-neutral-500 mt-2 tracking-[0.1em] font-medium uppercase">
              {filteredProducts.length} {filteredProducts.length === 1 ? "Artículo" : "Artículos"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar esencia..."
                className="w-full bg-transparent border-b border-neutral-300 px-2 py-3 text-xs text-neutral-900 focus:outline-none focus:border-black transition-colors tracking-widest placeholder:text-neutral-400"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategory("Todas")}
                className={`px-4 py-2 text-[9px] uppercase tracking-[0.25em] transition-all font-bold border-b-2 ${
                  selectedCategory === "Todas" ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-[9px] uppercase tracking-[0.25em] transition-all font-bold border-b-2 ${
                    selectedCategory === cat ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-32 text-[10px] text-neutral-400 uppercase tracking-[0.4em] animate-pulse font-bold">
            Preparando colección...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 px-6 max-w-xl mx-auto fade-in-up">
            <h4 className="text-[12px] font-serif uppercase tracking-[0.3em] font-bold text-neutral-900 mb-4">
              Sin Resultados
            </h4>
            <p className="text-[10px] text-neutral-500 font-light mb-8 tracking-widest">
              No hemos encontrado piezas para "{searchQuery}".
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("Todas"); }}
              className="bg-black text-white px-8 py-3 text-[9px] uppercase tracking-[0.3em] hover:bg-neutral-800 transition-colors"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
            {filteredProducts.map((product, index) => {
              const mainImage = product.images ? product.images.split(",")[0].trim() : null;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col relative fade-in-up bg-white p-4 transition-all duration-700 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Link href={`/product/${product.slug}`} className="block relative overflow-hidden bg-[#F2F2F2] aspect-[3/4] mb-5">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms] ease-out mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[8px] text-neutral-300 uppercase tracking-[0.4em] font-serif">NERKLEY</span>
                      </div>
                    )}

                    {product.discount_percent && product.discount_percent > 0 ? (
                      <div className="absolute top-4 left-4 bg-black text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 z-10">
                        -{product.discount_percent}%
                      </div>
                    ) : null}

                    {product.badge && product.badge.trim() !== "" && (
                      <div className="absolute bottom-4 left-4 bg-white text-black text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-1 z-10 shadow-sm">
                        {product.badge}
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-col flex-1">
                    {product.category && (
                      <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-400 font-bold mb-2 block">
                        {product.category}
                      </span>
                    )}
                    
                    <Link href={`/product/${product.slug}`}>
                      <h4 className="text-[13px] font-serif uppercase tracking-widest font-semibold text-neutral-900 mb-3 line-clamp-2 hover:text-neutral-500 transition-colors leading-relaxed">
                        {product.name}
                      </h4>
                    </Link>

                    <div className="mt-auto flex items-end justify-between pt-4 border-t border-neutral-100">
                      <div>
                        {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                          <span className="text-[10px] line-through text-neutral-400 block mb-1">
                            $ {Number(product.original_price).toLocaleString()}
                          </span>
                        ) : null}
                        <p className="text-sm font-bold text-neutral-900 tracking-wider">
                          $ {Number(product.sale_price).toLocaleString()} <span className="text-[9px] font-normal text-neutral-500">COP</span>
                        </p>
                      </div>

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
                        className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-neutral-800 transition-colors cursor-pointer group/btn rounded-none"
                      >
                        <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

      <footer className="bg-neutral-950 text-white py-16 px-6 text-center mt-auto">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <span className="text-2xl font-serif font-bold tracking-[0.4em] uppercase mb-6 block">NERKLEY</span>
          <p className="text-[10px] text-neutral-400 font-light mb-8 tracking-widest leading-loose">
            Redefiniendo la elegancia y el estilo. <br/> Tienda oficial para Colombia.
          </p>
          <div className="w-12 h-[1px] bg-neutral-800 mb-8"></div>
          <p className="text-[8px] text-neutral-500 uppercase tracking-[0.3em]">
            &copy; {new Date().getFullYear()} TIENDAS NERKLEY. Reservados todos los derechos.
          </p>
        </div>
      </footer>

      {/* NOTIFICACIÓN SOCIAL PROOF (MINIMALISTA) */}
      <div 
        className={`fixed bottom-6 left-6 z-50 bg-white border border-neutral-200 shadow-2xl p-4 flex items-center gap-4 transition-all duration-[800ms] max-w-sm ${showNotification ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}
      >
        <div className="w-12 h-12 bg-neutral-100 flex-shrink-0 flex items-center justify-center p-1">
          {purchaseNotification?.image ? (
            <img src={purchaseNotification.image} alt="" className="w-full h-full object-cover mix-blend-multiply" />
          ) : (
            <span className="text-[6px] uppercase font-serif text-neutral-400">Nerkley</span>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-neutral-900 uppercase tracking-wider">{purchaseNotification?.name}</span>
          </div>
          <p className="text-[10px] font-medium text-neutral-600 line-clamp-1 tracking-wide">
            Adquirió {purchaseNotification?.productName}
          </p>
          <span className="text-[8px] uppercase tracking-widest text-neutral-400 mt-1 block">Hace unos instantes</span>
        </div>
      </div>
    </div>
  );
}