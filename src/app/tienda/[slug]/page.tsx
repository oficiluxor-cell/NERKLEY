"use client";

import { useEffect, useState, use, useMemo, Suspense } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import {
  getSellerBySlug,
  getSellerProducts,
  getSellerStories,
  saveSellerStory,
  getFreshSellerSession,
  calculateOrderCommission,
  Seller,
  SellerStory,
} from "@/lib/marketplace";
import { supabase } from "@/lib/supabase";
import { buildFullCategory } from "@/lib/categories";
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

const STREETWEAR_CATEGORIES = [
  "Streetwear & Hoodies",
  "Baggy Jeans & Pantalones",
  "Sneakers & Footwear",
  "Camisetas & Tops Oversize",
  "Gorras, Beanies & Accesorios",
  "Chaquetas & Outerwear",
  "Perfumería & Fragancias",
  "Joyería & Relojería",
];

const SIZE_PRESETS = [
  "S", "M", "L", "XL", "XXL",
  "38", "39", "40", "41", "42", "43",
  "Talla Única",
];

const COLOR_PRESETS = [
  "Negro Lavado", "Blanco Tiza", "Gris Vintage", "Azul Denim", "Verde Militar", "Café Tierra", "Beige Arena",
];

const BADGE_PRESETS = [
  "🔥 Drop Limitado",
  "⭐ Top Ventas",
  "💎 Edición Baggy",
  "✨ Streetwear Exclusivo",
  "👑 Premium",
];

function toggleToken(current: string, token: string): string {
  const tokens = current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (tokens.includes(token)) {
    return tokens.filter((t) => t !== token).join(", ");
  } else {
    return [...tokens, token].join(", ");
  }
}

function BoutiqueProfileContent({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const rawSlug = resolvedParams?.slug || "";

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stories, setStories] = useState<SellerStory[]>([]);
  const [loading, setLoading] = useState(true);

  // Regla de Acceso del Vendedor (Self-View Rule)
  const [isOwner, setIsOwner] = useState(false);

  // Filtros internos del catálogo
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");

  // Estado del Visor de Historias (Stories Viewer estilo Instagram/Facebook)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  // Modales de Gestión de la Boutique
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  // Formulario del Publisher Dashboard (Carga de Productos / Streetwear)
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Streetwear & Hoodies");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdImages, setNewProdImages] = useState("");
  const [newProdSizes, setNewProdSizes] = useState("");
  const [newProdColors, setNewProdColors] = useState("");
  const [newProdBadge, setNewProdBadge] = useState("🔥 Drop Limitado");
  const [newProdFreeShipping, setNewProdFreeShipping] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Formulario para Subir Historias (Stories Publisher)
  const [storyImageUrl, setStoryImageUrl] = useState("");
  const [storyCaption, setStoryCaption] = useState("");
  const [storyLinkedSlug, setStoryLinkedSlug] = useState("");
  const [isPublishingStory, setIsPublishingStory] = useState(false);

  // Toast de notificación
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { addToCart, setIsCartOpen } = useCart();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

        // Historias por defecto si aún no tiene personalizadas
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

        // Regla de Acceso del Vendedor: verificar si quien entra es el dueño autenticado
        try {
          const session = await getFreshSellerSession();
          if (session) {
            const isMatch =
              session.id === sellerData.id ||
              (session.slug && sellerData.slug && session.slug.toLowerCase() === sellerData.slug.toLowerCase()) ||
              (session.store_name && sellerData.store_name && session.store_name.toLowerCase().trim() === sellerData.store_name.toLowerCase().trim());
            setIsOwner(Boolean(isMatch));
          }
        } catch (authErr) {
          console.warn("Error validando sesión de vendedor:", authErr);
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
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((curr) => (curr !== null ? curr + 1 : null));
            return 0;
          } else {
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

  // Compra directa vinculada a la pasarela Wompi / PSE y división automática
  const handleBuyNow = (product: Product) => {
    addToCart({
      id: `${product.id}-direct`,
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
      id: `${product.id}-direct`,
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
      showToast("¡Enlace oficial de la boutique copiado al portapapeles!");
    }
  };

  // Carga de producto desde el Publisher Dashboard (Modal)
  const handlePublishProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    if (!newProdName.trim()) {
      alert("Por favor escribe el nombre de la prenda.");
      return;
    }
    const salePriceNum = Number(newProdPrice.replace(/[^0-9]/g, ""));
    if (!salePriceNum || salePriceNum <= 0) {
      alert("Por favor ingresa un precio de venta válido.");
      return;
    }

    setIsPublishing(true);
    try {
      const origPriceNum = Number(newProdOriginalPrice.replace(/[^0-9]/g, ""));
      const discountPercent =
        origPriceNum > salePriceNum
          ? Math.round(((origPriceNum - salePriceNum) / origPriceNum) * 100)
          : 0;

      // Generar slug limpio
      const baseSlug = newProdName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");

      const targetSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const newProductPayload = {
        name: newProdName.trim(),
        slug: targetSlug,
        description: newProdDescription.trim(),
        sale_price: salePriceNum,
        original_price: origPriceNum > salePriceNum ? origPriceNum : null,
        discount_percent: discountPercent,
        category: newProdCategory,
        images: newProdImages.trim() || "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=1000",
        sizes: newProdSizes.trim(),
        colors: newProdColors.trim(),
        stock: Number(newProdStock) || 10,
        is_active: true,
        badge: newProdBadge || (newProdFreeShipping ? "🚚 Envío Gratis" : undefined),
        seller_id: seller.id,
        seller_name: seller.store_name,
        is_official: false,
      };

      // 1. Guardar en Supabase
      const { data, error } = await supabase
        .from("products")
        .insert([newProductPayload])
        .select()
        .single();

      if (error) {
        console.warn("Supabase insert warning, guardando en catálogo local:", error.message);
      }

      const finalizedProduct: Product = (data || {
        ...newProductPayload,
        id: `local_prod_${Date.now()}`,
      }) as Product;

      // 2. Guardar en almacenamiento local como fallback
      if (typeof window !== "undefined") {
        const localProds = JSON.parse(localStorage.getItem("NERKLEY_local_products") || "[]");
        localStorage.setItem("NERKLEY_local_products", JSON.stringify([finalizedProduct, ...localProds]));
      }

      // 3. Actualizar la vista pública del catálogo de inmediato
      setProducts((prev) => [finalizedProduct, ...prev]);
      setShowPublishModal(false);

      // Limpiar formulario
      setNewProdName("");
      setNewProdDescription("");
      setNewProdPrice("");
      setNewProdOriginalPrice("");
      setNewProdStock("10");
      setNewProdImages("");
      setNewProdSizes("");
      setNewProdColors("");
      setNewProdFreeShipping(false);

      showToast(`¡"${finalizedProduct.name}" publicada con éxito en tu boutique!`);
    } catch (err: any) {
      alert("Error al publicar la prenda: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsPublishing(false);
    }
  };

  // Carga de historia desde el Story Publisher Modal
  const handlePublishStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    if (!storyImageUrl.trim()) {
      alert("Por favor ingresa la URL de la imagen para la historia.");
      return;
    }

    setIsPublishingStory(true);
    try {
      const linkedProduct = products.find((p) => p.slug === storyLinkedSlug);

      const updatedStories = await saveSellerStory(seller.id, {
        image_url: storyImageUrl.trim(),
        caption: storyCaption.trim(),
        product_id: linkedProduct?.id,
        product_name: linkedProduct?.name,
        product_price: linkedProduct?.sale_price,
        product_slug: linkedProduct?.slug,
      });

      setStories(updatedStories);
      setShowStoryModal(false);
      setStoryImageUrl("");
      setStoryCaption("");
      setStoryLinkedSlug("");

      showToast("¡Historia publicada con éxito en tu perfil!");
    } catch (err: any) {
      alert("Error al publicar la historia: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsPublishingStory(false);
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
          No pudimos localizar la tienda con el identificador &ldquo;{rawSlug}&rdquo;. Verifica el enlace o explora el catálogo oficial de NERKLEY.
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
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
              className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>🛒</span>
              <span>Carrito</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* REGLA DE ACCESO DEL VENDEDOR (SELF-VIEW RULE): */}
      {/* BARRA SUPERIOR FIJA DE GESTIÓN PARA EL DUEÑO DE LA BOUTIQUE */}
      {/* ========================================================= */}
      {isOwner && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-amber-500/25 via-[#1a1710] to-amber-500/25 border-b border-amber-400/40 backdrop-blur-md px-4 py-2.5 shadow-2xl animate-in fade-in">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider block">
                  👑 Modo Administrador &bull; Vista Pública en Tiempo Real
                </span>
                <span className="text-[10px] text-neutral-400 hidden sm:inline">
                  Tus clientes ven exactamente esta misma estética y catálogo.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStoryModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <span>📸</span>
                <span>+ Subir Historia</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(232,198,98,0.4)] active:scale-95 cursor-pointer ring-2 ring-amber-300"
              >
                <span>✨</span>
                <span>Publicar Ahora</span>
              </button>

              <Link
                href="/vender"
                className="bg-black/60 hover:bg-black text-neutral-300 hover:text-white border border-white/15 px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider transition-all hidden md:flex items-center gap-1"
              >
                <span>⚙️</span>
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECCIÓN ESTILO FACEBOOK / INSTAGRAM: PORTADA & PERFIL SOCIAL */}
      {/* ========================================================= */}
      <div className="relative bg-[#0d0d12] border-b border-white/10">
        {/* FOTO DE PORTADA / COVER PHOTO */}
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

          {/* Insignia de Protección de Compra Escrow */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-amber-400/40 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] text-amber-300 font-bold uppercase tracking-wider shadow-lg">
            <span>🛡️</span>
            <span>Garantía Escrow NERKLEY &bull; Split Directo</span>
          </div>
        </div>

        {/* CONTENEDOR DE PERFIL (SUPERPUESTO ESTILO FACEBOOK / INSTAGRAM) */}
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
            {/* AVATAR + DETALLES BÁSICOS */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* FOTO DE PERFIL / AVATAR CON ARO SOCIAL DORADO */}
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
                  <span className="text-amber-300 font-semibold">{seller.category || "Streetwear & Moda Selecta"}</span>
                  <span>&bull;</span>
                  <span>📍 {seller.city}, {seller.department}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-emerald-400 font-bold">5.0 ⭐⭐⭐⭐⭐</span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Por: <strong className="text-white">{seller.owner_name}</strong> &bull; Tienda Oficial Asociada a NERKLEY
                </p>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN SOCIAL (MENSAJE, COMPARTIR, COMPRAR) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
              <a
                href={`https://wa.me/57${seller.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hola ${seller.owner_name}, vi tu boutique oficial "${seller.store_name}" en NERKLEY y quiero consultar por tus prendas disponibles.`
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
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>🔗</span>
                <span>Compartir</span>
              </button>

              <a
                href="#catalogo"
                className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🛍️</span>
                <span>Prendas ({products.length})</span>
              </a>
            </div>
          </div>

          {/* BIOGRAFÍA COMERCIAL */}
          {seller.bio && (
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-neutral-200 leading-relaxed text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block mb-1">
                Sobre esta Boutique &bull; Biografía Comercial
              </span>
              <p className="italic font-light">&ldquo;{seller.bio}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BANDEJA DE HISTORIAS / STORIES FEED (ESTILO INSTAGRAM/FACEBOOK) */}
      {/* ========================================================= */}
      <section className="border-b border-white/10 py-6 bg-[#0a0a0c]">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-amber-300 flex items-center gap-2">
              <span>📸</span>
              <span>Bandeja de Historias & Drops en Directo</span>
            </h2>
            <span className="text-[10px] text-neutral-400">Contenido efímero y promociones exclusivas</span>
          </div>

          {/* CARRUSEL DE BURBUJAS DE HISTORIAS */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none items-center">
            {/* Si es el dueño, botón para subir una nueva historia */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowStoryModal(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 border-2 border-dashed border-amber-400/80 group-hover:border-amber-300 flex items-center justify-center bg-black/60 group-hover:bg-amber-400/10 transition-all shadow-md">
                  <span className="text-2xl sm:text-3xl text-amber-300 font-bold group-hover:scale-110 transition-transform">+</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold truncate max-w-[70px]">
                  Subir Story
                </span>
              </button>
            )}

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

              {/* SI LA HISTORIA TIENE UN PRODUCTO ETIQUETADO CON COMPRA DIRECTA */}
              {stories[activeStoryIndex].product_name && (
                <div className="p-3 bg-white/10 backdrop-blur-md border border-amber-400/50 rounded-xl flex items-center justify-between gap-3 shadow-lg">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold block">
                      🛍️ Prenda Etiquetada en la Historia
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
                    className="bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>Compra Directa</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECCIÓN PRINCIPAL: FEED DE PRODUCTOS (CATÁLOGO COMERCIAL) */}
      {/* ========================================================= */}
      <main id="catalogo" className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>💎</span>
              <span>Catálogo Comercial &bull; {seller.store_name}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Prendas de streetwear, footwear y colecciones exclusivas disponibles con Compra Directa Wompi / PSE.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Publicar Prenda</span>
              </button>
            )}
            <span className="text-xs text-neutral-400 font-mono">
              {filteredProducts.length} de {products.length} artículos
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
              placeholder="Buscar prendas en esta boutique..."
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

        {/* LISTADO DE PRODUCTOS EN CUADRÍCULA (GRID COMERCIAL STREETWEAR) */}
        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center border border-white/10 bg-white/5 rounded-2xl space-y-3">
            <span className="text-4xl">🛍️</span>
            <p className="text-sm font-semibold text-white">No se encontraron prendas con este criterio</p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              {isOwner
                ? "Aún no tienes prendas en este filtro. ¡Haz clic en 'Publicar Ahora' para subir tu primer drop!"
                : "Prueba con otra palabra de búsqueda o categoría."}
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
              >
                <span>✨</span>
                <span>Publicar Nueva Prenda</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const img = prod.images ? prod.images.split(",")[0].trim() : null;
              return (
                <div
                  key={prod.id}
                  className="bg-[#111116] border border-white/10 hover:border-amber-400/40 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-md hover:shadow-2xl"
                >
                  <div>
                    {/* FOTO DE LA PRENDA / PRODUCTO */}
                    <Link href={`/product/${prod.slug}`} className="block relative aspect-square bg-black overflow-hidden cursor-pointer">
                      {img ? (
                        <img
                          src={img}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs uppercase tracking-widest font-serif">
                          NERKLEY STREETWEAR
                        </div>
                      )}

                      {/* Insignia de descuento */}
                      {prod.discount_percent && prod.discount_percent > 0 ? (
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                          -{prod.discount_percent}% OFF
                        </div>
                      ) : null}

                      {/* Insignia personalizada o badge de drop */}
                      {prod.badge && (
                        <div className="absolute top-3 right-3 bg-amber-400/90 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
                          {prod.badge}
                        </div>
                      )}

                      {/* Insignia de boutique */}
                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1.5 shadow">
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
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-light">
                          {prod.description}
                        </p>
                      )}

                      {/* Tallas si existen */}
                      {prod.sizes && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {prod.sizes.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5).map((sz) => (
                            <span key={sz} className="text-[9px] font-mono bg-white/5 border border-white/10 text-neutral-300 px-1.5 py-0.2 rounded">
                              {sz}
                            </span>
                          ))}
                        </div>
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

                  {/* BOTONES DE COMPRA DIRECTA CON WOMPI / PSE */}
                  <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddDirect(prod)}
                      className="bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-white/15 flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span>🛒</span>
                      <span>Al Carrito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBuyNow(prod)}
                      className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(232,198,98,0.35)] active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>⚡</span>
                      <span>Compra Directa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BANNER INFORMATIVO DE SEGURIDAD Y COMPRA PROTEGIDA (ESCROW / SPLIT PAYMENT) */}
        <section className="bg-gradient-to-r from-[#14141c] via-[#1c1811] to-[#14141c] border border-amber-400/30 p-6 sm:p-8 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <span>🛡️</span> Pasarela Wompi & PSE &bull; Split de Comisión Automático
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-white uppercase tracking-wider">
            ¿Cómo funciona la Compra Directa con {seller.store_name}?
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed">
            Cuando compras en esta boutique, tu pago se procesa de forma 100% blindada mediante Wompi (Bancolombia, Nequi, PSE y Tarjetas). NERKLEY retiene automáticamente la comisión de plataforma y mantiene en custodia el saldo del vendedor hasta que la transportadora certifique la entrega satisfactoria.
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

      {/* ========================================================= */}
      {/* BOTÓN FLOTANTE RÁPIDO DE GESTIÓN PARA EL VENDEDOR */}
      {/* ========================================================= */}
      {isOwner && (
        <div className="fixed bottom-6 left-6 z-[180] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black px-5 py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-[0_10px_25px_rgba(232,198,98,0.5)] flex items-center gap-2 cursor-pointer active:scale-95 transition-all ring-2 ring-amber-300"
          >
            <span className="text-base">✨</span>
            <span>Publicar Prenda Ahora</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DEL PUBLISHER DASHBOARD (CARGA DE PRENDAS / INVENTARIO) */}
      {/* ========================================================= */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowPublishModal(false)}
        >
          <div
            className="bg-[#111116] border border-amber-400/40 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white flex items-center gap-2">
                  <span>✨</span> Panel de Publicación de Prendas
                </h3>
                <p className="text-xs text-neutral-400">
                  Carga nuevo inventario streetwear para tu boutique &ldquo;{seller.store_name}&rdquo;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishProductSubmit} className="space-y-4">
              {/* Título de la prenda */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Título de la Prenda o Calzado *
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej: Buzo Hoodie Oversize Heavyweight Acid Wash o Jeans Baggy Y2K"
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Categoría Streetwear & Estilo *
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {STREETWEAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción detallada de materiales y corte */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Descripción de Materiales, Diseño & Caída Urbana *</span>
                  <span className="text-[10px] text-amber-400 font-normal">Streetwear Spec</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  placeholder="Detalla materiales (ej: algodón 450 GSM, denim rígido 14oz, cuero genuino), confección, caída oversize/baggy y recomendaciones de talla..."
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Precios y Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Precio de Venta ($ COP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="Ej: 160000"
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Precio Lista / Tachado ($ COP)
                  </label>
                  <input
                    type="number"
                    value={newProdOriginalPrice}
                    onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                    placeholder="Ej: 220000 (Opcional)"
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="10"
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* URLs de Imágenes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Imágenes de la Prenda (URLs separadas por coma) *</span>
                  <span className="text-[10px] text-neutral-400">Recomendado formato vertical</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProdImages}
                  onChange={(e) => setNewProdImages(e.target.value)}
                  placeholder="https://ejemplo.com/foto1.jpg, https://ejemplo.com/foto2.jpg"
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Tallas con Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-200">
                  Tallas Disponibles (Haz clic para seleccionar)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_PRESETS.map((sz) => {
                    const active = newProdSizes.split(",").map((s) => s.trim()).includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setNewProdSizes(toggleToken(newProdSizes, sz))}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-amber-400 text-black shadow-sm"
                            : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colores con Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-200">
                  Colores Urbanos (Haz clic para seleccionar)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((cl) => {
                    const active = newProdColors.split(",").map((s) => s.trim()).includes(cl);
                    return (
                      <button
                        key={cl}
                        type="button"
                        onClick={() => setNewProdColors(toggleToken(newProdColors, cl))}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-amber-400 text-black shadow-sm"
                            : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        {cl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badge e Interruptor de Envío Gratis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Insignia Destacada (Badge)
                  </label>
                  <select
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {BADGE_PRESETS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="freeShippingCheck"
                    checked={newProdFreeShipping}
                    onChange={(e) => setNewProdFreeShipping(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                  />
                  <label htmlFor="freeShippingCheck" className="text-xs text-neutral-200 font-semibold cursor-pointer">
                    🚚 Activar Envío Gratis en esta prenda
                  </label>
                </div>
              </div>

              <div className="p-3 bg-amber-400/10 border border-amber-400/25 rounded-xl text-[11px] text-amber-200 flex items-center gap-2">
                <span>🔒</span>
                <span>
                  <strong>Sincronización Wompi / PSE:</strong> Esta prenda se vinculará de forma nativa a los links de pago y división automática de comisión de NERKLEY.
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 text-xs uppercase font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <span>🚀</span>
                  <span>{isPublishing ? "Publicando en Catálogo..." : "Publicar Prenda Ahora"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PARA SUBIR HISTORIAS (STORIES PUBLISHER) */}
      {/* ========================================================= */}
      {showStoryModal && (
        <div
          className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowStoryModal(false)}
        >
          <div
            className="bg-[#111116] border border-amber-400/40 rounded-2xl w-full max-w-lg p-5 sm:p-7 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-white flex items-center gap-2">
                  <span>📸</span> Publicar Historia en Directo
                </h3>
                <p className="text-xs text-neutral-400">
                  Aparecerá en las burbujas superiores de tu perfil con botón de Compra Directa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishStorySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  URL de la Foto o Reel *
                </label>
                <input
                  type="url"
                  required
                  value={storyImageUrl}
                  onChange={(e) => setStoryImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto-historia.jpg"
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Mensaje Comercial / Caption
                </label>
                <textarea
                  rows={2}
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  placeholder="Ej: 🔥 ¡Drop limitado en vivo! Pocas unidades con despacho asegurado hoy."
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Vincular Prenda de tu Catálogo (Compra Directa)
                </label>
                <select
                  value={storyLinkedSlug}
                  onChange={(e) => setStoryLinkedSlug(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- Ninguna prenda vinculada --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name} - ${Number(p.sale_price).toLocaleString("es-CO")} COP
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">
                  Si vinculas una prenda, en la historia aparecerá la tarjeta flotante para comprarla directamente con un toque.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStoryModal(false)}
                  className="px-4 py-2 text-xs uppercase font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishingStory}
                  className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <span>📸</span>
                  <span>{isPublishingStory ? "Subiendo Historia..." : "Publicar Historia"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
