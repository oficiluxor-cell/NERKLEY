"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { COLOMBIA_REGIONS } from "@/lib/shipping";
import {
  Seller,
  registerNewSeller,
  loginSeller,
  getFreshSellerSession,
  logoutSeller,
  calculateOrderCommission,
} from "@/lib/marketplace";
import ImageGalleryUploader from "@/components/ImageGalleryUploader";

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
  const [activeSellerTab, setActiveSellerTab] = useState<"productos" | "pedidos" | "billetera">("productos");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [guideInputs, setGuideInputs] = useState<Record<string, { company?: string; guide?: string }>>({});

  // Formulario de Nuevo Producto de Vendedor
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdCategory, setNewProdCategory] = useState("Perfume");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImages, setNewProdImages] = useState("");
  const [newProdSizes, setNewProdSizes] = useState("");
  const [newProdColors, setNewProdColors] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Estados para Edición de Producto Existente por el Vendedor
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    sale_price: "",
    original_price: "",
    stock: "10",
    category: "Perfume",
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

  const handleCreateSellerProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerSession) return;

    setSavingProduct(true);
    try {
      const slug = `${newProdName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-5)}`;
      const price = Number(newProdPrice);
      const originalPrice = newProdOriginalPrice ? Number(newProdOriginalPrice) : null;
      let discount = null;
      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      const newProd = {
        name: newProdName.trim(),
        slug,
        description: newProdDescription.trim(),
        sale_price: price,
        original_price: originalPrice,
        discount_percent: discount,
        category: newProdCategory,
        images: newProdImages,
        sizes: newProdSizes.trim(),
        colors: newProdColors.trim(),
        stock: Number(newProdStock) || 0,
        is_active: true,
        badge: "⭐ Boutique Verificada",
        seller_id: sellerSession.id,
        seller_name: sellerSession.store_name,
        is_official: false,
      };

      const { data, error } = await supabase.from("products").insert([newProd]).select().single();
      if (error) throw error;

      if (data) {
        setSellerProducts((prev) => [data, ...prev]);
        setIsCreatingProduct(false);
        setNewProdName("");
        setNewProdPrice("");
        setNewProdOriginalPrice("");
        setNewProdDescription("");
        setNewProdImages("");
        setNewProdSizes("");
        setNewProdColors("");
        alert("¡Producto publicado exitosamente en la tienda!");
      }
    } catch (err: any) {
      alert("Error al publicar producto: " + (err.message || JSON.stringify(err)));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setEditForm({
      name: prod.name || "",
      sale_price: String(prod.sale_price || ""),
      original_price: prod.original_price ? String(prod.original_price) : "",
      stock: String(prod.stock ?? 10),
      category: prod.category || "Perfume",
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
      const price = Number(editForm.sale_price);
      const originalPrice = editForm.original_price ? Number(editForm.original_price) : null;
      let discount = null;
      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      const updatedPayload = {
        name: editForm.name.trim(),
        sale_price: price,
        original_price: originalPrice,
        discount_percent: discount,
        category: editForm.category,
        stock: Number(editForm.stock) || 0,
        sizes: editForm.sizes.trim(),
        colors: editForm.colors.trim(),
        images: editForm.images,
        description: editForm.description.trim(),
        is_active: editForm.is_active,
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
          <div className="flex border-b border-white/10 gap-6 text-xs uppercase tracking-wider font-semibold">
            <button
              onClick={() => setActiveSellerTab("productos")}
              className={`pb-3 transition-colors cursor-pointer relative ${
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
              className={`pb-3 transition-colors cursor-pointer relative ${
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
              className={`pb-3 transition-colors cursor-pointer relative ${
                activeSellerTab === "billetera" ? "text-amber-400 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Billetera & Retiros
              {activeSellerTab === "billetera" && (
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
                  disabled={!isVerified}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                    isVerified
                      ? "bg-amber-400 hover:bg-amber-300 text-black active:scale-95"
                      : "bg-white/10 text-neutral-500 cursor-not-allowed"
                  }`}
                  title={!isVerified ? "Requiere que el Super Admin apruebe tu tienda primero" : ""}
                >
                  <span>+</span> Publicar Producto
                </button>
              </div>

              {/* FORMULARIO DE CREACIÓN DE PRODUCTO */}
              {isCreatingProduct && (
                <form
                  onSubmit={handleCreateSellerProduct}
                  className="bg-[#111116] border border-amber-400/40 p-6 rounded-2xl space-y-5 animate-in fade-in duration-200"
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <h4 className="text-xs uppercase font-bold tracking-widest text-amber-300">
                      Publicar Nuevo Producto en tu Boutique
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProduct(false)}
                      className="text-neutral-400 hover:text-white text-xl leading-none cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Nombre del Producto *</label>
                      <input
                        type="text"
                        required
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="Ej: Perfume Sauvage Elixir 100ml / Sneaker Retro High..."
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Stock Inicial *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newProdStock}
                        onChange={(e) => setNewProdStock(e.target.value)}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Precio de Venta (COP) *</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        placeholder="Ej: 180000"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded font-mono focus:outline-none focus:border-amber-400"
                      />
                      {newProdPrice && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          Tú recibes: $ {calculateOrderCommission(Number(newProdPrice), commission).sellerNet.toLocaleString("es-CO")} COP (descontando {commission}% comisión)
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Precio Original Tachado (Opcional)</label>
                      <input
                        type="number"
                        value={newProdOriginalPrice}
                        onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                        placeholder="Ej: 240000"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Categoría *</label>
                      <select
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Perfume">Perfume & Fragancia</option>
                        <option value="Zapatos">Sneakers & Calzado</option>
                        <option value="Ropa">Ropa Selecta</option>
                        <option value="Gorras">Gorra & Accesorio</option>
                        <option value="Joyería">Joyería & Oro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Tallas o Presentación (Opcional)</label>
                      <input
                        type="text"
                        value={newProdSizes}
                        onChange={(e) => setNewProdSizes(e.target.value)}
                        placeholder="Ej: 38, 39, 40, 41, 42 o 100ml / 50ml"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-300">Colores / Tonos (Opcional)</label>
                      <input
                        type="text"
                        value={newProdColors}
                        onChange={(e) => setNewProdColors(e.target.value)}
                        placeholder="Ej: Negro, Blanco, Azul Navy"
                        className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Imágenes del Producto</label>
                    <ImageGalleryUploader
                      value={newProdImages}
                      onChange={(urls) => setNewProdImages(urls)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Descripción & Detalles</label>
                    <textarea
                      rows={3}
                      value={newProdDescription}
                      onChange={(e) => setNewProdDescription(e.target.value)}
                      placeholder="Explica las características, notas olfativas o materiales..."
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProduct(false)}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="bg-amber-400 text-black px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-amber-300 transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {savingProduct ? "Guardando..." : "Publicar en Tienda"}
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

                    return (
                      <div
                        key={p.id}
                        className={`bg-[#111116] border rounded-2xl overflow-hidden flex flex-col justify-between p-4 space-y-3 transition-all ${
                          p.is_active !== false ? "border-white/10 hover:border-amber-400/40 shadow-sm" : "border-red-500/30 opacity-75"
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className="w-16 h-16 bg-black border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-neutral-600">Sin foto</span>
                            )}
                          </div>
                          <div className="space-y-1 overflow-hidden min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block truncate">{p.category}</span>
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

              <form onSubmit={handleSaveEditProduct} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3.5 py-2.5 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Precio de Venta (COP) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={editForm.sale_price}
                      onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                    {editForm.sale_price && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                        Tú recibes: $ {calculateOrderCommission(Number(editForm.sale_price), commission).sellerNet.toLocaleString("es-CO")} COP
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Precio Original Tachado (Opcional)</label>
                    <input
                      type="number"
                      value={editForm.original_price}
                      onChange={(e) => setEditForm({ ...editForm, original_price: e.target.value })}
                      placeholder="Ej: 240000"
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Stock Disponible *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Categoría *</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="Perfume">Perfume & Fragancia</option>
                      <option value="Zapatos">Sneakers & Calzado</option>
                      <option value="Ropa">Ropa Selecta</option>
                      <option value="Gorras">Gorra & Accesorio</option>
                      <option value="Joyería">Joyería & Oro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Tallas / Presentación</label>
                    <input
                      type="text"
                      value={editForm.sizes}
                      onChange={(e) => setEditForm({ ...editForm, sizes: e.target.value })}
                      placeholder="Ej: 38, 39, 40 o 100ml"
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-neutral-300">Colores / Tonos</label>
                    <input
                      type="text"
                      value={editForm.colors}
                      onChange={(e) => setEditForm({ ...editForm, colors: e.target.value })}
                      placeholder="Ej: Negro, Blanco"
                      className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">Fotos del Producto</label>
                  <ImageGalleryUploader
                    value={editForm.images}
                    onChange={(urls) => setEditForm({ ...editForm, images: urls })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-300">Descripción & Detalles</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 px-3 py-2 text-xs text-white rounded-lg focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
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

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
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

            <div className="text-center pt-2 border-t border-white/10 text-xs text-neutral-400">
              ¿Aún no tienes cuenta?{" "}
              <button
                onClick={() => setViewMode("register")}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Postula tu Boutique aquí &rarr;
              </button>
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

              <div className="pt-2">
                <button
                  onClick={() => setViewMode("login")}
                  className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  ¿Ya tienes una boutique registrada? Inicia sesión aquí &rarr;
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
