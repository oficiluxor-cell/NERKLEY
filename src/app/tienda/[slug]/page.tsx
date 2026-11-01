"use client";

import { useEffect, useState, use, useMemo, Suspense, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import {
  getSellerBySlug,
  getSellerProducts,
  getSellerStories,
  saveSellerStory,
  deleteSellerStory,
  getFreshSellerSession,
  calculateOrderCommission,
  compressImageFile,
  Seller,
  SellerStory,
} from "@/lib/marketplace";
import { supabase } from "@/lib/supabase";
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
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Regla de Acceso del Vendedor (Self-View Rule)
  const [isOwner, setIsOwner] = useState(false);
  const [ownerTab, setOwnerTab] = useState<"productos" | "pedidos" | "billetera" | "perfil">("productos");

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);

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

  // Formulario de edición rápida de perfil
  const [profileForm, setProfileForm] = useState({
    store_name: "",
    owner_name: "",
    phone: "",
    city: "Medellín",
    department: "Antioquia",
    category: "Streetwear & Hoodies",
    bio: "",
    logo_url: "",
    banner_url: "",
    bank_name: "Bancolombia",
    account_number: "",
    account_type: "Ahorros",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Mapeo de guías para pedidos
  const [guideInputs, setGuideInputs] = useState<Record<string, { company?: string; guide?: string }>>({});

  // Toast de notificación
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de subida directa desde la galería / cámara
  const [uploadingProdImages, setUploadingProdImages] = useState(false);
  const [uploadingStoryImage, setUploadingStoryImage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const { addToCart, setIsCartOpen } = useCart();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Subida de múltiples fotos de producto desde la galería o cámara del celular/PC
  const handleProductGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingProdImages(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const compressed = await compressImageFile(file, 1200, 0.82);
          compressedList.push(compressed);
        }
      }
      if (compressedList.length > 0) {
        const existing = newProdImages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const combined = [...existing, ...compressedList];
        setNewProdImages(combined.join(", "));
        showToast(`✅ Se cargaron ${compressedList.length} foto(s) desde tu galería`);
      }
    } catch {
      showToast("❌ Error al procesar fotos de la galería");
    } finally {
      setUploadingProdImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    const images = newProdImages
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    setNewProdImages(updated.join(", "));
  };

  // Subida de foto para historias desde la galería o cámara
  const handleStoryGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingStoryImage(true);
    try {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageFile(file, 1200, 0.85);
        setStoryImageUrl(compressed);
        showToast("✅ Foto de historia cargada desde tu galería");
      }
    } catch {
      showToast("❌ Error al cargar foto de la galería");
    } finally {
      setUploadingStoryImage(false);
      e.target.value = "";
    }
  };

  // Subida de foto de perfil (Avatar)
  const handleAvatarGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAvatar(true);
    try {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageFile(file, 800, 0.85);
        setProfileForm((prev) => ({ ...prev, logo_url: compressed }));
        showToast("✅ Foto de perfil cargada desde tu galería");
      }
    } catch {
      showToast("❌ Error al procesar foto de perfil");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // Subida de foto de portada (Banner)
  const handleBannerGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingBanner(true);
    try {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const compressed = await compressImageFile(file, 1400, 0.82);
        setProfileForm((prev) => ({ ...prev, banner_url: compressed }));
        showToast("✅ Foto de portada cargada desde tu galería");
      }
    } catch {
      showToast("❌ Error al procesar foto de portada");
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
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

        setProfileForm({
          store_name: sellerData.store_name || "",
          owner_name: sellerData.owner_name || "",
          phone: sellerData.phone || "",
          city: sellerData.city || "Medellín",
          department: sellerData.department || "Antioquia",
          category: sellerData.category || "Streetwear & Hoodies",
          bio: sellerData.bio || "",
          logo_url: sellerData.logo_url || "",
          banner_url: sellerData.banner_url || "",
          bank_name: sellerData.bank_name || "Bancolombia",
          account_number: sellerData.account_number || "",
          account_type: sellerData.account_type || "Ahorros",
        });

        // Cargar pedidos para esta boutique
        try {
          const { data: ords } = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

          if (ords) {
            const matched = ords.filter((o) =>
              (o.product_name && o.product_name.toLowerCase().includes(sellerData.store_name.toLowerCase())) ||
              (o.notes && o.notes.toLowerCase().includes(sellerData.store_name.toLowerCase()))
            );
            setSellerOrders(matched);
          }
        } catch (ordErr) {
          console.warn("Error cargando pedidos:", ordErr);
        }

        // Asignar historias reales de la boutique (sincronizadas desde Supabase)
        setStories(str || []);

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

  const handleDeleteStory = async (storyId: string) => {
    if (!seller) return;
    if (!confirm("¿Seguro que deseas eliminar esta historia?")) return;
    try {
      const updated = await deleteSellerStory(seller.id, storyId);
      setStories(updated);
      closeStory();
      showToast("Historia eliminada con éxito");
    } catch {
      showToast("Error al eliminar la historia");
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

  // Cálculos de billetera para el dueño
  const walletMetrics = useMemo(() => {
    let pending = 0;
    let available = 0;
    const commission = seller?.commission_rate ?? 12;

    sellerOrders.forEach((o) => {
      const isPaid =
        o.status === "Pagado / En Preparación" ||
        o.status === "En Despacho / Enviado" ||
        o.status === "Entregado" ||
        o.status === "Pagado";
      if (!isPaid) return;
      const total = Number(o.total_price) || 0;
      const { sellerNet } = calculateOrderCommission(total, commission);
      if (o.notes?.includes("FONDOS_LIBERADOS")) {
        available += sellerNet;
      } else {
        pending += sellerNet;
      }
    });

    return { pending, available, totalEarned: pending + available };
  }, [sellerOrders, seller]);

  // Compra directa vinculada a la pasarela Wompi / PSE
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

  // Guardar guía de despacho para un pedido
  const handleSaveShippingGuide = async (orderId: string, company: string, guide: string) => {
    if (!guide.trim()) {
      alert("Por favor ingresa el número de guía asignado por la transportadora.");
      return;
    }

    try {
      const order = sellerOrders.find((o) => o.id === orderId);
      const noteTag = `[Guía asignada: ${company} - ${guide.trim()} por ${seller?.store_name || "Vendedor"}]`;
      const updatedNotes = order?.notes ? `${order.notes} ${noteTag}` : noteTag;

      await supabase
        .from("orders")
        .update({
          transport_company: company,
          shipping_guide: guide.trim(),
          status: "En Despacho / Enviado",
          notes: updatedNotes,
        })
        .eq("id", orderId);

      setSellerOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, transport_company: company, shipping_guide: guide.trim(), status: "En Despacho / Enviado", notes: updatedNotes }
            : o
        )
      );

      showToast("¡Guía guardada! Se notificará al comprador.");
    } catch (err: any) {
      alert("Error al guardar guía: " + err.message);
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm("¿Deseas eliminar este producto de tu catálogo?")) return;
    try {
      await supabase.from("products").delete().eq("id", prodId);
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      showToast("Prenda eliminada con éxito.");
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
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

      if (typeof window !== "undefined") {
        const localProds = JSON.parse(localStorage.getItem("NERKLEY_local_products") || "[]");
        localStorage.setItem("NERKLEY_local_products", JSON.stringify([finalizedProduct, ...localProds]));
      }

      setProducts((prev) => [finalizedProduct, ...prev]);
      setShowPublishModal(false);

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

  // Guardar perfil desde la pestaña de configuración
  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    setSavingProfile(true);
    try {
      await supabase
        .from("sellers")
        .update({
          store_name: profileForm.store_name.trim(),
          owner_name: profileForm.owner_name.trim(),
          phone: profileForm.phone.trim(),
          city: profileForm.city.trim(),
          department: profileForm.department.trim(),
          category: profileForm.category.trim(),
          bio: profileForm.bio.trim(),
          logo_url: profileForm.logo_url.trim() || null,
          banner_url: profileForm.banner_url.trim() || null,
          bank_name: profileForm.bank_name.trim(),
          account_number: profileForm.account_number.trim(),
          account_type: profileForm.account_type.trim(),
        })
        .eq("id", seller.id);

      setSeller({
        ...seller,
        ...profileForm,
      });

      showToast("¡Perfil y portada actualizados correctamente!");
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
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
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex justify-center">
      {/* Toast Flotante */}
      {toastMessage && (
        <div className="fixed top-5 z-[300] bg-white text-black px-4 py-2 shadow-2xl flex items-center gap-2 rounded-full animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* CONTENEDOR MÓVIL ESTILO TIKTOK EXACTO */}
      <div className="w-full max-w-lg min-h-screen bg-black text-white relative flex flex-col pb-28 border-x border-neutral-900/60 shadow-2xl">
        {/* BARRA SUPERIOR TIKTOK */}
        <header className="h-12 px-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-black/90 backdrop-blur-md z-40">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-white hover:text-neutral-300 text-lg cursor-pointer p-1 font-bold">
              ←
            </Link>
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1 truncate max-w-[200px]">
              {seller.store_name}
              <span className="text-xs text-neutral-400">▾</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-neutral-300">
            <button
              type="button"
              onClick={handleShareProfile}
              className="hover:text-white p-1 text-sm cursor-pointer"
              title="Compartir"
            >
              ↗
            </button>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="hover:text-white p-1 text-base relative cursor-pointer"
              title="Carrito"
            >
              🛒
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setOwnerTab("perfil")}
                className="hover:text-white p-1 text-base cursor-pointer"
                title="Ajustes de Perfil"
              >
                ⚙️
              </button>
            )}
          </div>
        </header>

        {/* CABECERA DE PERFIL ESTILO TIKTOK EXACTO */}
        <div className="px-5 pt-3 pb-3 space-y-3.5">
          {/* Fila Superior: Nombre y Contadores a la izquierda, Avatar con Thought Bubble a la derecha */}
          <div className="flex items-start justify-between gap-4">
            {/* Columna Izquierda: Nombre, username y contadores */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                  <span>{seller.store_name}</span>
                  <span className="text-sm font-normal text-neutral-400">▾</span>
                  {isVerified && (
                    <span className="text-cyan-400 text-sm shrink-0" title="Verificado">
                      ✓
                    </span>
                  )}
                </h1>
                <p className="text-xs text-neutral-400 font-medium truncate">
                  @{seller.slug || seller.store_name.toLowerCase().replace(/\s+/g, "_")}
                </p>
              </div>

              {/* Contadores TikTok: Siguiendo, Seguidores, Me gusta */}
              <div className="flex items-center gap-4 sm:gap-6 pt-1 text-left">
                <div>
                  <span className="font-extrabold text-sm sm:text-base text-white block">
                    {products.length}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">Prendas</span>
                </div>
                <div>
                  <span className="font-extrabold text-sm sm:text-base text-white block">
                    10,7 mil
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">Seguidores</span>
                </div>
                <div>
                  <span className="font-extrabold text-sm sm:text-base text-white block">
                    247,2 mil
                  </span>
                  <span className="text-[11px] text-neutral-400 font-normal">Me gusta</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Avatar circular con globo de pensamiento y botón azul + */}
            <div className="flex flex-col items-center shrink-0 relative pt-1">
              {/* Globo de pensamiento TikTok ("Lo que estás pensando...") */}
              <div
                onClick={() => (stories.length > 0 ? openStory(0) : isOwner && setShowStoryModal(true))}
                className="relative mb-1 bg-[#1a1a24] border border-white/10 text-[10px] text-neutral-300 font-medium px-2.5 py-0.5 rounded-full shadow-md cursor-pointer hover:border-white/30 transition-all select-none whitespace-nowrap"
              >
                <span>{stories.length > 0 ? "🔥 Ver Story" : "Lo que estás pensando..."}</span>
                <div className="absolute -bottom-1 right-5 w-1.5 h-1.5 bg-[#1a1a24] border-r border-b border-white/10 rotate-45"></div>
              </div>

              {/* Avatar con botón + */}
              <div className="relative group">
                <div
                  onClick={() => (stories.length > 0 ? openStory(0) : isOwner && setShowStoryModal(true))}
                  className={`w-20 h-20 rounded-full p-[2px] cursor-pointer overflow-hidden bg-black ${
                    stories.length > 0
                      ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black"
                      : "border-2 border-white/20"
                  }`}
                >
                  {seller.logo_url ? (
                    <img src={seller.logo_url} alt={seller.store_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#16161f] flex items-center justify-center font-bold text-lg text-white">
                      {seller.store_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Botón azul celeste (+) para subir story o foto */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowStoryModal(true)}
                    title="Subir Story o Foto"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00f2fe] text-black font-black text-sm flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-black"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Biografía Comercial al estilo TikTok de la imagen */}
          <div className="text-xs text-neutral-200 leading-snug space-y-0.5 pt-0.5 font-normal">
            <p className="flex items-center gap-1.5">
              <span>⚡</span> <span>{seller.store_name.toUpperCase()} STORE</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>🛒</span> <span>Tienda oficial verificada</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>🧥</span> <span>{seller.category || "Streetwear exclusivo & alta gama."}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>📦</span> <span>Envíos asegurados a toda Colombia.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>👇</span> <span>Explora la colección aquí:</span>
            </p>
            {seller.bio && (
              <p className="pt-1 text-neutral-400 italic">
                &ldquo;{seller.bio}&rdquo;
              </p>
            )}

            {/* Enlace oficial */}
            <div className="pt-1 flex items-center gap-1.5 text-xs text-neutral-300 font-semibold">
              <span className="text-sm">🔗</span>
              <span className="hover:underline cursor-pointer truncate">
                nerkley-m4t2.vercel.app/tienda/{seller.slug || seller.store_name.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Botones de Acción Estilo TikTok */}
          <div className="flex items-center gap-2 pt-1">
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => setOwnerTab("perfil")}
                  className="flex-1 bg-[#1c1c24] hover:bg-[#252530] text-white text-xs font-semibold py-2 px-3 rounded-lg text-center transition-all cursor-pointer"
                >
                  Editar perfil
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  className="flex-1 bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 px-3 rounded-lg text-center transition-all cursor-pointer shadow-sm"
                >
                  + Publicar prenda
                </button>
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="bg-[#1c1c24] hover:bg-[#252530] text-white text-xs px-3 py-2 rounded-lg transition-all cursor-pointer"
                  title="Compartir"
                >
                  🔗
                </button>
              </>
            ) : (
              <>
                <a
                  href={`https://wa.me/57${seller.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hola ${seller.owner_name}, vi tu boutique oficial "${seller.store_name}" en NERKLEY y quiero comprar.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <span>💬</span> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="bg-[#1c1c24] hover:bg-[#252530] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Compartir
                </button>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Carrito
                </button>
              </>
            )}
          </div>
        </div>

        {/* BARRA DE ICONOS TIKTOK */}
        <div className="border-b border-white/10 flex items-center justify-around text-neutral-400 bg-black sticky top-12 z-30">
          <button
            type="button"
            onClick={() => setOwnerTab("productos")}
            className={`py-3 px-4 flex flex-col items-center relative transition-colors cursor-pointer ${
              ownerTab === "productos" ? "text-white font-bold" : "hover:text-white"
            }`}
            title="Catálogo de Productos"
          >
            <span className="text-base tracking-tighter">|||▾</span>
            {ownerTab === "productos" && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
            )}
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setOwnerTab("pedidos")}
              className={`py-3 px-4 flex flex-col items-center relative transition-colors cursor-pointer ${
                ownerTab === "pedidos" ? "text-white" : "hover:text-white"
              }`}
              title="Mis Pedidos (Privado)"
            >
              <span className="text-base">🔒</span>
              {ownerTab === "pedidos" && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
              )}
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => setOwnerTab("billetera")}
              className={`py-3 px-4 flex flex-col items-center relative transition-colors cursor-pointer ${
                ownerTab === "billetera" ? "text-white" : "hover:text-white"
              }`}
              title="Billetera & Retiros"
            >
              <span className="text-base">💳</span>
              {ownerTab === "billetera" && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
              )}
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => setOwnerTab("perfil")}
              className={`py-3 px-4 flex flex-col items-center relative transition-colors cursor-pointer ${
                ownerTab === "perfil" ? "text-white" : "hover:text-white"
              }`}
              title="Ajustes de Perfil"
            >
              <span className="text-base">⚙️</span>
              {ownerTab === "perfil" && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => showToast("❤️ 247,2 mil 'Me gusta' acumulados")}
            className="py-3 px-4 flex flex-col items-center relative hover:text-white transition-colors cursor-pointer"
            title="Me gusta"
          >
            <span className="text-base">🤍</span>
          </button>
        </div>

        {/* CATEGORÍAS / PLAYLISTS ESTILO TIKTOK */}
        {ownerTab === "productos" && (
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-white/5 bg-[#09090d] text-xs">
            <span className="text-[11px] text-neutral-400 font-semibold flex items-center gap-1 shrink-0">
              <span>⚙️</span> Categorías:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-neutral-300 hover:bg-white/10"
                }`}
              >
                📁 {cat}
              </button>
            ))}
          </div>
        )}

        {/* FEED DE PRODUCTOS EN CUADRÍCULA 3 COLUMNAS TIKTOK */}
        {ownerTab === "productos" && (
          <div>
            {filteredProducts.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-3">
                <span className="text-4xl">🛍️</span>
                <p className="text-sm font-bold text-white">No hay prendas en esta categoría</p>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {isOwner
                    ? "Pulsa en '+ Publicar prenda' para cargar tu primer drop."
                    : "Explora otra categoría o regresa más tarde."}
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(true)}
                    className="bg-white text-black font-bold text-xs px-5 py-2 rounded-lg cursor-pointer"
                  >
                    + Publicar Prenda
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-black">
                {/* Primera celda para el dueño: subir prenda rápido */}
                {isOwner && (
                  <div
                    onClick={() => setShowPublishModal(true)}
                    className="relative aspect-[3/4] bg-[#121217] hover:bg-[#1a1a24] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors group border border-dashed border-white/20 select-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white text-white group-hover:text-black flex items-center justify-center font-bold text-lg transition-all">
                      +
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 group-hover:text-white uppercase tracking-wider text-center px-1">
                      Subir
                    </span>
                  </div>
                )}

                {filteredProducts.map((prod) => {
                  const img = prod.images ? prod.images.split(",")[0].trim() : null;
                  const priceInK = Math.round(Number(prod.sale_price) / 1000);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductModal(prod)}
                      className="relative aspect-[3/4] bg-neutral-900 overflow-hidden cursor-pointer group select-none"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#15151e] text-[10px] text-neutral-500 font-bold p-2 text-center uppercase">
                          {prod.name}
                        </div>
                      )}

                      {/* Gradiente oscuro inferior */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />

                      {/* Insignia / Badge TikTok superior */}
                      {prod.discount_percent && prod.discount_percent > 0 ? (
                        <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded shadow">
                          -{prod.discount_percent}%
                        </span>
                      ) : prod.badge ? (
                        <span className="absolute top-1 right-1 bg-white text-black text-[8px] font-bold px-1.5 py-0.2 rounded shadow">
                          {prod.badge.split(" ")[0]}
                        </span>
                      ) : null}

                      {/* Indicador inferior izquierdo estilo TikTok: Play icon ▷ + Precio en $K */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none text-white drop-shadow-md">
                        <span className="text-[11px] font-black tracking-tight flex items-center gap-1">
                          <span className="text-[9px]">▷</span>
                          <span>${priceInK}k</span>
                        </span>
                        <span className="text-[9px] text-neutral-300 truncate max-w-[50%]">
                          {prod.name.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: MIS PEDIDOS (SOLO DUEÑO) */}
        {isOwner && ownerTab === "pedidos" && (
          <div className="p-4 space-y-4 animate-in fade-in">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📦</span>
                <span>Pedidos Recibidos ({sellerOrders.length})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Prepara tus paquetes y asigna guías de transporte para despachar.
              </p>
            </div>

            {sellerOrders.length === 0 ? (
              <div className="p-16 text-center border border-white/10 bg-white/5 rounded-2xl space-y-3">
                <span className="text-4xl">📦</span>
                <p className="text-base font-bold text-white">Aún no tienes pedidos registrados</p>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Tus ventas realizadas a través de Wompi / PSE aparecerán en este panel en tiempo real con los datos de entrega del cliente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sellerOrders.map((o) => {
                  const total = Number(o.total_price) || 0;
                  const { platformFee, sellerNet } = calculateOrderCommission(total, seller.commission_rate ?? 12);
                  const currentCompany = guideInputs[o.id]?.company || o.transport_company || "Interrapidísimo";
                  const currentGuide = guideInputs[o.id]?.guide !== undefined ? guideInputs[o.id].guide : (o.shipping_guide || "");

                  return (
                    <div
                      key={o.id}
                      className="bg-[#111116] border border-white/10 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-widest font-mono">
                            Ref: {o.reference || o.id}
                          </span>
                          <h4 className="text-sm font-bold text-white">{o.product_name}</h4>
                          <span className="text-[11px] text-neutral-400">
                            Fecha: {new Date(o.created_at).toLocaleString("es-CO")}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                            Tu Pago Neto (Post-Comisión)
                          </span>
                          <span className="text-base font-mono font-black text-emerald-400">
                            $ {sellerNet.toLocaleString("es-CO")} COP
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            (Total pagado: ${total.toLocaleString()} - Comisión NERKLEY: ${platformFee.toLocaleString()})
                          </span>
                        </div>
                      </div>

                      {/* DATOS DEL CLIENTE */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/5 p-4 rounded-xl">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Cliente</span>
                          <span className="text-white font-semibold">{o.customer_name}</span>
                          <span className="text-neutral-400 block">{o.customer_email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Destino</span>
                          <span className="text-white font-semibold">{o.city}</span>
                          <span className="text-neutral-300 block">{o.address}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Contacto</span>
                          <a
                            href={`https://wa.me/57${(o.customer_phone || "").replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <span>📲</span>
                            <span>{o.customer_phone || "Sin teléfono"}</span>
                          </a>
                        </div>
                      </div>

                      {/* FORMULARIO DE GUÍA DE TRANSPORTE */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <select
                            value={currentCompany}
                            onChange={(e) =>
                              setGuideInputs({
                                ...guideInputs,
                                [o.id]: { ...guideInputs[o.id], company: e.target.value },
                              })
                            }
                            className="bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-white cursor-pointer"
                          >
                            <option value="Interrapidísimo">Interrapidísimo</option>
                            <option value="Servientrega">Servientrega</option>
                            <option value="Coordinadora">Coordinadora</option>
                            <option value="Envía">Envía</option>
                            <option value="TCC">TCC</option>
                            <option value="Deprisa">Deprisa</option>
                          </select>

                          <input
                            type="text"
                            value={currentGuide}
                            onChange={(e) =>
                              setGuideInputs({
                                ...guideInputs,
                                [o.id]: { ...guideInputs[o.id], guide: e.target.value },
                              })
                            }
                            placeholder="Número de Guía de Envío"
                            className="bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white flex-1 min-w-[180px]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveShippingGuide(o.id, currentCompany, currentGuide)}
                          className="bg-white hover:bg-neutral-200 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                        >
                          Guardar Guía
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 3: BILLETERA & RETIROS (SOLO PARA EL DUEÑO) */}
        {/* ========================================================= */}
        {isOwner && ownerTab === "billetera" && (
          <div className="p-4 space-y-5 animate-in fade-in">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💰</span>
                <span>Billetera Financiera & Retiros</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Administración de fondos recaudados con Wompi / PSE y división automática de comisiones.
              </p>
            </div>

            {/* TARJETAS DE SALDOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#14141c] border border-white/10 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  ⏳ En Custodia Escrow
                </span>
                <span className="text-xl font-mono font-black text-white block">
                  $ {walletMetrics.pending.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Fondos protegidos mientras se entrega el pedido.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#111c16] border border-emerald-500/30 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                  💰 Disponible para Retiro
                </span>
                <span className="text-xl font-mono font-black text-emerald-400 block">
                  $ {walletMetrics.available.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Fondos liberados tras entrega confirmada.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#14141c] border border-white/10 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  📈 Total Generado
                </span>
                <span className="text-xl font-mono font-bold text-white block">
                  $ {walletMetrics.totalEarned.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Ventas netas acumuladas.
                </p>
              </div>
            </div>

            {/* DATOS BANCARIOS REGISTRADOS & SOLICITUD DE RETIRO */}
            <div className="bg-[#111116] border border-white/10 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Cuenta Bancaria Registrada
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {seller.bank_name} &bull; {seller.account_type} &bull; {seller.account_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerTab("perfil")}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  Editar cuenta &rarr;
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (walletMetrics.available <= 0) {
                    alert("Aún no tienes saldo disponible para retirar. Los fondos se liberan una vez tus pedidos sean entregados al comprador.");
                    return;
                  }
                  alert(`Tu solicitud de retiro por $${walletMetrics.available.toLocaleString("es-CO")} COP a tu cuenta ${seller.bank_name} (${seller.account_number}) ha sido enviada a la administración de NERKLEY.`);
                }}
                className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
              >
                Solicitar Desembolso a {seller.bank_name}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 4: EDITAR PERFIL & PORTADA (SOLO PARA EL DUEÑO) */}
        {/* ========================================================= */}
        {isOwner && ownerTab === "perfil" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>👤</span>
                <span>Configuración de tu Boutique & Identidad</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Personaliza la foto de portada, tu logotipo, biografía y datos bancarios para transferencias.
              </p>
            </div>

            <form onSubmit={handleSaveProfileSubmit} className="bg-[#111116] border border-white/10 p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Nombre de la Boutique *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.store_name}
                    onChange={(e) => setProfileForm({ ...profileForm, store_name: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Categoría Principal
                  </label>
                  <select
                    value={profileForm.category}
                    onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white cursor-pointer"
                  >
                    {STREETWEAR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Biografía Comercial / Lema de la Boutique
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                  />
                </div>

                {/* Foto de Perfil / Avatar con selector de galería */}
                <div className="space-y-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                  <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                    <span>Foto de Perfil / Logo</span>
                    <span className="text-[10px] text-neutral-400">Circular</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-black border-2 border-white/30 flex items-center justify-center shrink-0">
                      {profileForm.logo_url ? (
                        <img src={profileForm.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-500 font-bold">Sin foto</span>
                      )}
                    </div>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/15 hover:border-white text-neutral-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                      <span>📷</span>
                      <span>{uploadingAvatar ? "Cargando..." : "Subir desde Galería o Cámara"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={handleAvatarGalleryUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <details className="text-[10px] text-neutral-400 pt-1">
                    <summary className="cursor-pointer hover:text-neutral-200">O pegar link URL</summary>
                    <input
                      type="url"
                      value={profileForm.logo_url}
                      onChange={(e) => setProfileForm({ ...profileForm, logo_url: e.target.value })}
                      placeholder="https://ejemplo.com/logo.jpg"
                      className="w-full mt-1 bg-[#0a0a0c] border border-white/15 px-3 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-white font-mono"
                    />
                  </details>
                </div>

                {/* Foto de Portada / Banner con selector de galería */}
                <div className="space-y-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                  <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                    <span>Foto de Portada / Banner</span>
                    <span className="text-[10px] text-neutral-400">Panorámica</span>
                  </label>
                  <div className="space-y-2">
                    {profileForm.banner_url && (
                      <div className="w-full h-24 rounded-lg overflow-hidden border border-white/20 bg-black">
                        <img src={profileForm.banner_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/15 hover:border-white text-neutral-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                      <span>📷</span>
                      <span>{uploadingBanner ? "Cargando..." : "Subir Portada desde Galería"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingBanner}
                        onChange={handleBannerGalleryUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <details className="text-[10px] text-neutral-400 pt-1">
                    <summary className="cursor-pointer hover:text-neutral-200">O pegar link URL</summary>
                    <input
                      type="url"
                      value={profileForm.banner_url}
                      onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })}
                      placeholder="https://ejemplo.com/portada.jpg"
                      className="w-full mt-1 bg-[#0a0a0c] border border-white/15 px-3 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-white font-mono"
                    />
                  </details>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    WhatsApp de Contacto *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Ciudad de Despacho *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Banco para Transferencias
                  </label>
                  <input
                    type="text"
                    value={profileForm.bank_name}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Número de Cuenta Bancaria
                  </label>
                  <input
                    type="text"
                    value={profileForm.account_number}
                    onChange={(e) => setProfileForm({ ...profileForm, account_number: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  {savingProfile ? "Guardando..." : "Guardar Cambios de Perfil"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PIE DE SEGURIDAD & PASARELA */}
        <div className="px-6 py-8 text-center space-y-2 border-t border-neutral-900 mt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
            <span>🛡️</span> Compra Directa Wompi & PSE &bull; Envíos asegurados
          </div>
          <p className="text-[11px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Pagos procesados de forma blindada por NERKLEY. Retención automática de comisiones y despacho con transportadora certificada.
          </p>
          <Link
            href="/"
            className="inline-block text-[11px] text-neutral-400 hover:text-white underline pt-1 font-semibold"
          >
            &larr; Volver a la Tienda Principal
          </Link>
        </div>

        {/* ========================================================= */}
        {/* BARRA DE NAVEGACIÓN INFERIOR ESTILO TIKTOK EXACTO */}
        {/* ========================================================= */}
        <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-black/95 backdrop-blur-xl border-t border-white/10 z-50 h-14 flex items-center justify-around px-2 select-none">
          <Link
            href="/"
            className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-white transition-colors"
          >
            <span className="text-lg leading-none">⌂</span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Inicio</span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-white transition-colors"
          >
            <span className="text-lg leading-none">👥</span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Tiendas</span>
          </Link>

          {/* Botón Central TikTok icónico (+) con bordes cyan/blanco/magenta */}
          <div className="flex items-center justify-center flex-1">
            <button
              type="button"
              onClick={() => {
                if (isOwner) {
                  setShowPublishModal(true);
                } else {
                  window.location.href = "/vender";
                }
              }}
              title={isOwner ? "Publicar Prenda" : "Crear mi Boutique"}
              className="relative p-[1.5px] rounded-lg bg-gradient-to-r from-[#00f2fe] via-white to-[#fe2c55] active:scale-90 transition-transform cursor-pointer shadow-md"
            >
              <div className="bg-black px-3.5 py-1 rounded-[6px] flex items-center justify-center">
                <span className="text-white text-base font-black leading-none">+</span>
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-white transition-colors cursor-pointer relative"
          >
            <span className="text-lg leading-none">💬</span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Carrito</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isOwner) {
                setOwnerTab("perfil");
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                window.location.href = "/vender";
              }
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 text-white font-bold transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 bg-neutral-800 flex items-center justify-center">
              {seller.logo_url ? (
                <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-white">👤</span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Perfil</span>
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* MODAL DEL PUBLISHER DASHBOARD (CARGA DE PRENDAS) */}
      {/* ========================================================= */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowPublishModal(false)}
        >
          <div
            className="bg-[#111116] border border-white/20 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
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
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Categoría Streetwear & Estilo *
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white cursor-pointer"
                >
                  {STREETWEAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Descripción de Materiales, Diseño & Caída Urbana *</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Streetwear Spec</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  placeholder="Detalla materiales (ej: algodón 450 GSM, denim rígido 14oz, cuero genuino), confección, caída oversize/baggy y recomendaciones de talla..."
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white"
                />
              </div>

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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Fotos de la Prenda *</span>
                  <span className="text-[10px] text-neutral-400">Desde tu galería o cámara</span>
                </label>

                {/* Botón de subida de galería directo */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-white text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-white/10">
                    <span>📷</span>
                    <span>{uploadingProdImages ? "Procesando fotos de galería..." : "Elegir Fotos de la Galería o Cámara"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingProdImages}
                      onChange={handleProductGalleryUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Previsualización en miniatura de fotos seleccionadas */}
                {newProdImages.trim() ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Fotos listas para publicar ({newProdImages.split(",").filter((s) => s.trim()).length}):
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {newProdImages
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((img, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/20 bg-black group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveProductImage(idx)}
                              title="Eliminar foto"
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer shadow-md"
                            >
                              ✕
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-white text-center font-bold uppercase py-0.5">
                                Principal
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">
                    Pulsa el botón arriba para seleccionar fotos directamente desde tu celular o computadora.
                  </p>
                )}

                {/* Opción alternativa manual de URL (oculta en desplegable compacto) */}
                <details className="text-[11px] text-neutral-400 pt-1">
                  <summary className="cursor-pointer hover:text-neutral-200 select-none">
                    O si prefieres escribir un link URL de imagen (Opcional)
                  </summary>
                  <input
                    type="text"
                    value={newProdImages}
                    onChange={(e) => setNewProdImages(e.target.value)}
                    placeholder="https://ejemplo.com/foto1.jpg, https://ejemplo.com/foto2.jpg"
                    className="w-full mt-1.5 bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-white font-mono"
                  />
                </details>
              </div>

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
                            ? "bg-white text-black shadow-sm"
                            : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                            ? "bg-white text-black shadow-sm"
                            : "bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        {cl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-200">
                    Insignia Destacada (Badge)
                  </label>
                  <select
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-white cursor-pointer"
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
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                  <label htmlFor="freeShippingCheck" className="text-xs text-neutral-200 font-semibold cursor-pointer">
                    🚚 Activar Envío Gratis en esta prenda
                  </label>
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-neutral-300 flex items-center gap-2">
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
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
            className="bg-[#121217] border border-white/15 rounded-2xl w-full max-w-lg p-5 sm:p-7 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200"
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
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Foto o Portada de la Historia *</span>
                  <span className="text-[10px] text-neutral-400">Desde tu galería o cámara</span>
                </label>

                {/* Botón de selección desde galería */}
                <label className="flex items-center justify-center gap-2 bg-white/5 border border-white/15 hover:border-white/40 text-neutral-200 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-white/10">
                  <span>📷</span>
                  <span>{uploadingStoryImage ? "Cargando foto..." : "Elegir Foto de la Galería o Cámara"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingStoryImage}
                    onChange={handleStoryGalleryUpload}
                    className="hidden"
                  />
                </label>

                {/* Previsualización en vivo */}
                {storyImageUrl ? (
                  <div className="relative w-28 h-40 mx-auto rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black group">
                    <img src={storyImageUrl} alt="Preview historia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setStoryImageUrl("")}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer shadow"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white font-bold uppercase">
                      Vista previa
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic text-center">
                    Selecciona una foto de tu prenda o lookbook para que aparezca en el círculo de historias.
                  </p>
                )}

                {/* Opción manual URL */}
                <details className="text-[11px] text-neutral-400 pt-1">
                  <summary className="cursor-pointer hover:text-neutral-200 select-none">
                    O pegar enlace URL de imagen (Opcional)
                  </summary>
                  <input
                    type="url"
                    value={storyImageUrl}
                    onChange={(e) => setStoryImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/foto-historia.jpg"
                    className="w-full mt-1.5 bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-white/40 font-mono"
                  />
                </details>
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
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-200">
                  Vincular Prenda de tu Catálogo (Compra Directa)
                </label>
                <select
                  value={storyLinkedSlug}
                  onChange={(e) => setStoryLinkedSlug(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-white/40 cursor-pointer"
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
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <span>📸</span>
                  <span>{isPublishingStory ? "Subiendo Historia..." : "Publicar Historia"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISOR MODAL DE HISTORIAS */}
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

            <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30 bg-black">
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

              <div className="flex items-center gap-2">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(stories[activeStoryIndex].id)}
                    className="w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-xs cursor-pointer shadow"
                    title="Eliminar esta historia"
                  >
                    🗑️
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeStory}
                  className="w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <img
                src={stories[activeStoryIndex].image_url}
                alt=""
                className="w-full h-full object-contain"
              />

              <div
                className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={handlePrevStory}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
                onClick={handleNextStory}
              />
            </div>

            <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/85 to-transparent space-y-3">
              {stories[activeStoryIndex].caption && (
                <p className="text-white text-xs sm:text-sm font-medium drop-shadow-md leading-relaxed">
                  {stories[activeStoryIndex].caption}
                </p>
              )}

              {stories[activeStoryIndex].product_name && (
                <div className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-between gap-3 shadow-lg">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-300 font-bold block">
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
                    className="bg-white hover:bg-neutral-200 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 active:scale-95 flex items-center gap-1.5"
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
      {/* MODAL DETALLE DE PRENDA ESTILO TIKTOK PRODUCT SHEET */}
      {/* ========================================================= */}
      {selectedProductModal && (
        <div
          className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in"
          onClick={() => setSelectedProductModal(null)}
        >
          <div
            className="bg-[#121217] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[88vh] overflow-y-auto p-5 space-y-4 shadow-2xl relative my-0 sm:my-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden mb-2" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  {selectedProductModal.category || "Streetwear Exclusivo"}
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  {selectedProductModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Imagen Principal */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/10">
              <img
                src={selectedProductModal.images?.split(",")[0]?.trim() || ""}
                alt={selectedProductModal.name}
                className="w-full h-full object-cover"
              />
              {selectedProductModal.discount_percent && selectedProductModal.discount_percent > 0 && (
                <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                  -{selectedProductModal.discount_percent}% OFF
                </span>
              )}
            </div>

            {/* Precio & Tallas */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Precio Oficial</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono font-black text-white">
                    $ {Number(selectedProductModal.sale_price).toLocaleString("es-CO")} COP
                  </span>
                  {selectedProductModal.original_price && selectedProductModal.original_price > selectedProductModal.sale_price && (
                    <span className="text-xs text-neutral-500 line-through">
                      $ {Number(selectedProductModal.original_price).toLocaleString("es-CO")}
                    </span>
                  )}
                </div>
              </div>

              {selectedProductModal.sizes && (
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Tallas</span>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {selectedProductModal.sizes.split(",").map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            {selectedProductModal.description && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Detalles & Confección
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedProductModal.description}
                </p>
              </div>
            )}

            {/* Botones de Compra Directa & Carrito */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleBuyNow(selectedProductModal);
                  setSelectedProductModal(null);
                }}
                className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>Compra Directa con Wompi / PSE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAddDirect(selectedProductModal);
                  setSelectedProductModal(null);
                }}
                className="w-full bg-[#1c1c24] hover:bg-[#252530] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛒</span>
                <span>Añadir al Carrito</span>
              </button>
            </div>
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
