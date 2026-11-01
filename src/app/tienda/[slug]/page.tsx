"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, use, useMemo, Suspense, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import {
  getSellerBySlug,
  getSellerProducts,
  getSellerStories,
  saveSellerStory,
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
      {/* BARRA SUPERIOR DE CONTROL (SOLO LA VE EL DUEÑO) */}
      {/* ========================================================= */}
      {isOwner && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-amber-500/25 via-[#1a1710] to-amber-500/25 border-b border-amber-400/40 backdrop-blur-md px-4 py-2.5 shadow-2xl animate-in fade-in">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-serif font-bold text-amber-300 uppercase tracking-wider block">
                  👑 Eres el Dueño de esta Boutique &bull; Panel de Gestión Activo
                </span>
                <span className="text-[10px] text-neutral-400 hidden sm:inline">
                  Los compradores solo ven tu tienda pública. Solo tú tienes acceso a tus pedidos y billetera.
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
                <span>+ Subir Story</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(232,198,98,0.4)] active:scale-95 cursor-pointer ring-2 ring-amber-300"
              >
                <span>✨</span>
                <span>+ Publicar Prenda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CABECERA DE PERFIL SOCIAL (PORTADA & PERFIL) */}
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

        {/* CONTENEDOR DE PERFIL */}
        <div className="max-w-6xl mx-auto px-4 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
            {/* AVATAR + DETALLES BÁSICOS */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* FOTO DE PERFIL / AVATAR */}
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
                    Ver Stories
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

            {/* BOTONES SOCIALES */}
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

              <button
                type="button"
                onClick={() => {
                  setOwnerTab("productos");
                  const el = document.getElementById("seccion-contenido");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span>🛍️</span>
                <span>Prendas ({products.length})</span>
              </button>
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
      {/* BANDEJA DE HISTORIAS / STORIES FEED */}
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

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none items-center">
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
                  {st.product_name || `Story ${idx + 1}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECCIÓN PRINCIPAL: PESTAÑAS DE VENDEDOR O CATÁLOGO */}
      {/* ========================================================= */}
      <main id="seccion-contenido" className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* NAVEGACIÓN DE PESTAÑAS: SOLO LA VE EL CREADOR DE LA BOUTIQUE */}
        {isOwner && (
          <div className="border-b border-white/15 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setOwnerTab("productos")}
              className={`pb-3 px-3 text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer relative shrink-0 flex items-center gap-2 ${
                ownerTab === "productos"
                  ? "text-amber-300"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>🛍️</span>
              <span>Catálogo de Productos ({products.length})</span>
              {ownerTab === "productos" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(232,198,98,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setOwnerTab("pedidos")}
              className={`pb-3 px-3 text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer relative shrink-0 flex items-center gap-2 ${
                ownerTab === "pedidos"
                  ? "text-amber-300"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>📦</span>
              <span>Mis Pedidos & Despachos ({sellerOrders.length})</span>
              {ownerTab === "pedidos" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(232,198,98,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setOwnerTab("billetera")}
              className={`pb-3 px-3 text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer relative shrink-0 flex items-center gap-2 ${
                ownerTab === "billetera"
                  ? "text-amber-300"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>💰</span>
              <span>Billetera & Retiros</span>
              {ownerTab === "billetera" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(232,198,98,0.8)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setOwnerTab("perfil")}
              className={`pb-3 px-3 text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer relative shrink-0 flex items-center gap-2 ${
                ownerTab === "perfil"
                  ? "text-amber-300"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>👤</span>
              <span>Editar Portada & Perfil</span>
              {ownerTab === "perfil" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(232,198,98,0.8)]" />
              )}
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 1: CATÁLOGO DE PRODUCTOS (VISTA DE TIENDA) */}
        {/* ========================================================= */}
        {(!isOwner || ownerTab === "productos") && (
          <div className="space-y-6">
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

            {/* FILTROS Y BÚSQUEDA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

            {/* GRID DE PRODUCTOS */}
            {filteredProducts.length === 0 ? (
              <div className="p-16 text-center border border-white/10 bg-white/5 rounded-2xl space-y-3">
                <span className="text-4xl">🛍️</span>
                <p className="text-sm font-semibold text-white">No se encontraron prendas con este criterio</p>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  {isOwner
                    ? "Aún no tienes prendas en este filtro. ¡Haz clic en 'Publicar Prenda' para subir tu primer drop!"
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
                {/* Si es el dueño, tarjeta para agregar producto directo */}
                {isOwner && (
                  <div
                    onClick={() => setShowPublishModal(true)}
                    className="border-2 border-dashed border-amber-400/40 hover:border-amber-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer group bg-amber-400/5 hover:bg-amber-400/10 transition-all min-h-[360px]"
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      +
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Publicar Nueva Prenda
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                        Agrega buzos, jeans baggy, calzado o accesorios a tu catálogo oficial.
                      </p>
                    </div>
                  </div>
                )}

                {filteredProducts.map((prod) => {
                  const img = prod.images ? prod.images.split(",")[0].trim() : null;
                  return (
                    <div
                      key={prod.id}
                      className="bg-[#111116] border border-white/10 hover:border-amber-400/40 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-md hover:shadow-2xl"
                    >
                      <div>
                        {/* FOTO DE LA PRENDA */}
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

                          {prod.discount_percent && prod.discount_percent > 0 ? (
                            <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                              -{prod.discount_percent}% OFF
                            </div>
                          ) : null}

                          {prod.badge && (
                            <div className="absolute top-3 right-3 bg-amber-400/90 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow">
                              {prod.badge}
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1.5 shadow">
                            <span>⭐</span>
                            <span>{seller.store_name}</span>
                          </div>
                        </Link>

                        {/* DETALLES */}
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

                      {/* BOTONES DE COMPRA O GESTIÓN */}
                      <div className="p-4 pt-0 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
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

                        {/* Botones de Administrador (SOLO VISIBLES PARA EL DUEÑO) */}
                        {isOwner && (
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setNewProdName(prod.name);
                                setNewProdCategory(prod.category);
                                setNewProdDescription(prod.description || "");
                                setNewProdPrice(String(prod.sale_price));
                                setNewProdOriginalPrice(prod.original_price ? String(prod.original_price) : "");
                                setNewProdStock(String(prod.stock || 10));
                                setNewProdImages(prod.images || "");
                                setNewProdSizes(prod.sizes || "");
                                setNewProdColors(prod.colors || "");
                                setNewProdBadge(prod.badge || "");
                                setShowPublishModal(true);
                              }}
                              className="text-amber-400 hover:underline cursor-pointer font-bold"
                            >
                              ✏️ Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="text-red-400 hover:underline cursor-pointer"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 2: MIS PEDIDOS & DESPACHOS (SOLO PARA EL DUEÑO) */}
        {/* ========================================================= */}
        {isOwner && ownerTab === "pedidos" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📦</span>
                <span>Pedidos Recibidos para {seller.store_name} ({sellerOrders.length})</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Cuando un comprador adquiere un producto de tu boutique con Compra Directa Wompi/PSE, aparece listado aquí para que prepares el despacho y asignes tu número de guía.
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
                          <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-widest font-mono">
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
                            className="bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
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
                            className="bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400 flex-1 min-w-[180px]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveShippingGuide(o.id, currentCompany, currentGuide)}
                          className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
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
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-xl font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>💰</span>
                <span>Billetera Financiera & Retiros Bancarios</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Administración de fondos recaudados con Wompi / PSE y división automática de comisiones.
              </p>
            </div>

            {/* TARJETAS DE SALDOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c1811] to-[#111116] border border-amber-400/40 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                  ⏳ En Custodia Escrow (Por Entregar)
                </span>
                <span className="text-2xl font-mono font-black text-white block">
                  $ {walletMetrics.pending.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Fondos protegidos mientras la transportadora entrega los paquetes a los clientes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0e1f14] to-[#111116] border border-emerald-500/40 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                  💰 Saldo Disponible para Retiro
                </span>
                <span className="text-2xl font-mono font-black text-emerald-400 block">
                  $ {walletMetrics.available.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Fondos liberados tras entrega satisfactoria confirmada.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#14141c] to-[#111116] border border-white/15 space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider block">
                  📈 Total Generado
                </span>
                <span className="text-2xl font-mono font-bold text-white block">
                  $ {walletMetrics.totalEarned.toLocaleString("es-CO")} COP
                </span>
                <p className="text-[10px] text-neutral-400">
                  Histórico acumulado de ventas netas de tu boutique.
                </p>
              </div>
            </div>

            {/* DATOS BANCARIOS REGISTRADOS & SOLICITUD DE RETIRO */}
            <div className="bg-[#111116] border border-white/10 p-6 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Cuenta Bancaria para Transferencias
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {seller.bank_name} &bull; {seller.account_type} &bull; {seller.account_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerTab("perfil")}
                  className="text-xs text-amber-400 hover:underline cursor-pointer font-bold"
                >
                  Cambiar cuenta &rarr;
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
                className="w-full bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Categoría Principal
                  </label>
                  <select
                    value={profileForm.category}
                    onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Foto de Perfil / Avatar con selector de galería */}
                <div className="space-y-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                  <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                    <span>Foto de Perfil / Logo</span>
                    <span className="text-[10px] text-neutral-400">Circular</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-black border-2 border-amber-400 flex items-center justify-center shrink-0">
                      {profileForm.logo_url ? (
                        <img src={profileForm.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-500 font-bold">Sin foto</span>
                      )}
                    </div>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/15 hover:border-amber-400 text-neutral-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all">
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
                      className="w-full mt-1 bg-[#0a0a0c] border border-white/15 px-3 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono"
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
                    <label className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/15 hover:border-amber-400 text-neutral-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all">
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
                      className="w-full mt-1 bg-[#0a0a0c] border border-white/15 px-3 py-1.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {savingProfile ? "Guardando..." : "Guardar Cambios de Perfil"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* BANNER INFORMATIVO DE SEGURIDAD (ESCROW / SPLIT PAYMENT) */}
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
      {/* BOTÓN FLOTANTE RÁPIDO PARA EL VENDEDOR */}
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
      {/* MODAL DEL PUBLISHER DASHBOARD (CARGA DE PRENDAS) */}
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

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Fotos de la Prenda *</span>
                  <span className="text-[10px] text-neutral-400">Desde tu galería o cámara</span>
                </label>

                {/* Botón de subida de galería directo */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400/20 via-amber-400/10 to-transparent border border-amber-400/50 hover:border-amber-400 text-amber-300 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-amber-400/25">
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
                              <span className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-amber-300 text-center font-bold uppercase py-0.5">
                                Principal
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">
                    Pulsa el botón dorado arriba para seleccionar fotos directamente desde tu celular o computadora.
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
                    className="w-full mt-1.5 bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono"
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
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-200 flex items-center justify-between">
                  <span>Foto o Portada de la Historia *</span>
                  <span className="text-[10px] text-neutral-400">Desde tu galería o cámara</span>
                </label>

                {/* Botón de selección desde galería */}
                <label className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400/20 via-amber-400/10 to-transparent border border-amber-400/50 hover:border-amber-400 text-amber-300 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-amber-400/25">
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
                  <div className="relative w-28 h-40 mx-auto rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg bg-black group">
                    <img src={storyImageUrl} alt="Preview historia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setStoryImageUrl("")}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer shadow"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-amber-300 font-bold uppercase">
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
                    className="w-full mt-1.5 bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 font-mono"
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
