"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

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
}

function ProductDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const { addToCart, cartCount, setIsCartOpen } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Error de Supabase:", error.message);
      }

      if (data) {
        setProduct(data);
        if (data.images) {
          const imgList = data.images.split(",").map((s: string) => s.trim());
          if (imgList.length > 0) setSelectedImage(imgList[0]);
        }
        if (data.sizes) {
          const sizeList = data.sizes.split(",").map((s: string) => s.trim());
          if (sizeList.length > 0) setSelectedSize(sizeList[0]);
        }
        if (data.colors) {
          const colorList = data.colors.split(",").map((s: string) => s.trim());
          if (colorList.length > 0) setSelectedColor(colorList[0]);
        }

        // Cargar productos relacionados de la misma categoría
        const { data: relatedData } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .eq("is_active", true)
          .neq("id", data.id)
          .limit(4);

        if (relatedData) {
          setRelatedProducts(relatedData);
        }
      }
      setLoading(false);
    }

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;

    const sizeList = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const colorList = product.colors ? product.colors.split(",").map((s) => s.trim()).filter(Boolean) : [];

    if (sizeList.length > 0 && !selectedSize) {
      alert("Por favor, selecciona una talla antes de añadir al carrito.");
      return;
    }
    if (colorList.length > 0 && !selectedColor) {
      alert("Por favor, selecciona un color antes de añadir al carrito.");
      return;
    }

    if (product.stock <= 0) {
      alert("Lo sentimos, este producto se encuentra agotado.");
      return;
    }

    if (quantity > product.stock) {
      alert(`Solo hay ${product.stock} unidades disponibles.`);
      return;
    }

    const firstImage = product.images ? product.images.split(",")[0].trim() : null;

    addToCart({
      id: `${product.id}-${selectedSize || 'u'}-${selectedColor || 'u'}`,
      product_id: product.id,
      name: product.name,
      price: product.sale_price,
      image: selectedImage || firstImage,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      quantity: quantity,
      maxStock: product.stock,
    });

    setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
        Cargando detalles de NERKLEY...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-serif uppercase tracking-wider mb-4">Producto No Encontrado</h2>
        <Link href="/" className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const imageList = product.images ? product.images.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const sizeList = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const colorList = product.colors ? product.colors.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans flex flex-col selection:bg-black selection:text-white">
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-bold tracking-[0.3em] uppercase">NERKLEY</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black">
              &larr; Tienda
            </Link>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative bg-black text-white px-5 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Carrito
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-white border border-neutral-200 flex items-center justify-center relative overflow-hidden shadow-sm p-4">
              {selectedImage ? (
                <img src={selectedImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl font-serif text-neutral-300 uppercase tracking-[0.4em]">
                  [ NERKLEY ]
                </span>
              )}

              {/* Etiqueta Destacada */}
              {product.badge && product.badge.trim() !== "" && (
                <div className="absolute top-4 right-4 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-lg z-10 animate-pulse border border-neutral-700">
                  ✨ {product.badge}
                </div>
              )}

              {product.discount_percent && product.discount_percent > 0 ? (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 shadow-md">
                  -{product.discount_percent}% OFF
                </div>
              ) : null}
            </div>

            {imageList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {imageList.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`w-20 h-24 border-2 transition-all flex-shrink-0 bg-white overflow-hidden cursor-pointer p-1 ${
                      selectedImage === imgUrl ? "border-black scale-105" : "border-neutral-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-8 border border-neutral-200 shadow-sm space-y-6">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-semibold block mb-2">
                {product.category || "Edición Exclusiva"}
              </span>
              <h1 className="text-3xl font-serif uppercase tracking-wider text-neutral-900 font-semibold mb-3">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 mb-4">
                {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                  <span className="text-base line-through text-neutral-400 font-light">
                    $ {Number(product.original_price).toLocaleString()} COP
                  </span>
                ) : null}
                <p className="text-2xl font-bold text-neutral-900 tracking-tight">
                  $ {Number(product.sale_price).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">COP</span>
                </p>
              </div>

              <div className="border-t border-neutral-200 pt-4 mt-2">
                <p className="text-xs text-neutral-800 leading-relaxed font-medium bg-neutral-50 p-3 border border-neutral-200">
                  {product.description || "Sin descripción registrada para este producto."}
                </p>
              </div>
            </div>

            {sizeList.length > 0 && (
              <div className="border-t border-neutral-200 pt-6">
                <label className="block text-xs uppercase tracking-widest font-semibold text-neutral-900 mb-3">
                  Seleccionar Talla *
                </label>
                <div className="flex flex-wrap gap-3">
                  {sizeList.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                        selectedSize === size
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white border-neutral-300 text-neutral-700 hover:border-black"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorList.length > 0 && (
              <div className="border-t border-neutral-200 pt-6">
                <label className="block text-xs uppercase tracking-widest font-semibold text-neutral-900 mb-3">
                  Seleccionar Color *
                </label>
                <div className="flex flex-wrap gap-3">
                  {colorList.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                        selectedColor === color
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white border-neutral-300 text-neutral-700 hover:border-black"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-neutral-200 pt-6">
              <label className="block text-xs uppercase tracking-widest font-semibold text-neutral-900 mb-3">
                Cantidad *
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-neutral-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 font-bold cursor-pointer"
                  >-</button>
                  <span className="px-6 text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(product.stock, prev + 1))}
                    className="px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 font-bold cursor-pointer"
                  >+</button>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${product.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {product.stock > 0 ? `${product.stock} disponibles en stock` : 'Agotado'}
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full bg-black text-white py-4 text-xs font-semibold uppercase tracking-[0.25em] hover:bg-neutral-800 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {product.stock > 0 ? "Añadir al Carrito & Pagar" : "Producto Agotado"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* SECCIÓN DE PRODUCTOS RELACIONADOS */}
      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12 w-full border-t border-neutral-200/80 mt-8">
          <h3 className="text-xl md:text-2xl font-serif font-light uppercase tracking-wider text-neutral-900 mb-8 text-center md:text-left">
            También te podría interesar
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
            {relatedProducts.map((rp) => {
              const rpImage = rp.images ? rp.images.split(",")[0].trim() : null;
              return (
                <div key={rp.id} className="group bg-white border border-neutral-200/80 p-2 md:p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between relative">
                  <div>
                    <Link href={`/product/${rp.slug}`} className="block">
                      <div className="aspect-[3/4] bg-white mb-2 md:mb-4 flex items-center justify-center relative overflow-hidden border border-neutral-100 group-hover:border-neutral-300 transition-colors cursor-pointer p-2">
                        {rpImage ? (
                          <img src={rpImage} alt={rp.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <span className="text-[8px] md:text-xs text-neutral-300 uppercase tracking-[0.3em] font-serif">[ NERKLEY ]</span>
                        )}
                        {rp.discount_percent && rp.discount_percent > 0 ? (
                          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-red-600 text-white text-[8px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 md:px-2 py-0.5 md:py-1 shadow-md z-10 pointer-events-none">
                            -{rp.discount_percent}%
                          </div>
                        ) : null}
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 mb-1 md:mb-1.5">
                      {rp.category && (
                        <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-semibold block truncate">
                          {rp.category}
                        </span>
                      )}
                      {rp.badge && rp.badge.trim() !== "" && (
                        <span className="bg-black text-white text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 animate-pulse rounded-sm">
                          ✨ {rp.badge}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/product/${rp.slug}`}>
                      <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-neutral-900 mb-1 md:mb-2 line-clamp-1 hover:underline cursor-pointer">
                        {rp.name}
                      </h4>
                    </Link>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-neutral-100 flex flex-col justify-between mt-2 md:mt-4 gap-2">
                    <div>
                      {rp.discount_percent && rp.discount_percent > 0 && rp.original_price ? (
                        <span className="text-[9px] md:text-[11px] line-through text-neutral-400 block font-light">
                          $ {Number(rp.original_price).toLocaleString()}
                        </span>
                      ) : null}
                      <p className="text-xs md:text-base font-bold text-neutral-900 tracking-tight">
                        $ {Number(rp.sale_price).toLocaleString()} <span className="text-[8px] md:text-[10px] font-normal text-neutral-400">COP</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-1 items-center">
                      <Link
                        href={`/product/${rp.slug}`}
                        className="bg-neutral-100 text-neutral-900 py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-200 transition-all text-center flex items-center justify-center cursor-pointer"
                      >
                        Detalles
                      </Link>
                      <button
                        onClick={() => {
                          addToCart({
                            id: rp.id,
                            product_id: rp.id,
                            name: rp.name,
                            price: rp.sale_price,
                            image: rpImage,
                            quantity: 1,
                            maxStock: rp.stock || 10,
                          });
                        }}
                        title="Agregar al carrito"
                        className="bg-black text-white p-2.5 hover:bg-neutral-800 transition-all flex items-center justify-center rounded shadow-sm active:scale-90 group/btn cursor-pointer"
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
        </section>
      )}

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400 uppercase tracking-widest bg-white mt-auto">
        &copy; {new Date().getFullYear()} NERKLEY STORES. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
        Cargando entorno de NERKLEY...
      </div>
    }>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}