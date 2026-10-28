"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import AIChatSupport from "@/components/AIChatSupport";
import ProductReviewsSection from "@/components/ProductReviewsSection";
import { getProductReviews } from "@/data/productReviews";
import { hasFreeShipping, calculateOrderMath, extractDisplayBadge, STANDARD_SHIPPING_COST } from "@/lib/shipping";

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
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

  const { addToCart, cartCount, setIsCartOpen, openWarrantyModal, isCartBouncing } = useCart();

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

        // --- ALGORITMO INTELIGENTE DE PRODUCTOS RELACIONADOS ---
        const { data: categoryData } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .eq("is_active", true)
          .neq("id", data.id)
          .limit(50); // Traemos hasta 50 para tener variedad de donde escoger

        if (categoryData && categoryData.length > 0) {
          // 1. Extraer palabras clave del producto actual ignorando palabras genéricas
          const stopWords = ["perfume", "locion", "para", "hombre", "mujer", "unisex", "the", "and", "del", "con"];
          const keywords = data.name
            .toLowerCase()
            .split(" ")
            .filter((w: string) => w.length > 2 && !stopWords.includes(w));

          // 2. Dar una puntuación a cada producto basándose en el nombre
          const scoredProducts = categoryData.map((p: Product) => {
            let score = 0;
            const pName = p.name.toLowerCase();
            
            // Si comparten palabras clave (ej: misma marca), sube la prioridad
            keywords.forEach((kw: string) => {
              if (pName.includes(kw)) score += 10; 
            });

            // Agregamos un número aleatorio decimal para desempatar y variar
            score += Math.random(); 

            return { product: p, score };
          });

          // 3. Ordenar de mayor a menor puntuación
          scoredProducts.sort((a: any, b: any) => b.score - a.score);

          // 4. Tomar los 4 mejores y mezclarlos al azar para que sus posiciones varíen
          const top4 = scoredProducts
            .slice(0, 4)
            .map((s: any) => s.product)
            .sort(() => 0.5 - Math.random());

          setRelatedProducts(top4);
        }
      }
      setLoading(false);
    }

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    setIsAddedSuccess(true);
    setTimeout(() => setIsAddedSuccess(false), 2000);
    if (!product) return;

    const sizeList = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const colorList = product.colors ? product.colors.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const reviewData = getProductReviews(product.name, product.category, product.slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nerkley-m4t2.vercel.app";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: imageList.length > 0 ? imageList[0] : undefined,
    description: product.description || `Comprar ${product.name} en NERKLEY Luxury Store Colombia con garantía de autenticidad y envío asegurado.`,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "NERKLEY",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "COP",
      price: product.sale_price,
      priceValidUntil: "2027-12-31",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "NERKLEY",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: reviewData.averageRating,
      reviewCount: reviewData.totalReviews,
      bestRating: "5",
      worstRating: "1",
    },
  };

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
      free_shipping: hasFreeShipping(product),
    });

    setIsCartOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111115] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
        Cargando detalles de NERKLEY...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#111115] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-serif uppercase tracking-wider mb-4">Producto No Encontrado</h2>
        <Link href="/" className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const imageList = product.images ? product.images.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const sizeList = product.sizes ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const colorList = product.colors ? product.colors.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const reviewData = getProductReviews(product.name, product.category, product.slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nerkley-m4t2.vercel.app";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: imageList.length > 0 ? imageList[0] : undefined,
    description: product.description || `Comprar ${product.name} en NERKLEY Luxury Store Colombia con garantía de autenticidad y envío asegurado.`,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "NERKLEY",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "COP",
      price: product.sale_price,
      priceValidUntil: "2027-12-31",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "NERKLEY",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: reviewData.averageRating,
      reviewCount: reviewData.totalReviews,
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col selection:bg-white selection:text-black">
      {/* Schema.org Rich Snippet para posicionamiento en Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <header className="border-b border-white/10 bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex justify-between items-center gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#111115] border border-amber-400/30 flex items-center justify-center p-1 group-hover:scale-105 transition-all">
              <img src="/logo.svg" alt="NERKLEY" className="w-full h-full object-contain" />
            </div>
            <span className="text-base sm:text-2xl font-serif font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase">NERKLEY</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white px-2 py-1">
              &larr; <span className="hidden sm:inline">Tienda</span>
            </Link>
            <button 
              type="button"
              onClick={() => openWarrantyModal("shipping")}
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer hidden md:block"
            >
              Garantía & Envíos
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative bg-white text-black px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all duration-300 shadow-md active:scale-95 cursor-pointer font-bold flex items-center gap-1.5 shrink-0 rounded-sm ${
                isCartBouncing ? "scale-110 ring-2 ring-amber-400 bg-amber-400 text-black shadow-[0_0_20px_rgba(232,198,98,0.7)]" : ""
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Carrito</span>
              {cartCount > 0 && (
                <span className="bg-amber-500 text-black text-[9px] sm:text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center border border-black shrink-0">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3 sm:py-6 lg:py-12 w-full flex-1 pb-24 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-14 items-start">
          <div className="space-y-4">
            <div className="aspect-square sm:aspect-[4/5] lg:aspect-[3/4] max-h-[300px] sm:max-h-[420px] lg:max-h-none bg-[#111115] border border-white/10 flex items-center justify-center relative overflow-hidden shadow-sm p-3 sm:p-4">
              {selectedImage ? (
                <img src={selectedImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl font-serif text-neutral-600 uppercase tracking-[0.4em]">
                  [ NERKLEY ]
                </span>
              )}

              {/* Etiqueta Destacada y Envío Gratis */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                {product.badge && extractDisplayBadge(product.badge) !== "" && (
                  <div className="bg-amber-500/15 border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-lg animate-pulse border border-white/20">
                    ✨ {extractDisplayBadge(product.badge)}
                  </div>
                )}
                {hasFreeShipping(product) && (
                  <div className="bg-emerald-500/20 border-emerald-400/50 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-lg border">
                    🚚 Envío Gratis
                  </div>
                )}
              </div>

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
                    className={`w-14 h-16 sm:w-18 sm:h-20 lg:w-20 lg:h-24 border-2 transition-all flex-shrink-0 bg-[#111115] overflow-hidden cursor-pointer p-1 ${
                      selectedImage === imgUrl ? "border-white scale-105" : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#111115] p-3.5 sm:p-6 lg:p-8 border border-white/10 shadow-sm space-y-3 sm:space-y-4 lg:space-y-5">
            <div>
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neutral-400 font-semibold block mb-1">
                {product.category || "Edición Exclusiva"}
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif uppercase tracking-wider text-white font-semibold mb-1.5">
                {product.name}
              </h1>

              {/* Píldora de Calificación y Reseñas Verificadas */}
              <div
                onClick={() => {
                  const el = document.getElementById("reviews-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 mb-2.5 sm:mb-3.5 cursor-pointer group w-fit"
              >
                <div className="flex text-amber-400 text-xs">
                  {"★★★★★"}
                </div>
                <span className="text-[11px] text-neutral-300 font-medium group-hover:text-amber-300 transition-colors underline decoration-white/20">
                  {(() => { const s = getProductReviews(product.name, product.category, product.slug); return `${s.averageRating} / 5.0 (${s.totalReviews} valoraciones)`; })()}
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                  Disponibilidad Exclusiva
                </span>
              </div>

              <div className="flex items-baseline gap-2.5 sm:gap-3 mb-2.5 sm:mb-3.5">
                {product.discount_percent && product.discount_percent > 0 && product.original_price ? (
                  <span className="text-base line-through text-neutral-400 font-light">
                    $ {Number(product.original_price).toLocaleString()} COP
                  </span>
                ) : null}
                <p className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                  $ {Number(product.sale_price).toLocaleString()} <span className="text-xs text-neutral-400 font-normal">COP</span>
                </p>
              </div>

              <div className="border-t border-white/10 pt-2.5 mt-1">
                <p className="text-[11px] sm:text-xs text-neutral-300 leading-relaxed font-normal bg-white/[0.03] p-2.5 sm:p-3 border border-white/5 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer" title="Toca para leer completa">
                  {product.description || "Sin descripción registrada para este producto."}
                </p>
              </div>
            </div>

            {sizeList.length > 0 && (
              <div className="border-t border-white/10 pt-3 sm:pt-4">
                <label className="block text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-white mb-1.5 sm:mb-2.5">
                  Seleccionar Talla *
                </label>
                <div className="flex flex-wrap gap-3">
                  {sizeList.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                        selectedSize === size
                          ? "bg-white text-black border-white shadow-md"
                          : "bg-[#111115] border-white/15 text-neutral-300 hover:border-white"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colorList.length > 0 && (
              <div className="border-t border-white/10 pt-3 sm:pt-4">
                <label className="block text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-white mb-1.5 sm:mb-2.5">
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
                          ? "bg-white text-black border-white shadow-md"
                          : "bg-[#111115] border-white/15 text-neutral-300 hover:border-white"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-3 sm:pt-4">
              <label className="block text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-white mb-1.5 sm:mb-2">
                Cantidad *
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-white/15 bg-[#111115]">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-neutral-300 hover:bg-white/10 font-bold cursor-pointer"
                  >-</button>
                  <span className="px-6 text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(product.stock, prev + 1))}
                    className="px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/10 font-bold cursor-pointer"
                  >+</button>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${product.stock > 0 ? 'text-emerald-400' : 'text-red-600'}`}>
                  {product.stock > 0 ? `${product.stock} disponibles en stock` : 'Agotado'}
                </span>
              </div>
            </div>

            {/* INFORMACIÓN Y DESGLOSE TRANSPARENTE DE ENVÍO */}
            {(() => {
              const isFree = hasFreeShipping(product);
              const math = calculateOrderMath({
                salePrice: product.sale_price,
                originalPrice: product.original_price,
                quantity,
                isFreeShipping: isFree,
              });

              return (
                <div className="border-t border-white/10 pt-6 space-y-4">
                  {/* Tarjeta de Envío */}
                  <div className="bg-[#0b0b0f] p-3.5 border border-white/10 rounded-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📦</span>
                        <span className="text-xs uppercase tracking-wider font-bold text-white">
                          Envío Asegurado (Colombia)
                        </span>
                      </div>
                      {isFree ? (
                        <span className="bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                          Promoción: Envío Gratis ✨
                        </span>
                      ) : (
                        <span className="text-amber-300 font-mono font-bold text-xs">
                          $ {math.standardShippingCost.toLocaleString()} COP
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight">
                      {isFree
                        ? "¡Aprovecha esta promoción! Envío 100% gratuito asegurado a cualquier ciudad o municipio del país."
                        : "Tarifa fija de $15.000 COP con cobertura y póliza de entrega en toda Colombia."}
                    </p>
                  </div>

                  {/* DESGLOSE MATEMÁTICO COMPLETO */}
                  <div className="bg-[#0b0b0f] border border-white/10 p-4 rounded-xs space-y-2 text-xs">
                    <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                      <span>Precio por pieza:</span>
                      <span className="font-mono text-neutral-200">$ {Number(product.sale_price).toLocaleString()} COP</span>
                    </div>

                    {quantity > 1 && (
                      <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                        <span>Subtotal piezas ({quantity}):</span>
                        <span className="font-mono text-neutral-200">$ {math.totalSalePrice.toLocaleString()} COP</span>
                      </div>
                    )}

                    {math.productDiscountSavings > 0 && (
                      <div className="flex justify-between items-center text-emerald-400 text-[11px] font-medium">
                        <span>Ahorro por descuento en producto:</span>
                        <span className="font-mono">- $ {math.productDiscountSavings.toLocaleString()} COP</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-white/5">
                      <span className="text-neutral-300">Costo de Envío:</span>
                      {isFree ? (
                        <span className="text-emerald-400 font-bold font-mono">
                          GRATIS <span className="text-[10px] line-through text-neutral-500 font-normal">($ {math.standardShippingCost.toLocaleString()})</span>
                        </span>
                      ) : (
                        <span className="text-neutral-200 font-semibold font-mono">
                          + $ {math.shippingCost.toLocaleString()} COP
                        </span>
                      )}
                    </div>

                    {/* TOTAL NETO A PAGAR */}
                    <div className="pt-2.5 border-t border-white/15 flex justify-between items-baseline">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-bold text-white block">
                          Total a Pagar:
                        </span>
                        <span className="text-[10px] text-neutral-400 font-light">
                          (Pieza + Envío incluido)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-white tracking-tight font-mono">
                          $ {math.totalToPay.toLocaleString()}{" "}
                          <span className="text-xs text-neutral-400 font-normal">COP</span>
                        </span>
                      </div>
                    </div>

                    {/* RESUMEN DE AHORRO TOTAL */}
                    {math.totalSavings > 0 && (
                      <div className="bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-emerald-500/15 border border-emerald-500/30 p-2.5 rounded-xs text-center mt-2.5">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                          🎉 ¡Estás ahorrando $ {math.totalSavings.toLocaleString()} COP en total hoy!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-white/10 pt-3.5 sm:pt-5">
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="w-full bg-white text-black py-3 sm:py-3.5 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {product.stock <= 0 ? "Producto Agotado" : isAddedSuccess ? "¡Agregado al Carrito! ✓" : "Añadir al Carrito & Pagar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-ai-chat"));
                  }
                }}
                className="w-full mt-2.5 bg-gradient-to-r from-[#D4AF37]/10 via-[#F3E5AB]/10 to-[#D4AF37]/10 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#E5C158] hover:text-white py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <svg className="w-4 h-4 text-[#E5C158] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                ¿Dudas? Preguntar a la IA sobre este producto
              </button>
            </div>
          </div>
        </div>

      {/* BARRA FLOTANTE FIJA INFERIOR TIPO APP DE ALTA GAMA (SOLO CELULAR) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e12]/95 backdrop-blur-xl border-t border-white/15 p-2.5 px-4 md:hidden flex items-center justify-between gap-3 shadow-[0_-10px_25px_rgba(0,0,0,0.8)]">
        <div className="min-w-0">
          <span className="text-[9px] uppercase tracking-wider text-neutral-400 block truncate">
            Total {hasFreeShipping(product) ? "• Envío Gratis ✨" : "+ Envío"}
          </span>
          <span className="text-base font-bold text-white font-mono tracking-tight block">
            $ {calculateOrderMath({ salePrice: product.sale_price, originalPrice: product.original_price, quantity, isFreeShipping: hasFreeShipping(product) }).totalToPay.toLocaleString()}{" "}
            <span className="text-[9px] text-neutral-400 font-normal">COP</span>
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className="bg-white text-black px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 rounded-xs flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{product.stock <= 0 ? "Agotado" : isAddedSuccess ? "¡Añadido! ✓" : "Comprar"}</span>
        </button>
      </div>
      </main>

      {/* SECCIÓN DINÁMICA DE RESEÑAS Y OPINIONES VERIFICADAS */}
      <ProductReviewsSection
        productName={product.name}
        productCategory={product.category}
        productSlug={product.slug}
      />

      {/* SECCIÓN DE PRODUCTOS RELACIONADOS (INTELIGENTE Y ALEATORIA) */}
      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12 w-full border-t border-white/10 mt-8">
          <h3 className="text-xl md:text-2xl font-serif font-light uppercase tracking-wider text-white mb-8 text-center md:text-left">
            También te podría interesar
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
            {relatedProducts.map((rp) => {
              const rpImage = rp.images ? rp.images.split(",")[0].trim() : null;
              return (
                <div key={rp.id} className="group bg-[#111115] border border-white/10 p-2 md:p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between relative">
                  <div>
                    <Link href={`/product/${rp.slug}`} className="block">
                      <div className="aspect-[3/4] bg-[#111115] mb-2 md:mb-4 flex items-center justify-center relative overflow-hidden border border-white/5 group-hover:border-white/30 transition-colors cursor-pointer p-2">
                        {rpImage ? (
                          <img src={rpImage} alt={rp.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <span className="text-[8px] md:text-xs text-neutral-600 uppercase tracking-[0.3em] font-serif">[ NERKLEY ]</span>
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
                        <span className="bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[7px] md:text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 animate-pulse rounded-sm">
                          ✨ {rp.badge}
                        </span>
                      )}
                    </div>
                    
                    <Link href={`/product/${rp.slug}`}>
                      <h4 className="text-[11px] md:text-sm font-serif uppercase tracking-wider font-semibold text-white mb-1 md:mb-2 line-clamp-1 hover:underline cursor-pointer">
                        {rp.name}
                      </h4>
                    </Link>
                  </div>

                  <div className="pt-2 md:pt-4 border-t border-white/5 flex flex-col justify-between mt-2 md:mt-4 gap-2">
                    <div>
                      {rp.discount_percent && rp.discount_percent > 0 && rp.original_price ? (
                        <span className="text-[9px] md:text-[11px] line-through text-neutral-400 block font-light">
                          $ {Number(rp.original_price).toLocaleString()}
                        </span>
                      ) : null}
                      <p className="text-xs md:text-base font-bold text-white tracking-tight">
                        $ {Number(rp.sale_price).toLocaleString()} <span className="text-[8px] md:text-[10px] font-normal text-neutral-400">COP</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-1 items-center">
                      <Link
                        href={`/product/${rp.slug}`}
                        className="bg-white/10 text-white py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-semibold hover:bg-white/20 transition-all text-center flex items-center justify-center cursor-pointer"
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
                        className="bg-white text-black p-2.5 hover:bg-neutral-200 transition-all flex items-center justify-center rounded shadow-sm active:scale-90 group/btn cursor-pointer"
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

      <AIChatSupport currentProduct={product || undefined} />
      <footer className="border-t border-white/10 py-8 text-center text-xs text-neutral-400 uppercase tracking-widest bg-[#111115] mt-auto">
        &copy; 2026 NERKLEY STORES. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#111115] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
        Cargando entorno de NERKLEY...
      </div>
    }>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}