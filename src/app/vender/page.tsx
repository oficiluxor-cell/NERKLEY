"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { COLOMBIA_REGIONS, hasFreeShipping, extractDisplayBadge, buildProductBadge } from "@/lib/shipping";
import {
  getProductPresentation,
  isProductCombo,
  buildPresentationBadge,
  cleanCustomBadgeText,
  ProductPresentationType,
} from "@/lib/presentation";
import {
  parseCategory,
  buildFullCategory,
  getProductSubcategory,
  SUGGESTED_SUBCATEGORIES,
} from "@/lib/categories";
import {
  Seller,
  registerNewSeller,
  loginSeller,
  getFreshSellerSession,
  logoutSeller,
  calculateOrderCommission,
} from "@/lib/marketplace";
import ImageGalleryUploader from "@/components/ImageGalleryUploader";

const COMMON_CATEGORIES = ["Perfumes", "Ropa", "Zapatos", "Relojes", "Oro", "Joyería"];

const BADGE_PRESETS = [
  "⭐ Top Ventas",
  "🔥 Edición Limitada",
  "💎 Colección Exclusiva",
  "✨ Nuevo Lanzamiento",
  "⚡ Oferta Especial",
  "🏷️ Combo Ahorro",
  "💯 100% Original",
  "👑 Premium",
];

const SIZE_PRESETS = [
  "S", "M", "L", "XL", "XXL",
  "38", "39", "40", "41", "42", "43",
  "30ml", "50ml", "100ml", "200ml",
  "Talla Única",
];

const COLOR_PRESETS = [
  "Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Dorado", "Plateado", "Beige", "Café",
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

function extractSellerVideo(bio?: string | null): { cleanBio: string; videoUrl: string | null } {
  if (!bio) return { cleanBio: "", videoUrl: null };
  const match = bio.match(/\[video:\s*([^\]]+)\]/i);
  if (match) {
    const videoUrl = match[1].trim();
    const cleanBio = bio.replace(/\[video:\s*([^\]]+)\]/gi, "").trim();
    return { cleanBio, videoUrl };
  }
  return { cleanBio: bio, videoUrl: null };
}

export default function VenderPage() {
  const [sellerSession, setSellerSession] = useState<Seller | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "register" | "login">("register");
  const [initialLoading, setInitialLoading] = useState(true);

  // Estados de Registro
  const [regData, setRegData] = useState({
    store_name: "",
    owner_name: "",
    owner_document: "",
    phone: "",
    email: "",
    password: "",
    department: "Antioquia",
    city: "Medellín",
    category: "Perfumería & Fragancias",
    bank_name: "Bancolombia",
    account_number: "",
    account_type: "Ahorros",
    bio: "",
  });

  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityText, setCustomCityText] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de Panel de Vendedor
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [activeSellerTab, setActiveSellerTab] = useState<"productos" | "pedidos" | "billetera" | "perfil">("productos");
  const [isCreatingProduct, setIsCreatingProduct] = useState(true);
  const [guideInputs, setGuideInputs] = useState<Record<string, { company?: string; guide?: string }>>({});

  // Estados para Edición de Perfil de Vendedor
  const [profileForm, setProfileForm] = useState({
    store_name: "",
    owner_name: "",
    owner_document: "",
    phone: "",
    email: "",
    city: "Medellín",
    department: "Antioquia",
    category: "Perfumería & Fragancias",
    bio: "",
    video_url: "",
    logo_url: "",
    banner_url: "",
    bank_name: "Bancolombia",
    account_number: "",
    account_type: "Ahorros",
    new_password: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);

  // Formulario de Nuevo Producto de Vendedor con todas las herramientas de nivel Admin
  const [newProdName, setNewProdName] = useState("");
  const [newProdBasePrice, setNewProdBasePrice] = useState("");
  const [newProdDiscountPercent, setNewProdDiscountPercent] = useState("");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdCategory, setNewProdCategory] = useState("Perfumes");
  const [newProdSubcategory, setNewProdSubcategory] = useState("");
  const [newProdPresentation, setNewProdPresentation] = useState<"unidad" | "combo">("unidad");
  const [newProdIsFreeShipping, setNewProdIsFreeShipping] = useState(false);
  const [newProdBadge, setNewProdBadge] = useState("");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImages, setNewProdImages] = useState("");
  const [newProdSizes, setNewProdSizes] = useState("");
  const [newProdColors, setNewProdColors] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Estados para Edición de Producto Existente por el Vendedor
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    basePrice: string;
    discountPercent: string;
    stock: string;
    category: string;
    subcategory: string;
    badge: string;
    isFreeShipping: boolean;
    presentation: "unidad" | "combo";
    sizes: string;
    colors: string;
    images: string;
    description: string;
    is_active: boolean;
  }>({
    name: "",
    basePrice: "",
    discountPercent: "0",
    stock: "10",
    category: "Perfumes",
    subcategory: "",
    badge: "",
    isFreeShipping: false,
    presentation: "unidad",
    sizes: "",
    colors: "",
    images: "",
    description: "",
    is_active: true,
  });

  // Cargar sesión del vendedor al montar
  useEffect(() => {
    async function initSession() {
      setInitialLoading(true);
      const session = await getFreshSellerSession();
      if (session) {
        setSellerSession(session);
        setViewMode("dashboard");
        loadSellerData(session.id, session.store_name);
      } else {
        setViewMode("register");
      }
      setInitialLoading(false);
    }
    initSession();
  }, []);

  const loadSellerData = async (sellerId: string, storeName: string) => {
    // 1. Cargar productos de este vendedor
    try {
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .or(`seller_id.eq.${sellerId},seller_name.eq.${storeName}`)
        .order("created_at", { ascending: false });

      if (prods) setSellerProducts(prods);
    } catch (e) {
      console.warn("Error cargando productos de vendedor:", e);
    }

    // 2. Cargar pedidos
    try {
      const { data: ords } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ords) {
        // Filtrar pedidos que incluyan el nombre de este vendedor o productos suyos
        const matched = ords.filter((o) =>
          o.product_name?.toLowerCase().includes(storeName.toLowerCase()) ||
          o.notes?.toLowerCase().includes(storeName.toLowerCase())
        );
        setSellerOrders(matched);
      }
    } catch (e) {
      console.warn("Error cargando pedidos de vendedor:", e);
    }
  };

  // Sincronización Automática en Tiempo Real sin recargar
  useEffect(() => {
    if (!sellerSession?.id) return;

    const channel = supabase
      .channel(`seller_realtime_${sellerSession.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadSellerData(sellerSession.id, sellerSession.store_name);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadSellerData(sellerSession.id, sellerSession.store_name);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, async () => {
        const refreshed = await getFreshSellerSession();
        if (refreshed) setSellerSession(refreshed);
      })
      .subscribe();

    // Sincronización silenciosa en segundo plano cada 6 segundos
    const interval = setInterval(() => {
      loadSellerData(sellerSession.id, sellerSession.store_name);
    }, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [sellerSession?.id, sellerSession?.store_name]);

  // Cálculos dinámicos de billetera para el vendedor (Garantía Escrow vs Disponible)
  const sellerWalletTotals = useMemo(() => {
    let pending = 0;
    let available = 0;
    const commission = sellerSession?.commission_rate ?? 12;

    sellerOrders.forEach((o) => {
      const isPaid = o.status === "Pagado / En Preparación" || o.status === "En Despacho / Enviado" || o.status === "Entregado" || o.status === "Pagado";
      if (!isPaid) return;
      const total = Number(o.total_price) || 0;
      const { sellerNet } = calculateOrderCommission(total, commission);
      if (o.notes?.includes("FONDOS_LIBERADOS")) {
        available += sellerNet;
      } else {
        pending += sellerNet;
      }
    });

    return { pending, available };
  }, [sellerOrders, sellerSession]);

  const handleSaveShippingGuide = async (orderId: string, company: string, guide: string) => {
    if (!guide.trim()) {
      alert("Por favor ingresa el número de guía asignado por la transportadora.");
      return;
    }

    try {
      const order = sellerOrders.find((o) => o.id === orderId);
      const noteTag = `[Guía asignada: ${company} - ${guide.trim()} por ${sellerSession?.store_name || "Vendedor"}]`;
      const updatedNotes = order?.notes ? `${order.notes} ${noteTag}` : noteTag;

      const { error } = await supabase
        .from("orders")
        .update({
          transport_company: company,
          shipping_guide: guide.trim(),
          status: "En Despacho / Enviado",
          notes: updatedNotes,
        })
        .eq("id", orderId);

      if (error) throw error;

      setSellerOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, transport_company: company, shipping_guide: guide.trim(), status: "En Despacho / Enviado", notes: updatedNotes }
            : o
        )
      );

      alert("¡Guía guardada con éxito! La administración de NERKLEY rastreará la entrega para liberar tus fondos.");
    } catch (err: any) {
      alert("Error al guardar guía: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setErrorMessage("");

    const finalCity = isCustomCity ? customCityText.trim() : regData.city.trim();
    if (!finalCity) {
      setErrorMessage("Por favor indica la ciudad o municipio de despacho.");
      setRegLoading(false);
      return;
    }

    const res = await registerNewSeller({
      ...regData,
      city: finalCity,
    });

    setRegLoading(false);
    if (res.success && res.seller) {
      setSellerSession(res.seller);
      setViewMode("dashboard");
      setSuccessMessage("¡Tu boutique ha sido registrada con éxito!");
    } else {
      setErrorMessage(res.error || "Ocurrió un error al enviar tu solicitud. Intenta nuevamente.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setErrorMessage("");

    const res = await loginSeller(loginEmail, loginPassword);
    setLoginLoading(false);

    if (res.success && res.seller) {
      setSellerSession(res.seller);
      setViewMode("dashboard");
      loadSellerData(res.seller.id, res.seller.store_name);
    } else {
      setErrorMessage(res.error || "Credenciales incorrectas.");
    }
  };

  const handleLogout = () => {
    logoutSeller();
    setSellerSession(null);
    setViewMode("login");
  };

  const handleRefreshStatus = async () => {
    setInitialLoading(true);
    const refreshed = await getFreshSellerSession();
    if (refreshed) {
      setSellerSession(refreshed);
      loadSellerData(refreshed.id, refreshed.store_name);
    }
    setInitialLoading(false);
  };

  const handleQuickDemoAccess = () => {
    const demoSession: Seller = {
      id: "demo-boutique-official",
      store_name: "Boutique Oficial",
      slug: "boutique-oficial",
      owner_name: "Vendedor NERKLEY",
      owner_document: "123456789",
      phone: "3001234567",
      email: "vendedor@nerkley.com",
      city: "Medellín",
      department: "Antioquia",
      category: "Perfumería & Fragancias",
      bank_name: "Bancolombia",
      account_number: "1234567890",
      account_type: "Ahorros",
      status: "verified",
      is_verified: true,
      commission_rate: 12,
      rating: 5,
      total_sales_count: 0,
      created_at: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("NERKLEY_seller_session", JSON.stringify(demoSession));
    }
    setSellerSession(demoSession);
    setViewMode("dashboard");
    setIsCreatingProduct(true);
    loadSellerData(demoSession.id, demoSession.store_name);
  };

  // Sincronizar datos de perfil cuando la sesión esté disponible
  useEffect(() => {
    if (sellerSession) {
      const { cleanBio, videoUrl } = extractSellerVideo(sellerSession.bio);
      setProfileForm({
        store_name: sellerSession.store_name || "",
        owner_name: sellerSession.owner_name || "",
        owner_document: sellerSession.owner_document || "",
        phone: sellerSession.phone || "",
        email: sellerSession.email || "",
        city: sellerSession.city || "Medellín",
        department: sellerSession.department || "Antioquia",
        category: sellerSession.category || "Perfumería & Fragancias",
        bio: cleanBio || "",
        video_url: sellerSession.video_url || videoUrl || "",
        logo_url: sellerSession.logo_url || "",
        banner_url: sellerSession.banner_url || "",
        bank_name: sellerSession.bank_name || "Bancolombia",
        account_number: sellerSession.account_number || "",
        account_type: sellerSession.account_type || "Ahorros",
        new_password: "",
      });
    }
  }, [sellerSession]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerSession) return;

    setSavingProfile(true);
    setProfileSuccessMsg("");
    try {
      let finalBio = profileForm.bio.trim();
      if (profileForm.video_url.trim()) {
        finalBio = `${finalBio}\n[video: ${profileForm.video_url.trim()}]`.trim();
      }

      const updateData: any = {
        store_name: profileForm.store_name.trim(),
        owner_name: profileForm.owner_name.trim(),
        owner_document: profileForm.owner_document.trim(),
        phone: profileForm.phone.trim(),
        city: profileForm.city.trim(),
        department: profileForm.department.trim(),
        category: profileForm.category.trim(),
        bio: finalBio,
        logo_url: profileForm.logo_url.trim() || null,
        banner_url: profileForm.banner_url.trim() || null,
        bank_name: profileForm.bank_name.trim(),
        account_number: profileForm.account_number.trim(),
        account_type: profileForm.account_type.trim(),
      };

      if (profileForm.new_password.trim()) {
        updateData.password = profileForm.new_password.trim();
      }

      const { error } = await supabase
        .from("sellers")
        .update(updateData)
        .eq("id", sellerSession.id);

      if (error) throw error;

      const updatedSession: Seller = {
        ...sellerSession,
        ...updateData,
        video_url: profileForm.video_url.trim() || null,
      };

      setSellerSession(updatedSession);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("NERKLEY_seller_session", JSON.stringify(updatedSession));
      }

      setProfileSuccessMsg("¡Perfil de tu Boutique actualizado con éxito!");
      setTimeout(() => setProfileSuccessMsg(""), 4500);
    } catch (err: any) {
      alert("Error al actualizar perfil: " + (err.message || JSON.stringify(err)));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateSellerProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerSession) return;

    setSavingProduct(true);
    try {
      const initialPrice = parseFloat(newProdBasePrice) || 0;
      const discount = newProdDiscountPercent ? parseFloat(newProdDiscountPercent) : 0;
      const initialStock = parseInt(newProdStock) || 0;

      const finalSalePrice = discount > 0 ? Math.round(initialPrice * (1 - discount / 100)) : initialPrice;
      const storedOriginalPrice = discount > 0 ? initialPrice : null;

      // Normalizar slug limpiando acentos y caracteres especiales (anti-duplicados)
      const rawSlugBase = newProdName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");

      let targetSlug = rawSlugBase || `producto-${Date.now()}`;

      // Validar si el slug ya existe en Supabase y agregar sufijo único si es necesario
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("slug", targetSlug)
        .maybeSingle();

      if (existingProduct) {
        const shortSuffix = Math.random().toString(36).substring(2, 6);
        targetSlug = `${targetSlug}-${shortSuffix}`;
      }

      const fullCategory = buildFullCategory(newProdCategory, newProdSubcategory);
      const finalBadge = buildPresentationBadge(newProdBadge, newProdPresentation, newProdIsFreeShipping);

      const newProd = {
        name: newProdName.trim(),
        slug: targetSlug,
        description: newProdDescription.trim(),
        sale_price: finalSalePrice,
        original_price: storedOriginalPrice,
        discount_percent: discount,
        category: fullCategory,
        images: newProdImages.trim(),
        sizes: newProdSizes.trim(),
        colors: newProdColors.trim(),
        stock: initialStock,
        is_active: true,
        badge: finalBadge,
        seller_id: sellerSession.id,
        seller_name: sellerSession.store_name,
        is_official: false,
      };

      let { data, error } = await supabase.from("products").insert([newProd]).select().single();

      // Reintento automático de seguridad si colisiona la clave única
      if (error && error.message?.includes("products_slug_key")) {
        const retrySlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
        const retryRes = await supabase
          .from("products")
          .insert([{ ...newProd, slug: retrySlug }])
          .select()
          .single();
        error = retryRes.error;
        data = retryRes.data;
      }

      if (error) throw error;

      if (data) {
        setSellerProducts((prev) => [data, ...prev]);
        setIsCreatingProduct(false);
        setNewProdName("");
        setNewProdBasePrice("");
        setNewProdDiscountPercent("");
        setNewProdStock("10");
        setNewProdCategory("Perfumes");
        setNewProdSubcategory("");
        setNewProdPresentation("unidad");
        setNewProdIsFreeShipping(false);
        setNewProdBadge("");
        setNewProdSizes("");
        setNewProdColors("");
        setNewProdImages("");
        setNewProdDescription("");
        alert("¡Producto publicado exitosamente en tu boutique!");
      }
    } catch (err: any) {
      alert("Error al publicar producto: " + (err.message || JSON.stringify(err)));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleOpenEditProduct = (prod: any) => {
    const base = prod.original_price || prod.sale_price;
    const isFree = hasFreeShipping(prod);
    const cleanBadge = cleanCustomBadgeText(prod.badge);
    const pres = getProductPresentation(prod);
    const { mainCategory, subcategory: productSub } = parseCategory(prod.category);
    const inferredSub = productSub || getProductSubcategory(prod);

    const initialPrice = Number(base) || 0;
    const currentSalePrice = Number(prod.sale_price) || 0;
    let disc = prod.discount_percent ? String(prod.discount_percent) : "0";
    if (!prod.discount_percent && prod.original_price && prod.original_price > currentSalePrice && initialPrice > 0) {
      disc = String(Math.round(((prod.original_price - currentSalePrice) / prod.original_price) * 100));
    }

    setEditingProduct(prod);
    setEditForm({
      name: prod.name || "",
      basePrice: String(base || ""),
      discountPercent: disc,
      stock: String(prod.stock ?? 10),
      category: mainCategory,
      subcategory: inferredSub,
      badge: cleanBadge,
      isFreeShipping: isFree,
      presentation: pres,
      sizes: prod.sizes || "",
      colors: prod.colors || "",
      images: prod.images || "",
      description: prod.description || "",
      is_active: prod.is_active !== false,
    });
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingEdit(true);
    try {
      const initialPrice = parseFloat(editForm.basePrice) || 0;
      const discount = parseFloat(editForm.discountPercent) || 0;
      const finalSalePrice = discount > 0 ? Math.round(initialPrice * (1 - discount / 100)) : initialPrice;
      const storedOriginalPrice = discount > 0 ? initialPrice : null;
      const fullCategory = buildFullCategory(editForm.category, editForm.subcategory);
      const finalBadge = buildPresentationBadge(editForm.badge, editForm.presentation, editForm.isFreeShipping);

      const updatedPayload = {
        name: editForm.name.trim(),
        sale_price: finalSalePrice,
        original_price: storedOriginalPrice,
        discount_percent: discount,
        category: fullCategory,
        stock: Number(editForm.stock) || 0,
        sizes: editForm.sizes.trim(),
        colors: editForm.colors.trim(),
        images: editForm.images,
        description: editForm.description.trim(),
        is_active: editForm.is_active,
        badge: finalBadge,
      };

      const { error } = await supabase
        .from("products")
        .update(updatedPayload)
        .eq("id", editingProduct.id);

      if (error) throw error;

      setSellerProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updatedPayload } : p))
      );
      setEditingProduct(null);
      alert("¡Producto actualizado exitosamente!");
    } catch (err: any) {
      alert("Error al guardar cambios: " + (err.message || JSON.stringify(err)));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSellerProduct = async (productId: string, productName: string) => {
    const confirmDelete = window.confirm(
      `¿Confirmas que deseas eliminar permanentemente el producto "${productName}" de tu boutique?\n\nEsta acción no se puede deshacer y el artículo se retirará de la tienda pública.`
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;

      setSellerProducts((prev) => prev.filter((p) => p.id !== productId));
      alert(`¡El producto "${productName}" ha sido eliminado exitosamente!`);
    } catch (err: any) {
      alert("Error al eliminar producto: " + (err.message || JSON.stringify(err)));
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-400 uppercase tracking-widest">Cargando Portal de Vendedores...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA: PANEL DE VENDEDOR LOGUEADO
  // ==========================================
  if (sellerSession && viewMode === "dashboard") {
    const isVerified = sellerSession.status === "verified" || sellerSession.is_verified;
    const isPending = sellerSession.status === "pending";
    const commission = sellerSession.commission_rate ?? 12;

    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-amber-400 selection:text-black">
        {/* BARRA SUPERIOR DE BOUTIQUE */}
        <header className="border-b border-white/10 bg-[#0d0d12]/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-serif tracking-[0.25em] font-bold text-sm text-white hover:text-amber-300 transition-colors">
                NERKLEY
              </Link>
              <span className="text-neutral-600">/</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase text-amber-300">{sellerSession.store_name}</span>
                {isVerified ? (
                  <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    ⭐ Verificado
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    ⏳ En Revisión
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Link href="/" className="text-neutral-400 hover:text-white transition-colors hidden sm:inline">
                Ver Tienda
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white px-3 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* BANNER SI ESTÁ EN REVISIÓN */}
          {isPending && (
            <div className="p-6 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-4 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⏳</span>
                    <h2 className="text-base sm:text-lg font-bold text-amber-300 font-serif uppercase tracking-wider">
                      Boutique en Proceso de Auditoría & Verificación
                    </h2>
                  </div>
                  <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
                    Tu postulación está siendo revisada por el equipo de <strong>NERKLEY Concierge</strong> para garantizar la autenticidad y seriedad comercial. En cuanto el Super Admin apruebe tu boutique en el panel, se habilitará la publicación de productos para todo el público.
                  </p>
                </div>

                <button
                  onClick={handleRefreshStatus}
                  className="bg-amber-400 text-black hover:bg-amber-300 px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-md"
                >
                  🔄 Comprobar Estado
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-400/20 text-xs">
                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Titular:</span>
                  <span className="font-semibold text-white">{sellerSession.owner_name} ({sellerSession.owner_document})</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">WhatsApp:</span>
                  <span className="font-semibold text-white">{sellerSession.phone}</span>
                </div>
                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Cuenta de Pago:</span>
                  <span className="font-semibold text-white">{sellerSession.bank_name} - No. {sellerSession.account_number}</span>
                </div>
              </div>
            </div>
          )}

          {/* BANNER SI ESTÁ VERIFICADO OFICIAL */}
          {isVerified && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111116] border border-white/10 p-5 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block">
                  Mis Productos
                </span>
                <p className="text-2xl font-bold font-mono text-white">
                  {sellerProducts.length} <span className="text-xs text-neutral-400">Publicados</span>
                </p>
                <p className="text-[10px] text-neutral-500">Visibles en el catálogo nacional</p>
              </div>

              <div className="bg-[#111116] border border-amber-400/30 p-5 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block flex items-center gap-1">
                  <span>🔒</span> Saldo en Garantía
                </span>
                <p className="text-2xl font-bold font-mono text-amber-300">
                  $ {sellerWalletTotals.pending.toLocaleString("es-CO")} <span className="text-xs text-neutral-400">COP</span>
                </p>
                <p className="text-[10px] text-neutral-400">Dinero retenido de pedidos en camino</p>
              </div>

              <div className="bg-[#111116] border border-emerald-500/30 p-5 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block flex items-center gap-1">
                  <span>💰</span> Saldo Disponible
                </span>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  $ {sellerWalletTotals.available.toLocaleString("es-CO")} <span className="text-xs text-neutral-400">COP</span>
                </p>
                <p className="text-[10px] text-neutral-400">Listo para retirar a {sellerSession.bank_name}</p>
              </div>

              <div className="bg-[#111116] border border-white/10 p-5 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block">
                  Comisión Acordada
                </span>
                <p className="text-2xl font-bold font-mono text-white">
                  {commission}% <span className="text-xs text-neutral-400">Por Venta</span>
                </p>
                <p className="text-[10px] text-neutral-500">Tu ganancia neta es {100 - commission}%</p>
              </div>
            </div>
          )}

          {/* NAVEGACIÓN DE PESTAÑAS DEL PANEL */}
          <div className="flex border-b border-white/10 gap-6 text-xs uppercase tracking-wider font-semibold overflow-x-auto pb-0.5">
            <button
              onClick={() => setActiveSellerTab("productos")}
              className={`pb-3 transition-colors cursor-pointer relative shrink-0 ${
                activeSellerTab === "productos" ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Catálogo de Productos ({sellerProducts.length})
              {activeSellerTab === "productos" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveSellerTab("pedidos")}
              className={`pb-3 transition-colors cursor-pointer relative shrink-0 ${
                activeSellerTab === "pedidos" ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Mis Pedidos & Despachos ({sellerOrders.length})
              {activeSellerTab === "pedidos" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveSellerTab("billetera")}
              className={`pb-3 transition-colors cursor-pointer relative shrink-0 ${
                activeSellerTab === "billetera" ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Billetera & Retiros
              {activeSellerTab === "billetera" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveSellerTab("perfil")}
              className={`pb-3 transition-colors cursor-pointer relative shrink-0 flex items-center gap-1.5 ${
                activeSellerTab === "perfil" ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>👤</span>
              <span>Mi Perfil de Boutique</span>
              {activeSellerTab === "perfil" && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber-400" />
              )}
            </button>
          </div>

          {/* PESTAÑA: PRODUCTOS */}
          {activeSellerTab === "productos" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm uppercase tracking-wider font-bold text-white">
                    Productos de {sellerSession.store_name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Sube artículos originales para que aparezcan en la tienda con tu sello de boutique
                  </p>
                </div>

                <button
                  onClick={() => setIsCreatingProduct(!isCreatingProduct)}
                  className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span>{isCreatingProduct ? "✕ Cerrar Formulario" : "+ Publicar Producto"}</span>
                </button>
              </div>

              {/* FORMULARIO PROFESIONAL DE CREACIÓN DE PRODUCTO */}
              {isCreatingProduct && (
                <form
                  onSubmit={handleCreateSellerProduct}
                  className="bg-[#111116] border border-amber-400/50 p-6 md:p-8 rounded-2xl space-y-6 shadow-2xl animate-in fade-in duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <h4 className="text-sm uppercase font-bold tracking-widest text-amber-300">
                          Publicar Nuevo Producto en tu Boutique
                        </h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Herramientas profesionales de catálogo: precios inteligentes, combo, envío gratis, tallas, colores y previsualización en vivo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProduct(false)}
                      className="text-neutral-400 hover:text-white text-2xl leading-none self-end sm:self-auto cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* NOMBRE */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Nombre del Producto *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="Ej: Perfume Creed Aventus 100ml / Sneaker Retro High..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* STOCK */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Stock Inicial Disponible *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newProdStock}
                        onChange={(e) => setNewProdStock(e.target.value)}
                        placeholder="Ej: 10"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* PRECIOS Y DESCUENTO INTELIGENTE */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Precio Base en COP *
                      </label>
                      <input
                        type="number"
                        required
                        min="1000"
                        value={newProdBasePrice}
                        onChange={(e) => setNewProdBasePrice(e.target.value)}
                        placeholder="Ej: 220000"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-neutral-300">
                          Descuento % (Opcional)
                        </label>
                        {parseFloat(newProdDiscountPercent) > 0 && (
                          <button
                            type="button"
                            onClick={() => setNewProdDiscountPercent("")}
                            className="text-[10px] text-red-400 underline cursor-pointer"
                          >
                            Quitar descuento
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={newProdDiscountPercent}
                        onChange={(e) => setNewProdDiscountPercent(e.target.value)}
                        placeholder="Ej: 15 (para 15% OFF)"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* TARJETA DE CÁLCULO EN VIVO */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center text-xs space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                        Precio final al cliente:
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-bold font-mono text-emerald-400">
                          ${" "}
                          {Math.round(
                            (parseFloat(newProdBasePrice) || 0) *
                              (1 - (parseFloat(newProdDiscountPercent) || 0) / 100)
                          ).toLocaleString("es-CO")}{" "}
                          COP
                        </span>
                        {parseFloat(newProdDiscountPercent) > 0 && (
                          <span className="text-[10px] font-mono text-red-400 line-through">
                            Antes: ${" "}
                            {parseFloat(newProdBasePrice || "0").toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-amber-300 font-mono pt-1 border-t border-white/10">
                        Tu ganancia neta: ${" "}
                        {calculateOrderCommission(
                          Math.round(
                            (parseFloat(newProdBasePrice) || 0) *
                              (1 - (parseFloat(newProdDiscountPercent) || 0) / 100)
                          ),
                          commission
                        ).sellerNet.toLocaleString("es-CO")}{" "}
                        COP
                      </p>
                    </div>

                    {/* CATEGORÍA PRINCIPAL */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Categoría Principal *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        placeholder="Ej: Perfumes, Ropa, Zapatos, Oro..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      {/* Chips rápidos de categorías principales */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {COMMON_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewProdCategory(cat)}
                            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              newProdCategory.toLowerCase() === cat.toLowerCase()
                                ? "bg-amber-400 text-black font-bold border-amber-400"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SUBCATEGORÍA / TIPO DE PRODUCTO */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-neutral-300">
                          Tipo de Producto / Subcategoría
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {newProdSubcategory ? `Tipo: ${newProdSubcategory}` : "General (sin subcategoría)"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newProdSubcategory}
                        onChange={(e) => setNewProdSubcategory(e.target.value)}
                        placeholder="Ej: Árabes Exclusivos, Diseñador, Jean, Sneakers Urbanos..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      {/* Sugerencias contextuales según la categoría */}
                      {SUGGESTED_SUBCATEGORIES[newProdCategory] && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9.5px] text-neutral-400 font-light block">
                            Sugerencias para <strong className="text-white">{newProdCategory}</strong> (toca para elegir):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTED_SUBCATEGORIES[newProdCategory].map((subOption) => (
                              <button
                                key={subOption}
                                type="button"
                                onClick={() => setNewProdSubcategory(subOption)}
                                className={`text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                                  newProdSubcategory.toLowerCase() === subOption.toLowerCase()
                                    ? "bg-amber-400 text-black font-bold border-amber-400 shadow-sm"
                                    : "bg-white/5 border-white/10 text-neutral-300 hover:border-amber-400/40 hover:text-amber-300"
                                }`}
                              >
                                <span>+</span>
                                <span>{subOption}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MODALIDAD DE VENTA: UNIDAD O COMBO */}
                    <div className="md:col-span-3 space-y-2 pt-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-200">
                          Modalidad de Venta / Presentación *
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          {newProdPresentation === "combo" ? "🎁 MODO: COMBO / DÚO" : "📦 MODO: 1 UNIDAD"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewProdPresentation("unidad")}
                          className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 ${
                            newProdPresentation === "unidad"
                              ? "bg-white/10 border-white text-white ring-1 ring-white/50 shadow-md"
                              : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                              newProdPresentation === "unidad"
                                ? "bg-white text-black font-bold"
                                : "bg-white/5 text-neutral-400"
                            }`}
                          >
                            📦
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wider block text-white truncate">
                              Unidad Individual
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-light truncate">
                              1 solo artículo (ej: 1 Perfume 100ml o 1 Par de Calzado)
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewProdPresentation("combo")}
                          className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 ${
                            newProdPresentation === "combo"
                              ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 ring-1 ring-amber-400/50 shadow-md"
                              : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                              newProdPresentation === "combo"
                                ? "bg-amber-400 text-black font-bold shadow-md"
                                : "bg-white/5 text-neutral-400"
                            }`}
                          >
                            🎁
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold uppercase tracking-wider block text-amber-300 truncate">
                              Combo / Dúo / Kit
                            </span>
                            <span className="text-[10px] text-amber-200/70 block font-light truncate">
                              2 o más artículos / pack ahorro / 2x1 especial
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* PROMO ENVÍO GRATIS */}
                    <div className="md:col-span-3 p-4 bg-amber-500/10 border border-amber-400/30 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newProdIsFreeShipping}
                          onChange={(e) => setNewProdIsFreeShipping(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                            🚚 Promoción Activa: Envío Gratis para este producto
                          </span>
                          <span className="text-[11px] text-neutral-300 font-light block mt-0.5">
                            Al activarlo, el comprador verá costo de envío $0 COP y la etiqueta destacada de Envío Gratis, impulsando tus ventas en NERKLEY.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* INSIGNIA / ETIQUETA DESTACADA */}
                    <div className="md:col-span-3 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-neutral-300">
                          Insignia / Etiqueta Destacada (Opcional)
                        </label>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {newProdBadge || "Sin insignia personalizada"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newProdBadge}
                        onChange={(e) => setNewProdBadge(e.target.value)}
                        placeholder="Ej: Edición Limitada, Top Ventas, 100% Original, Tendencia..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      {/* Presets rápidos de badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {BADGE_PRESETS.map((badgeText) => (
                          <button
                            key={badgeText}
                            type="button"
                            onClick={() => setNewProdBadge(badgeText)}
                            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                              newProdBadge === badgeText
                                ? "bg-amber-400 text-black font-bold border-amber-400 shadow-sm"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                            }`}
                          >
                            {badgeText}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TALLAS DISPONIBLES */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Tallas / Presentaciones (Separadas por comas)
                      </label>
                      <input
                        type="text"
                        value={newProdSizes}
                        onChange={(e) => setNewProdSizes(e.target.value)}
                        placeholder="Ej: S, M, L, XL ó 39, 40, 41, 42 ó 100ml"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      {/* Chips rápidos de tallas */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {SIZE_PRESETS.map((sz) => {
                          const isSelected = newProdSizes.split(",").map((s) => s.trim()).includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setNewProdSizes(toggleToken(newProdSizes, sz))}
                              className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-400 text-black font-bold border-amber-400"
                                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLORES DISPONIBLES */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Colores / Tonos (Separados por comas)
                      </label>
                      <input
                        type="text"
                        value={newProdColors}
                        onChange={(e) => setNewProdColors(e.target.value)}
                        placeholder="Ej: Negro, Blanco, Dorado, Azul Marino..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      {/* Chips rápidos de colores */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {COLOR_PRESETS.map((clr) => {
                          const isSelected = newProdColors.split(",").map((c) => c.trim()).includes(clr);
                          return (
                            <button
                              key={clr}
                              type="button"
                              onClick={() => setNewProdColors(toggleToken(newProdColors, clr))}
                              className={`text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-400 text-black font-bold border-amber-400"
                                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                              }`}
                            >
                              {clr}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Descripción & Detalles del Producto *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={newProdDescription}
                        onChange={(e) => setNewProdDescription(e.target.value)}
                        placeholder="Detalla los materiales originales, notas olfativas, procedencia o condiciones del producto..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* FOTOS DEL PRODUCTO */}
                    <div className="space-y-1.5 md:col-span-3">
                      <ImageGalleryUploader
                        value={newProdImages}
                        onChange={(urls) => setNewProdImages(urls)}
                        label="Fotos del Producto"
                        helperText="Selecciona fotos de tu galería o toma fotos directamente con la cámara. Puedes subir varias y reordenarlas."
                      />
                    </div>

                    {/* PREVISUALIZACIÓN EN VIVO DE LA TARJETA */}
                    <div className="md:col-span-3 p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 flex items-center gap-1.5">
                          <span>👁️</span> Previsualización en Vivo de tu Tarjeta en la Tienda
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Así lo verán los compradores
                        </span>
                      </div>

                      <div className="max-w-xs mx-auto bg-[#111116] border border-white/10 rounded-2xl overflow-hidden p-3.5 space-y-2.5 shadow-xl">
                        <div className="w-full h-44 bg-neutral-900 rounded-xl overflow-hidden relative flex items-center justify-center">
                          {newProdImages ? (
                            <img
                              src={newProdImages.split(",")[0]?.trim()}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-neutral-600">Sin foto aún</span>
                          )}

                          {/* BADGES FLOTANTES */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            {newProdPresentation === "combo" && (
                              <span className="text-[8.5px] uppercase font-bold bg-amber-400 text-black px-2 py-0.5 rounded shadow">
                                🎁 Combo
                              </span>
                            )}
                            {newProdIsFreeShipping && (
                              <span className="text-[8.5px] uppercase font-bold bg-emerald-500 text-black px-2 py-0.5 rounded shadow">
                                🚚 Envío Gratis
                              </span>
                            )}
                            {newProdBadge && (
                              <span className="text-[8.5px] uppercase font-semibold bg-black/80 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded shadow">
                                {newProdBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block">
                            {newProdCategory} {newProdSubcategory ? `// ${newProdSubcategory}` : ""}
                          </span>
                          <h5 className="font-bold text-white text-xs truncate">
                            {newProdName || "Nombre del Producto"}
                          </h5>
                          <span className="text-[10px] text-neutral-400 block">
                            Vendido por <strong className="text-white">{sellerSession.store_name}</strong> ✓
                          </span>

                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-base font-bold font-mono text-white">
                              ${" "}
                              {Math.round(
                                (parseFloat(newProdBasePrice) || 0) *
                                  (1 - (parseFloat(newProdDiscountPercent) || 0) / 100)
                              ).toLocaleString("es-CO")}{" "}
                              COP
                            </span>
                            {parseFloat(newProdDiscountPercent) > 0 && (
                              <span className="text-[10px] font-mono text-neutral-500 line-through">
                                ${" "}
                                {parseFloat(newProdBasePrice || "0").toLocaleString("es-CO")}
                              </span>
                            )}
                          </div>

                          {(newProdSizes || newProdColors) && (
                            <div className="text-[9.5px] text-neutral-400 pt-1 flex flex-wrap gap-1">
                              {newProdSizes && <span>Tallas: {newProdSizes}</span>}
                              {newProdSizes && newProdColors && <span>•</span>}
                              {newProdColors && <span>Colores: {newProdColors}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProduct(false)}
                      className="px-5 py-2.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="bg-amber-400 text-black px-8 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-300 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-95 flex items-center gap-2"
                    >
                      <span>🚀</span>
                      <span>{savingProduct ? "Publicando..." : "Publicar Producto en Tienda"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* LISTADO DE PRODUCTOS */}
              {sellerProducts.length === 0 ? (
                <div className="p-12 text-center border border-white/10 bg-white/5 rounded-xl space-y-2">
                  <span className="text-3xl">🛍️</span>
                  <p className="text-sm font-semibold text-white">Aún no has publicado productos</p>
                  <p className="text-xs text-neutral-400">
                    {isVerified
                      ? "Haz clic en '+ Publicar Producto' para agregar tus artículos al catálogo oficial."
                      : "Tu tienda está en proceso de verificación por NERKLEY. Te avisaremos cuando puedas comenzar a publicar."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sellerProducts.map((p) => {
                    const img = p.images?.split(",")[0]?.trim();
                    const price = Number(p.sale_price) || 0;
                    const { sellerNet } = calculateOrderCommission(price, commission);
                    const displayBadge = p.badge ? extractDisplayBadge(p.badge) : "";
                    const isFree = hasFreeShipping(p);
                    const isCombo = isProductCombo(p);
                    const { mainCategory, subcategory } = parseCategory(p.category);

                    return (
                      <div
                        key={p.id}
                        className={`bg-[#111116] border rounded-2xl overflow-hidden flex flex-col justify-between p-4 space-y-3 transition-all ${
                          p.is_active !== false ? "border-white/10 hover:border-amber-400/40 shadow-sm" : "border-red-500/30 opacity-75"
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className="w-16 h-16 bg-black border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-neutral-600">Sin foto</span>
                            )}
                            {isCombo && (
                              <span className="absolute top-0.5 left-0.5 text-[7px] font-bold bg-amber-400 text-black px-1 rounded">
                                Combo
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block truncate">
                                {mainCategory} {subcategory ? `// ${subcategory}` : ""}
                              </span>
                              {p.is_active !== false ? (
                                <span className="text-[8.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                                  Activo
                                </span>
                              ) : (
                                <span className="text-[8.5px] bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                                  Pausado
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-xs truncate" title={p.name}>{p.name}</h4>

                            {/* BADGES EN LISTADO */}
                            <div className="flex flex-wrap gap-1 items-center">
                              {isFree && (
                                <span className="text-[7.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                  Envío Gratis
                                </span>
                              )}
                              {displayBadge && (
                                <span className="text-[7.5px] bg-amber-400/10 text-amber-300 border border-amber-400/30 px-1 py-0.2 rounded font-semibold uppercase tracking-wider truncate max-w-[120px]">
                                  {displayBadge}
                                </span>
                              )}
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-mono font-bold text-white block">
                                $ {price.toLocaleString("es-CO")} COP
                              </span>
                              {p.original_price && p.original_price > price && (
                                <span className="text-[10px] font-mono text-neutral-500 line-through">
                                  ${Number(p.original_price).toLocaleString("es-CO")}
                                </span>
                              )}
                            </div>
                            <p className="text-[9.5px] text-emerald-400 font-mono">
                              Recibes neto: $ {sellerNet.toLocaleString("es-CO")} COP
                            </p>
                            <span className="text-[10px] text-neutral-400 font-mono block">
                              Stock: {p.stock} uds {p.sizes ? `• ${p.sizes}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* BOTONES DE EDICIÓN Y ELIMINACIÓN */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(p)}
                              className="bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                              title="Editar precio, stock o datos del producto"
                            >
                              <span>✏️</span>
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSellerProduct(p.id, p.name)}
                              className="bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Eliminar este producto de tu tienda"
                            >
                              <span>🗑️</span>
                              <span>Eliminar</span>
                            </button>
                          </div>

                          <Link
                            href={`/product/${p.slug}`}
                            target="_blank"
                            className="text-neutral-400 hover:text-white text-[10px] font-semibold underline"
                          >
                            Ver en Tienda ↗
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: PEDIDOS */}
          {activeSellerTab === "pedidos" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm uppercase tracking-wider font-bold text-white">
                  Órdenes y Envíos de tu Boutique
                </h3>
                <p className="text-xs text-neutral-400">
                  Aquí verás los pedidos que compren los clientes. Al despacharlos, ingresa la guía de la transportadora para que se libere tu saldo al ser entregado.
                </p>
              </div>

              {sellerOrders.length === 0 ? (
                <div className="p-12 text-center border border-white/10 bg-white/5 rounded-xl space-y-2">
                  <span className="text-3xl">📦</span>
                  <p className="text-sm font-semibold text-white">No tienes pedidos pendientes</p>
                  <p className="text-xs text-neutral-400">Cuando un cliente compre uno de tus productos, aparecerá listado aquí.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sellerOrders.map((o) => {
                    const isLiberated = o.notes?.includes("FONDOS_LIBERADOS");
                    const total = Number(o.total_price) || 0;
                    const { sellerNet } = calculateOrderCommission(total, commission);
                    const currentGuide = guideInputs[o.id]?.guide !== undefined ? guideInputs[o.id].guide : (o.shipping_guide || "");
                    const currentCompany = guideInputs[o.id]?.company !== undefined ? guideInputs[o.id].company : (o.transport_company || "Interrapidísimo");

                    return (
                      <div
                        key={o.id}
                        className={`p-5 rounded-2xl border space-y-4 transition-all ${
                          isLiberated ? "bg-[#0d0d12] border-emerald-500/30" : "bg-[#111116] border-white/10 shadow-sm"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-white text-sm">
                              {o.reference || `NRK-${o.id.slice(0, 8)}`}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(o.created_at).toLocaleDateString("es-CO")}
                            </span>
                          </div>

                          <div>
                            {isLiberated ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase rounded-full">
                                <span>✅</span> Dinero Liberado: $ {sellerNet.toLocaleString("es-CO")} COP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase rounded-full">
                                <span>🔒</span> En Garantía Escrow: $ {sellerNet.toLocaleString("es-CO")} COP
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold block border-b border-white/5 pb-1">
                              🛍️ Producto & Cliente
                            </span>
                            <p className="font-semibold text-white text-sm">{o.product_name}</p>
                            <p className="text-neutral-300">Cliente: <strong className="text-white">{o.customer_name}</strong></p>
                            <p className="text-neutral-300">Destino: 📍 {o.city} &bull; {o.address}</p>
                            <p className="text-neutral-400 font-mono">Tel: {o.customer_phone}</p>
                            <div className="pt-1 text-emerald-400 font-mono font-bold">
                              Tu ganancia neta ({100 - commission}%): $ {sellerNet.toLocaleString("es-CO")} COP
                            </div>
                          </div>

                          <div className="space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold block border-b border-white/5 pb-1">
                              🚚 Despacho & Número de Guía
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] uppercase tracking-wider text-neutral-400 block mb-1">
                                  Transportadora
                                </label>
                                <select
                                  value={currentCompany}
                                  onChange={(e) =>
                                    setGuideInputs((prev) => ({
                                      ...prev,
                                      [o.id]: { ...prev[o.id], company: e.target.value, guide: currentGuide },
                                    }))
                                  }
                                  className="w-full bg-[#0a0a0c] border border-white/20 p-2 text-xs text-white rounded focus:border-amber-400 cursor-pointer"
                                >
                                  <option value="Interrapidísimo">Interrapidísimo</option>
                                  <option value="Servientrega">Servientrega</option>
                                  <option value="Coordinadora">Coordinadora</option>
                                  <option value="Envía">Envía</option>
                                  <option value="TCC">TCC</option>
                                  <option value="Otra">Otra Transportadora</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[9px] uppercase tracking-wider text-neutral-400 block mb-1">
                                  Número de Guía *
                                </label>
                                <input
                                  type="text"
                                  value={currentGuide}
                                  onChange={(e) =>
                                    setGuideInputs((prev) => ({
                                      ...prev,
                                      [o.id]: { company: currentCompany, guide: e.target.value },
                                    }))
                                  }
                                  placeholder="Ej: 2400981726"
                                  className="w-full bg-[#0a0a0c] border border-white/20 p-2 text-xs text-emerald-400 font-mono font-bold rounded focus:border-amber-400 placeholder-neutral-600"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveShippingGuide(o.id, currentCompany || "Interrapidísimo", currentGuide || "")}
                              className="w-full bg-amber-400 hover:bg-amber-300 text-black py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
                            >
                              <span>💾</span>
                              <span>Guardar Guía y Notificar Envío</span>
                            </button>
                            {o.shipping_guide && (
                              <p className="text-[10px] text-emerald-400 text-center font-mono">
                                ✓ Guía registrada: {o.transport_company} No. {o.shipping_guide}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: BILLETERA */}
          {activeSellerTab === "billetera" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-sm uppercase tracking-wider font-bold text-white">
                  Billetera de Custodia & Pagos
                </h3>
                <p className="text-xs text-neutral-400">
                  Tus fondos están protegidos mediante el sistema Escrow de NERKLEY hasta la entrega del producto.
                </p>
              </div>

              <div className="bg-[#111116] border border-white/10 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                  <span className="text-xs text-neutral-400 uppercase font-semibold">Saldo Disponible para Retiro:</span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    $ {sellerWalletTotals.available.toLocaleString("es-CO")} COP
                  </span>
                </div>

                <div className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Cuenta Bancaria para Transferencias:</span>
                  <p className="text-white font-mono font-bold">{sellerSession.bank_name} &bull; {sellerSession.account_type}</p>
                  <p className="text-neutral-300 font-mono">No. {sellerSession.account_number}</p>
                  <p className="text-neutral-400 text-[10px]">Titular: {sellerSession.owner_name} (CC/NIT: {sellerSession.owner_document})</p>
                </div>

                {sellerWalletTotals.available >= 50000 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(`Hola NERKLEY Concierge, soy ${sellerSession.owner_name} de la boutique "${sellerSession.store_name}". Solicito el retiro de mi saldo disponible de $ ${sellerWalletTotals.available.toLocaleString("es-CO")} COP a mi cuenta ${sellerSession.bank_name} No. ${sellerSession.account_number}.`);
                      window.open(`https://wa.me/573009292323?text=${msg}`, "_blank");
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-98 flex items-center justify-center gap-2"
                  >
                    <span>💸</span>
                    <span>Solicitar Retiro de $ {sellerWalletTotals.available.toLocaleString("es-CO")} COP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={true}
                    className="w-full bg-white/10 text-neutral-400 py-3 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                  >
                    Solicitar Retiro a {sellerSession.bank_name} (Mínimo $50.000 COP)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA: MI PERFIL DE BOUTIQUE */}
          {activeSellerTab === "perfil" && (
            <div className="space-y-8 max-w-4xl animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <span>👤</span> Perfil Oficial de tu Boutique
                </h3>
                <p className="text-xs text-neutral-400">
                  Personaliza tu marca, logotipo, información de contacto, ciudad de despacho y datos bancarios para transferencias.
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <span>✅</span>
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* CAJA DE ENLACE PÚBLICO Y COMPARTIR DE LA BOUTIQUE */}
              <div className="bg-gradient-to-r from-amber-500/15 via-[#1a1710] to-neutral-900 border-2 border-amber-400/40 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">🏛️</span>
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-amber-300">
                      Tu Tienda y Perfil Público en NERKLEY
                    </h4>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      ✓ En Línea
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-white font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 break-all select-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/tienda/${sellerSession.slug || encodeURIComponent(sellerSession.store_name.toLowerCase())}` : `https://nerkley-m4t2.vercel.app/tienda/${sellerSession.slug || sellerSession.store_name}`}
                  </p>
                  <p className="text-[11px] text-neutral-300">
                    Tus compradores pueden buscarte por tu nombre <strong>"{sellerSession.store_name}"</strong> o ingresar a este enlace para ver tu portada, presentación, video y comprar tus productos exclusivos directamente.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 z-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const publicUrl = `${typeof window !== "undefined" ? window.location.origin : "https://nerkley-m4t2.vercel.app"}/tienda/${sellerSession.slug || encodeURIComponent(sellerSession.store_name.toLowerCase())}`;
                      navigator.clipboard.writeText(publicUrl);
                      setCopiedProfileLink(true);
                      setTimeout(() => setCopiedProfileLink(false), 2500);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>{copiedProfileLink ? "✅" : "📋"}</span>
                    <span>{copiedProfileLink ? "¡Copiado!" : "Copiar Enlace"}</span>
                  </button>

                  <a
                    href={`/tienda/${sellerSession.slug || encodeURIComponent(sellerSession.store_name.toLowerCase())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                  >
                    <span>Ver Perfil Público</span>
                    <span>↗</span>
                  </a>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Te invito a conocer mi boutique oficial en NERKLEY: ${typeof window !== "undefined" ? window.location.origin : "https://nerkley-m4t2.vercel.app"}/tienda/${sellerSession.slug || encodeURIComponent(sellerSession.store_name.toLowerCase())}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    title="Compartir enlace de tu boutique por WhatsApp"
                  >
                    <span>📲</span>
                    <span>Compartir</span>
                  </a>
                </div>
              </div>

              {/* TARJETA DE PREVISUALIZACIÓN PÚBLICA DE LA BOUTIQUE */}
              <div className="bg-[#111116] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* BANNER DE PORTADA */}
                <div className="h-36 sm:h-44 w-full relative bg-gradient-to-r from-neutral-900 via-amber-950/30 to-black overflow-hidden flex items-center justify-center">
                  {profileForm.banner_url ? (
                    <img
                      src={profileForm.banner_url}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-1 text-neutral-500">
                      <span className="text-2xl">🏛️</span>
                      <p className="text-[10px] uppercase tracking-widest">Banner Oficial de Boutique</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111116] via-transparent to-transparent" />
                </div>

                {/* INFO DEL PERFIL */}
                <div className="px-6 pb-6 relative -mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    {/* AVATAR / LOGO */}
                    <div className="w-20 h-20 rounded-2xl bg-black border-2 border-amber-400/60 overflow-hidden shadow-xl shrink-0 flex items-center justify-center relative">
                      {profileForm.logo_url ? (
                        <img
                          src={profileForm.logo_url}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-serif font-black text-amber-300">
                          {profileForm.store_name ? profileForm.store_name[0].toUpperCase() : "B"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 pb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-serif font-bold text-white">
                          {profileForm.store_name || "Nombre de tu Boutique"}
                        </h4>
                        {sellerSession.is_verified ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            ✓ Verificada
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            ⏳ En Revisión
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-400 font-medium">
                        {profileForm.category} &bull; 📍 {profileForm.city}, {profileForm.department}
                      </p>
                    </div>
                  </div>

                  {/* ESTADÍSTICAS RÁPIDAS */}
                  <div className="flex gap-4 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                        Calificación
                      </span>
                      <span className="text-sm font-bold text-amber-300 font-mono">
                        ⭐ 5.0 / 5.0
                      </span>
                    </div>
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                        En Catálogo
                      </span>
                      <span className="text-sm font-bold text-white font-mono">
                        {sellerProducts.length} productos
                      </span>
                    </div>
                  </div>
                </div>

                {/* BIOGRAFÍA */}
                {profileForm.bio && (
                  <div className="px-6 pb-4 pt-2 border-t border-white/5">
                    <p className="text-xs text-neutral-300 font-light leading-relaxed italic">
                      "{profileForm.bio}"
                    </p>
                  </div>
                )}

                {profileForm.video_url && (
                  <div className="px-6 pb-5 flex items-center gap-2 text-xs text-amber-300">
                    <span>🎥</span>
                    <span className="font-medium">Video de presentación configurado para los clientes</span>
                  </div>
                )}
              </div>

              {/* FORMULARIO DE EDICIÓN DEL PERFIL */}
              <form onSubmit={handleSaveProfile} className="bg-[#111116] border border-white/10 p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
                <h4 className="text-xs uppercase font-bold tracking-widest text-amber-300 border-b border-white/10 pb-3 flex items-center gap-2">
                  <span>⚙️</span> Editar Información de tu Perfil y Boutique
                </h4>

                {/* SECCIÓN 1: IDENTIDAD */}
                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    1. Identidad de la Marca
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Nombre de la Tienda / Boutique *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.store_name}
                        onChange={(e) => setProfileForm({ ...profileForm, store_name: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Categoría de la Boutique *
                      </label>
                      <select
                        value={profileForm.category}
                        onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Perfumería & Fragancias">Perfumería & Fragancias</option>
                        <option value="Sneakers & Calzado">Sneakers & Calzado</option>
                        <option value="Moda & Ropa Selecta">Moda & Ropa Selecta</option>
                        <option value="Joyería & Relojería">Joyería & Relojería</option>
                        <option value="Accesorios de Lujo">Accesorios de Lujo</option>
                        <option value="Variado / Multi-categoría">Variado / Multi-categoría</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Biografía / Sobre tu Tienda (Lema o Descripción)
                      </label>
                      <textarea
                        rows={2}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        placeholder="Ej: Especialistas en fragancias de nicho importadas, atención personalizada y envíos asegurados..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Logo / Foto de Perfil (URL)
                      </label>
                      <input
                        type="url"
                        value={profileForm.logo_url}
                        onChange={(e) => setProfileForm({ ...profileForm, logo_url: e.target.value })}
                        placeholder="https://ejemplo.com/mifoto.jpg"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Banner de Portada (URL)
                      </label>
                      <input
                        type="url"
                        value={profileForm.banner_url}
                        onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })}
                        placeholder="https://ejemplo.com/banner.jpg"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-300 flex items-center justify-between">
                        <span>Video de Presentación / Reels de la Boutique (Opcional)</span>
                        <span className="text-[10px] text-amber-400 font-normal">YouTube, TikTok o enlace directo MP4</span>
                      </label>
                      <input
                        type="url"
                        value={profileForm.video_url}
                        onChange={(e) => setProfileForm({ ...profileForm, video_url: e.target.value })}
                        placeholder="Ej: https://www.youtube.com/watch?v=... o https://www.tiktok.com/@... o https://ejemplo.com/video.mp4"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[10px] text-neutral-400">
                        🎥 Si agregas un video, los clientes podrán reproducirlo directamente en tu perfil público para conocer más de ti y de tus productos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: CONTACTO Y LOGÍSTICA */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    2. Contacto & Despacho
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Nombre del Propietario / Titular *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.owner_name}
                        onChange={(e) => setProfileForm({ ...profileForm, owner_name: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Cédula / Documento (CC o NIT) *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.owner_document}
                        onChange={(e) => setProfileForm({ ...profileForm, owner_document: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Teléfono / WhatsApp de Contacto *
                      </label>
                      <input
                        type="tel"
                        required
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Departamento de Despacho *
                      </label>
                      <select
                        value={profileForm.department}
                        onChange={(e) => {
                          const dept = e.target.value;
                          const cities = COLOMBIA_REGIONS[dept] || [];
                          setProfileForm({
                            ...profileForm,
                            department: dept,
                            city: cities[0] || "",
                          });
                        }}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {Object.keys(COLOMBIA_REGIONS).map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Ciudad / Municipio de Despacho *
                      </label>
                      <select
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {(COLOMBIA_REGIONS[profileForm.department] || [profileForm.city]).map((cityName) => (
                          <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 3: DATOS BANCARIOS */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    3. Información Bancaria para Desembolsos
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Banco o Billetera *
                      </label>
                      <select
                        value={profileForm.bank_name}
                        onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="Davivienda">Davivienda</option>
                        <option value="Banco de Bogotá">Banco de Bogotá</option>
                        <option value="BBVA Colombia">BBVA Colombia</option>
                        <option value="Banco Falabella">Banco Falabella</option>
                        <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                        <option value="Otro Banco">Otro Banco</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Tipo de Cuenta *
                      </label>
                      <select
                        value={profileForm.account_type}
                        onChange={(e) => setProfileForm({ ...profileForm, account_type: e.target.value })}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Ahorros">Cuenta de Ahorros</option>
                        <option value="Corriente">Cuenta Corriente</option>
                        <option value="Nequi">Nequi / Depósito Digital</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Número de Cuenta *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.account_number}
                        onChange={(e) => setProfileForm({ ...profileForm, account_number: e.target.value })}
                        placeholder="Ej: 1234567890"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    🔒 Los fondos liberados de tus ventas se transferirán a esta cuenta tras cada despacho completado.
                  </p>
                </div>

                {/* SECCIÓN 4: SEGURIDAD */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    4. Seguridad de la Cuenta
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Correo Registrado (Acceso)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profileForm.email}
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-neutral-400 rounded-lg cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Nueva Contraseña (Opcional)
                      </label>
                      <input
                        type="password"
                        value={profileForm.new_password}
                        onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                        placeholder="Dejar vacío para no cambiar"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* BOTÓN GUARDAR */}
                <div className="pt-4 border-t border-white/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-amber-400 hover:bg-amber-300 text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{savingProfile ? "Guardando Perfil..." : "Guardar Cambios de mi Perfil"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* MODAL: EDICIÓN DE PRODUCTO DEL VENDEDOR */}
        {editingProduct && (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            <div className="bg-[#111116] border border-amber-400/40 max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative text-left rounded-2xl animate-in fade-in duration-200">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-white uppercase tracking-wider">
                    Editar Producto &bull; {editingProduct.name}
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                    Actualiza precio, stock, fotos o descripción en tiempo real
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-neutral-400 hover:text-white text-2xl leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEditProduct} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* NOMBRE */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* STOCK */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Stock Disponible *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* PRECIOS Y DESCUENTO */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Precio Base en COP *
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={editForm.basePrice}
                      onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Descuento % (0 para ninguno)
                      </label>
                      {parseFloat(editForm.discountPercent) > 0 && (
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, discountPercent: "0" })}
                          className="text-[10px] text-red-400 underline cursor-pointer"
                        >
                          Quitar descuento
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={editForm.discountPercent}
                      onChange={(e) => setEditForm({ ...editForm, discountPercent: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* CÁLCULO EN VIVO */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center text-xs space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                      Precio final al cliente:
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold font-mono text-emerald-400">
                        ${" "}
                        {Math.round(
                          (parseFloat(editForm.basePrice) || 0) *
                            (1 - (parseFloat(editForm.discountPercent) || 0) / 100)
                        ).toLocaleString("es-CO")}{" "}
                        COP
                      </span>
                      {parseFloat(editForm.discountPercent) > 0 && (
                        <span className="text-[10px] font-mono text-red-400 line-through">
                          Antes: ${" "}
                          {parseFloat(editForm.basePrice || "0").toLocaleString("es-CO")}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-amber-300 font-mono pt-1 border-t border-white/10">
                      Tu ganancia neta: ${" "}
                      {calculateOrderCommission(
                        Math.round(
                          (parseFloat(editForm.basePrice) || 0) *
                            (1 - (parseFloat(editForm.discountPercent) || 0) / 100)
                        ),
                        commission
                      ).sellerNet.toLocaleString("es-CO")}{" "}
                      COP
                    </p>
                  </div>

                  {/* CATEGORÍA PRINCIPAL */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Categoría Principal *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {COMMON_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, category: cat })}
                          className={`text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            editForm.category.toLowerCase() === cat.toLowerCase()
                              ? "bg-amber-400 text-black font-bold border-amber-400"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUBCATEGORÍA / TIPO */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Tipo de Producto / Subcategoría
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {editForm.subcategory ? `Tipo: ${editForm.subcategory}` : "General"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={editForm.subcategory}
                      onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                      placeholder="Ej: Árabes Exclusivos, Sneaker, Chaqueta..."
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    {SUGGESTED_SUBCATEGORIES[editForm.category] && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {SUGGESTED_SUBCATEGORIES[editForm.category].map((subOption) => (
                          <button
                            key={subOption}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, subcategory: subOption })}
                            className={`text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                              editForm.subcategory.toLowerCase() === subOption.toLowerCase()
                                ? "bg-amber-400 text-black font-bold border-amber-400"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:text-amber-300"
                            }`}
                          >
                            {subOption}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MODALIDAD DE VENTA: UNIDAD O COMBO */}
                  <div className="md:col-span-3 space-y-2 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-200">
                        Modalidad de Venta / Presentación *
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        {editForm.presentation === "combo" ? "🎁 COMBO / DÚO" : "📦 UNIDAD"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, presentation: "unidad" })}
                        className={`p-3 border rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 ${
                          editForm.presentation === "unidad"
                            ? "bg-white/10 border-white text-white ring-1 ring-white/50"
                            : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                        }`}
                      >
                        <span className="text-xl">📦</span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider block text-white">
                            Unidad Individual
                          </span>
                          <span className="text-[9.5px] text-neutral-400 block">1 artículo estándar</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, presentation: "combo" })}
                        className={`p-3 border rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 ${
                          editForm.presentation === "combo"
                            ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 ring-1 ring-amber-400/50"
                            : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                        }`}
                      >
                        <span className="text-xl">🎁</span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider block text-amber-300">
                            Combo / Dúo / Kit
                          </span>
                          <span className="text-[9.5px] text-amber-200/70 block">2 o más productos en pack</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* PROMO ENVÍO GRATIS */}
                  <div className="md:col-span-3 p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-xl">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.isFreeShipping}
                        onChange={(e) => setEditForm({ ...editForm, isFreeShipping: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                          🚚 Promoción Activa: Envío Gratis para este producto
                        </span>
                        <span className="text-[10.5px] text-neutral-300 font-light block mt-0.5">
                          El comprador verá costo de envío $0 COP y la etiqueta de Envío Gratis.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* INSIGNIA DESTACADA */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Insignia / Etiqueta Destacada
                    </label>
                    <input
                      type="text"
                      value={editForm.badge}
                      onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                      placeholder="Ej: Edición Limitada, Top Ventas, Exclusivo..."
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {BADGE_PRESETS.map((badgeText) => (
                        <button
                          key={badgeText}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, badge: badgeText })}
                          className={`text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                            editForm.badge === badgeText
                              ? "bg-amber-400 text-black font-bold border-amber-400"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {badgeText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TALLAS */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Tallas / Presentaciones
                    </label>
                    <input
                      type="text"
                      value={editForm.sizes}
                      onChange={(e) => setEditForm({ ...editForm, sizes: e.target.value })}
                      placeholder="S, M, L, XL ó 39, 40 ó 100ml"
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {SIZE_PRESETS.slice(0, 10).map((sz) => {
                        const isSelected = editForm.sizes.split(",").map((s) => s.trim()).includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, sizes: toggleToken(editForm.sizes, sz) })}
                            className={`text-[8.5px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-400 text-black font-bold border-amber-400"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* COLORES */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Colores / Tonos
                    </label>
                    <input
                      type="text"
                      value={editForm.colors}
                      onChange={(e) => setEditForm({ ...editForm, colors: e.target.value })}
                      placeholder="Negro, Blanco, Oro..."
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {COLOR_PRESETS.map((clr) => {
                        const isSelected = editForm.colors.split(",").map((c) => c.trim()).includes(clr);
                        return (
                          <button
                            key={clr}
                            type="button"
                            onClick={() => setEditForm({ ...editForm, colors: toggleToken(editForm.colors, clr) })}
                            className={`text-[8.5px] px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-400 text-black font-bold border-amber-400"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                            }`}
                          >
                            {clr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* FOTOS */}
                  <div className="space-y-1.5 md:col-span-3">
                    <ImageGalleryUploader
                      value={editForm.images}
                      onChange={(urls) => setEditForm({ ...editForm, images: urls })}
                      label="Fotos del Producto"
                      helperText="Agrega nuevas fotos desde tu galería, reordénalas o elimina fotos antiguas"
                    />
                  </div>

                  {/* DESCRIPCIÓN */}
                  <div className="space-y-1.5 md:col-span-3">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Descripción & Detalles
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* ACTIVAR / PAUSAR */}
                  <div className="md:col-span-3 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="seller_edit_active"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="w-4 h-4 accent-amber-400 cursor-pointer"
                    />
                    <label htmlFor="seller_edit_active" className="text-xs text-neutral-200 cursor-pointer font-medium">
                      Producto activo y visible para compra en la tienda oficial
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-5 py-2.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="bg-amber-400 hover:bg-amber-300 text-black px-7 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {savingEdit ? "Guardando Cambios..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA: REGISTRO O LOGIN (SI NO ESTÁ LOGUEADO)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-amber-400 selection:text-black">
      {/* NAVEGACIÓN SUPERIOR */}
      <header className="border-b border-white/10 bg-[#0d0d12]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-serif tracking-[0.3em] font-bold text-base text-white group-hover:text-amber-300 transition-colors">
              NERKLEY
            </span>
            <span className="text-[9px] uppercase tracking-widest text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded">
              PARTNERS
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
              Volver a la Tienda
            </Link>
            <button
              onClick={() => {
                setViewMode(viewMode === "login" ? "register" : "login");
                setErrorMessage("");
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer"
            >
              {viewMode === "login" ? "Postular Nueva Tienda" : "Iniciar Sesión"}
            </button>
          </div>
        </div>
      </header>

      {/* VISTA LOGIN */}
      {viewMode === "login" ? (
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="bg-[#111116] border border-white/10 p-6 sm:p-8 rounded-2xl space-y-6">
            <div className="text-center space-y-1">
              <span className="text-3xl">🔐</span>
              <h2 className="text-xl font-serif font-bold text-white">Ingreso a Panel de Boutique</h2>
              <p className="text-xs text-neutral-400">Ingresa con el correo y contraseña de tu tienda registrada</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu clave secreta"
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loginLoading ? "Accediendo..." : "Entrar a Mi Panel"}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-white/10 text-xs text-neutral-400 space-y-3">
              <button
                type="button"
                onClick={handleQuickDemoAccess}
                className="w-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>Probar Panel y Subir Producto Directamente</span>
              </button>

              <div>
                ¿Aún no tienes cuenta?{" "}
                <button
                  onClick={() => setViewMode("register")}
                  className="text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Postula tu Boutique aquí &rarr;
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* VISTA REGISTRO COMPLETO */
        <>
          <section className="relative overflow-hidden py-14 sm:py-20 border-b border-white/10 bg-gradient-to-b from-[#14141c] via-[#0d0d12] to-[#0a0a0c] px-4">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                <span>⭐</span> Programa de Boutiques & Vendedores Oficiales
              </div>

              <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
                Vende en <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">NERKLEY</span> y escala tus ventas en Colombia
              </h1>

              <p className="text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
                Llega a miles de compradores de moda, perfumería y artículos exclusivos. Pagos 100% garantizados con Wompi, protección contra fraudes y desembolso directo a tu cuenta bancaria.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleQuickDemoAccess}
                  className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>Probar Panel y Subir Producto Directamente</span>
                </button>
                <button
                  onClick={() => setViewMode("login")}
                  className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  ¿Ya tienes boutique? Iniciar sesión &rarr;
                </button>
              </div>
            </div>
          </section>

          <main className="max-w-2xl mx-auto px-4 py-12">
            <form onSubmit={handleRegister} className="bg-[#111116] border border-white/10 p-6 sm:p-8 rounded-2xl space-y-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-white">Postula tu Boutique o Marca</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Completa tus datos reales para auditar tu solicitud y otorgarte tu cuenta de vendedor.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* SECCIÓN 1: DATOS DE LA TIENDA */}
              <div className="space-y-4 pt-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                  1. Información de la Boutique
                </span>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre Comercial de la Tienda *</label>
                  <input
                    type="text"
                    required
                    value={regData.store_name}
                    onChange={(e) => setRegData({ ...regData, store_name: e.target.value })}
                    placeholder="Ej: Milano Fragancias, King Sneakers, Urban Luxury..."
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Categoría Principal *</label>
                  <select
                    value={regData.category}
                    onChange={(e) => setRegData({ ...regData, category: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Perfumería & Fragancias">Perfumería & Fragancias</option>
                    <option value="Sneakers & Calzado de Colección">Sneakers & Calzado de Colección</option>
                    <option value="Moda Urbana & Ropa de Diseñador">Moda Urbana & Ropa de Diseñador</option>
                    <option value="Gorras & Accesorios">Gorras & Accesorios</option>
                    <option value="Joyería & Relojería">Joyería & Relojería</option>
                    <option value="Catálogo Multimarca / Variado">Catálogo Multimarca / Variado</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN 2: TITULAR Y CONTACTO */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                  2. Representante & Acceso
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre y Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={regData.owner_name}
                      onChange={(e) => setRegData({ ...regData, owner_name: e.target.value })}
                      placeholder="Tu nombre completo"
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Cédula o NIT *</label>
                    <input
                      type="text"
                      required
                      value={regData.owner_document}
                      onChange={(e) => setRegData({ ...regData, owner_document: e.target.value })}
                      placeholder="Número de identificación"
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">WhatsApp de Contacto *</label>
                    <input
                      type="tel"
                      required
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      placeholder="Ej: 3001234567"
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Crea tu Contraseña de Ingreso *</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* SECCIÓN 3: UBICACIÓN */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                  3. Ubicación desde donde despachas
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Departamento *</label>
                    <select
                      value={regData.department}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const cities = COLOMBIA_REGIONS[newDept] || ["Medellín"];
                        const firstCity = cities.find((c) => c !== "Otro Municipio / Corregimiento...") || "";
                        setIsCustomCity(false);
                        setCustomCityText("");
                        setRegData({ ...regData, department: newDept, city: firstCity });
                      }}
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {Object.keys(COLOMBIA_REGIONS).map((dept) => (
                        <option key={dept} value={dept} className="bg-[#111116] text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Ciudad o Municipio *</label>
                    <select
                      value={
                        isCustomCity ||
                        (regData.city &&
                          !(COLOMBIA_REGIONS[regData.department] || [])
                            .filter((c) => c !== "Otro Municipio / Corregimiento...")
                            .includes(regData.city))
                          ? "Otro Municipio / Corregimiento..."
                          : regData.city
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "Otro Municipio / Corregimiento...") {
                          setIsCustomCity(true);
                          setCustomCityText("");
                          setRegData({ ...regData, city: "" });
                        } else {
                          setIsCustomCity(false);
                          setCustomCityText("");
                          setRegData({ ...regData, city: val });
                        }
                      }}
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {(COLOMBIA_REGIONS[regData.department] || ["Otro Municipio / Corregimiento..."]).map((c) => (
                        <option key={c} value={c} className="bg-[#111116] text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(isCustomCity || regData.city === "") && (
                  <div>
                    <input
                      type="text"
                      required
                      value={customCityText}
                      onChange={(e) => {
                        setCustomCityText(e.target.value);
                        setRegData({ ...regData, city: e.target.value });
                      }}
                      placeholder="Escribe el nombre de tu municipio *"
                      className="w-full bg-[#0a0a0c] border border-amber-400/50 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: BANCO */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                  4. Cuenta para transferirte tus pagos
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Entidad Bancaria *</label>
                    <select
                      value={regData.bank_name}
                      onChange={(e) => setRegData({ ...regData, bank_name: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="Bancolombia">Bancolombia</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Davivienda">Davivienda</option>
                      <option value="Banco de Bogotá">Banco de Bogotá</option>
                      <option value="BBVA Colombia">BBVA Colombia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Número de Cuenta o Celular Nequi *</label>
                    <input
                      type="text"
                      required
                      value={regData.account_number}
                      onChange={(e) => setRegData({ ...regData, account_number: e.target.value })}
                      placeholder="Número de cuenta o celular"
                      className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-4 text-xs font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {regLoading ? "Enviando Solicitud..." : "Postular Mi Boutique para Verificación"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("login");
                      setErrorMessage("");
                    }}
                    className="text-xs text-neutral-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    ¿Ya registraste tu boutique antes? Iniciar Sesión aquí &rarr;
                  </button>
                </div>
              </div>
            </form>
          </main>
        </>
      )}
    </div>
  );
}
