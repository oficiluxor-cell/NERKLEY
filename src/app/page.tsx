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
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const { cartCount, setIsCartOpen, addToCart } = useCart();

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

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col">
      <div className="bg-black text-white text-[11px] uppercase tracking-[0.2em] py-2.5 text-center font-medium shadow-inner">
        Envíos Express a todo el país &bull; Ofertas Exclusivas de Temporada
      </div>

      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 shadow-sm">
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
              <span className="text-[7px] md:text-[9px] uppercase tracking-[0.35em] text-neutral-400 font-sans mt-0.5">
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

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-black text-white px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md active:scale-95"
          >
            Carrito
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] md:text-[11px] font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
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

      <section id="catalogo" className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 border-b border-neutral-200/80 pb-6 gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-serif font-light uppercase tracking-wider text-neutral-900">
              Catálogo
            </h3>
            <p className="text-[10px] md:text-xs text-neutral-400 mt-1 md:mt-2 tracking-wide">
              {filteredProducts.length} {filteredProducts.length === 1 ? "producto" : "productos"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full bg-white border border-neutral-300 px-3 md:px-4 py-2 md:py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-black tracking-wider"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-sm font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("Todas")}
                className={`px-3 py-2 md:px-4 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all font-semibold ${
                  selectedCategory === "Todas"
                    ? "bg-black text-white shadow-md"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:border-black"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 md:px-4 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all font-semibold ${
                    selectedCategory === cat
                      ? "bg-black text-white shadow-md"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:border-black"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[10px] md:text-xs text-neutral-400 uppercase tracking-[0.3em] animate-pulse">
            Cargando inventario NERKLEY...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 md:px-6 border border-dashed border-neutral-300 bg-white max-w-xl mx-auto shadow-sm">
            <span className="text-2xl md:text-3xl block mb-3">🔍</span>
            <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-widest font-bold text-neutral-900 mb-2">
              Producto aún no integrado
            </h4>
            <p className="text-[10px] md:text-xs text-neutral-500 font-light leading-relaxed mb-6">
              No encontramos coincidencias para <strong className="text-neutral-900">"{searchQuery}"</strong>.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("Todas"); }}
              className="bg-black text-white px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-all"
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
                  className="group bg-white border border-neutral-200/80 p-2 md:p-5 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between relative"
                >
                  <div>
                    {/* Imagen clickeable para ir a detalles */}
                    <Link href={`/product/${product.slug}`}>
                      <div className="aspect-[3/4] bg-neutral-50 mb-2 md:mb-5 flex items-center justify-center relative overflow-hidden border border-neutral-100 group-hover:border-neutral-300 transition-colors cursor-pointer">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <span className="text-[8px] md:text-xs text-neutral-300 uppercase tracking-[0.3em] font-serif group-hover:scale-110 transition-transform duration-500">
                            [ NERKLEY ]
                          </span>
                        )}

                        {product.discount_percent && product.discount_percent > 0 ? (
                          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-red-600 text-white text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 md:px-2 py-0.5 md:py-1 shadow-md z-10">
                            -{product.discount_percent}%
                          </div>
                        ) : null}

                        <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black text-white text-[7px] md:text-[9px] uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 font-semibold z-10">
                          Stock
                        </div>
                      </div>
                    </Link>

                    {product.category && (
                      <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-semibold block truncate">
                        {product.category}
                      </span>
                    )}
                    
                    <Link href={`/product/${product.slug}`}>
                      <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-neutral-900 mt-1 md:mt-1 mb-1 md:mb-2 line-clamp-1 hover:underline">
                        {product.name}
                      </h4>
                    </Link>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-neutral-100 flex flex-col justify-between mt-2 md:mt-4 gap-2">
                    <div>
                      {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                        <span className="text-[9px] md:text-[11px] line-through text-neutral-400 block font-light">
                          $ {Number(product.original_price).toLocaleString()}
                        </span>
                      ) : null}
                      <p className="text-xs md:text-base font-bold text-neutral-900 tracking-tight">
                        $ {Number(product.sale_price).toLocaleString()} <span className="text-[8px] md:text-[10px] font-normal text-neutral-400">COP</span>
                      </p>
                    </div>

                    {/* BOTONES DE ACCIÓN: DETALLES + AGREGAR AL CARRITO */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Link
                        href={`/product/${product.slug}`}
                        className="bg-neutral-100 text-neutral-900 py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-200 transition-all text-center flex items-center justify-center"
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
                        className="bg-black text-white py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-all text-center flex items-center justify-center gap-1 shadow-sm active:scale-95"
                      >
                        <span>+ Carrito</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="mt-auto bg-white border-t border-neutral-200/80 py-10 md:py-12 px-4 md:px-6 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <span className="text-lg md:text-xl font-serif font-bold tracking-[0.3em] uppercase mb-2">NERKLEY</span>
          <p className="text-[10px] md:text-xs text-neutral-400 font-light mb-4 md:mb-6">Tu tienda en línea de confianza.</p>
          <p className="text-[8px] md:text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
            &copy; 2026 TIENDAS NERKLEY. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}