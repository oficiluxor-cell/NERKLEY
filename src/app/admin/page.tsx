"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { hasFreeShipping, extractDisplayBadge, buildProductBadge } from "@/lib/shipping";
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
import ImageGalleryUploader from "@/components/ImageGalleryUploader";

interface Order {
  id: string;
  created_at: string;
  product_name: string;
  total_price: number;
  customer_name: string;
  customer_document: string;
  customer_email?: string;
  customer_phone: string;
  city: string;
  address: string;
  notes: string;
  selected_size?: string;
  selected_color?: string;
  status: string;
  shipping_guide?: string;
  transport_company?: string;
  reference?: string;
  cart_items?: string;
}

interface Product {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  description?: string;
  sale_price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  category: string;
  images?: string;
  sizes?: string;
  colors?: string;
  stock: number;
  is_active: boolean;
  badge?: string;
}

const STATUS_OPTIONS = [
  "Pagado / En Preparación",
  "En Despacho / Enviado",
  "Entregado",
  "Pendiente de Pago",
  "Cancelado",
];

const TRANSPORT_COMPANIES = [
  "Interrapidísimo",
  "Servientrega",
  "Coordinadora",
  "Envía",
  "TCC",
  "Domicilio Local / Mensajería",
  "Otro",
];

const ADMIN_PASSWORD = "NERKLEY2027-Kleyner.";

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio no soportado
  }
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "pedidos" | "clientes" | "publicar">("pedidos");
  const [orderFilter, setOrderFilter] = useState<"despachar" | "enviados" | "entregados" | "pendientes" | "todos">("despachar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de formulario de creación de producto
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [category, setCategory] = useState("Perfume");
  const [subcategory, setSubcategory] = useState("");
  const [images, setImages] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [stock, setStock] = useState("");
  const [badge, setBadge] = useState("");
  const [isFreeShippingActive, setIsFreeShippingActive] = useState(false);
  const [presentationType, setPresentationType] = useState<"unidad" | "combo">("unidad");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal para edición completa de producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    category: string;
    subcategory: string;
    basePrice: string;
    discountPercent: string;
    stock: string;
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
    category: "",
    subcategory: "",
    basePrice: "",
    discountPercent: "",
    stock: "",
    badge: "",
    isFreeShipping: false,
    presentation: "unidad",
    sizes: "",
    colors: "",
    images: "",
    description: "",
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Buscador y filtros de catálogo
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("Todas");
  const [productPresentationFilter, setProductPresentationFilter] = useState<ProductPresentationType>("todos");
  const [bulkShippingLoading, setBulkShippingLoading] = useState(false);

  const prevOrdersCountRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("NERKLEY_admin_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  // Suscripción Realtime a Supabase
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("admin_live_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            const isPaid = (newOrder.status || "").toLowerCase().includes("pagad");
            if (isPaid) playChime();
            showToast(`¡Nueva orden recibida! #${newOrder.reference || newOrder.id.slice(0, 8)}`);
          }
          fetchData(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => fetchData(false), 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem("NERKLEY_admin_auth", "true");
      fetchData();
    } else {
      alert("Contraseña incorrecta. Acceso denegado.");
      setPasswordInput("");
    }
  };

  async function fetchData(showSpinner = true) {
    if (showSpinner) setLoading(true);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersData) {
      if (prevOrdersCountRef.current > 0 && ordersData.length > prevOrdersCountRef.current) {
        playChime();
      }
      prevOrdersCountRef.current = ordersData.length;
      setOrders(ordersData);

      if (selectedOrder) {
        const updated = ordersData.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsData) setProducts(productsData);

    if (showSpinner) setLoading(false);
  }

  // Normalización de estados
  const isPaidOrPrep = (status: string) => {
    const s = (status || "").toLowerCase();
    return s.includes("pagad") || s.includes("preparaci");
  };

  const isShipped = (status: string) => {
    const s = (status || "").toLowerCase();
    return s.includes("despacho") || s.includes("enviad");
  };

  const isDelivered = (status: string) => {
    const s = (status || "").toLowerCase();
    return s.includes("entregad");
  };

  const isPending = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === "pending" || s.includes("pendiente");
  };

  const isCanceled = (status: string) => {
    const s = (status || "").toLowerCase();
    return s.includes("cancelad");
  };

  // Contadores para pestañas
  const counts = useMemo(() => {
    return {
      despachar: orders.filter((o) => isPaidOrPrep(o.status)).length,
      enviados: orders.filter((o) => isShipped(o.status)).length,
      entregados: orders.filter((o) => isDelivered(o.status)).length,
      pendientes: orders.filter((o) => isPending(o.status)).length,
      todos: orders.length,
    };
  }, [orders]);

  // Filtrado de órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      let matchesTab = true;
      if (orderFilter === "despachar") matchesTab = isPaidOrPrep(o.status);
      else if (orderFilter === "enviados") matchesTab = isShipped(o.status);
      else if (orderFilter === "entregados") matchesTab = isDelivered(o.status);
      else if (orderFilter === "pendientes") matchesTab = isPending(o.status);

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (o.customer_name || "").toLowerCase();
      const phone = (o.customer_phone || "").toLowerCase();
      const doc = (o.customer_document || "").toLowerCase();
      const city = (o.city || "").toLowerCase();
      const ref = (o.reference || "").toLowerCase();
      const notes = (o.notes || "").toLowerCase();
      const prod = (o.product_name || "").toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        doc.includes(q) ||
        city.includes(q) ||
        ref.includes(q) ||
        notes.includes(q) ||
        prod.includes(q)
      );
    });
  }, [orders, orderFilter, searchQuery]);

  // Métricas financieras
  const confirmedOrders = useMemo(() => {
    return orders.filter((o) => isPaidOrPrep(o.status) || isShipped(o.status) || isDelivered(o.status));
  }, [orders]);

  const totalIngresos = useMemo(() => {
    return confirmedOrders.reduce((acc, o) => acc + Number(o.total_price || 0), 0);
  }, [confirmedOrders]);

  const ticketPromedio = useMemo(() => {
    if (confirmedOrders.length === 0) return 0;
    return Math.round(totalIngresos / confirmedOrders.length);
  }, [confirmedOrders, totalIngresos]);

  // Clientes CRM
  const customers = useMemo(() => {
    return Object.values(
      orders.reduce((acc: any, order) => {
        const key = order.customer_document || order.customer_phone;
        if (!key) return acc;

        if (!acc[key]) {
          acc[key] = {
            id: key,
            name: order.customer_name,
            document: order.customer_document,
            email: order.customer_email,
            phone: order.customer_phone,
            city: order.city,
            address: order.address,
            totalSpent: 0,
            orderCount: 0,
            paidOrderCount: 0,
            lastOrderDate: order.created_at,
          };
        }

        const isPaid = isPaidOrPrep(order.status) || isShipped(order.status) || isDelivered(order.status);
        if (isPaid) {
          acc[key].totalSpent += Number(order.total_price || 0);
          acc[key].paidOrderCount += 1;
        }
        acc[key].orderCount += 1;

        if (new Date(order.created_at) > new Date(acc[key].lastOrderDate)) {
          acc[key].lastOrderDate = order.created_at;
        }

        return acc;
      }, {})
    ).sort((a: any, b: any) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Acciones sobre órdenes
  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      alert("Error al actualizar estado: " + error.message);
      fetchData(false);
    } else {
      showToast(`Estado actualizado: ${newStatus}`);
    }
  };

  const handleUpdateOrderField = async (orderId: string, field: string, value: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, [field]: value });
    }
    const { error } = await supabase.from("orders").update({ [field]: value }).eq("id", orderId);
    if (error) {
      alert("Error al guardar: " + error.message);
      fetchData(false);
    } else {
      showToast("Datos de logística guardados");
    }
  };

  const handleDeleteOrder = async (orderId: string, orderRef: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el pedido "${orderRef}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      alert("Error al eliminar pedido: " + error.message);
    } else {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      showToast("Pedido eliminado correctamente");
    }
  };

  const handlePurgeAbandoned = async () => {
    const abandoned = orders.filter((o) => isPending(o.status));
    if (abandoned.length === 0) {
      alert("No hay pedidos pendientes o abandonados para depurar.");
      return;
    }

    if (!window.confirm(`¿Deseas eliminar todos los ${abandoned.length} intentos de compra pendientes o no pagados? Solo quedarán los pedidos confirmados.`)) {
      return;
    }

    const abandonedIds = abandoned.map((o) => o.id);
    const { error } = await supabase.from("orders").delete().in("id", abandonedIds);
    if (error) {
      alert("Error depurando intentos: " + error.message);
    } else {
      setOrders((prev) => prev.filter((o) => !abandonedIds.includes(o.id)));
      showToast(`Se limpiaron ${abandoned.length} pedidos no pagados`);
    }
  };

  const sendWhatsAppDirect = (phone: string, text: string) => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const notifyTrackingByWhatsApp = (order: Order) => {
    const cleanPhone = (order.customer_phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      alert("El cliente no tiene número de teléfono registrado.");
      return;
    }

    const message = `¡Hola ${order.customer_name}! 👋 Te saludamos de NERKLEY.\n\nTu pedido *${order.reference || "NERKLEY"}* ya ha sido despachado a través de *${order.transport_company || "la transportadora"}*.\n\n📦 *Número de Guía:* ${order.shipping_guide || "Pendiente"}\n📍 *Destino:* ${order.city}, ${order.address}\n\nPuedes rastrear tu paquete en la página oficial de la transportadora con tu número de guía. ¡Muchas gracias por tu compra en NERKLEY Concept Store! ✨`;

    sendWhatsAppDirect(cleanPhone, message);
  };

  const printShippingLabel = (order: Order) => {
    const printWindow = window.open("", "_blank", "width=700,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Rótulo de Envío - ${order.reference || order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
            .label-box { border: 2px solid #000; padding: 20px; max-width: 550px; margin: 0 auto; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
            .ref { font-size: 14px; font-weight: bold; font-family: monospace; }
            .section { margin-bottom: 14px; }
            .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 4px; }
            .content { font-size: 14px; font-weight: 600; line-height: 1.4; }
            .dest { background: #f4f4f4; padding: 12px; border: 1px dashed #000; margin-bottom: 16px; }
            .footer { border-top: 1px solid #ddd; padding-top: 10px; font-size: 11px; color: #666; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="header">
              <span class="title">NERKLEY</span>
              <span class="ref">${order.reference || order.id.slice(0, 10)}</span>
            </div>
            
            <div class="section">
              <div class="section-title">REMITENTE:</div>
              <div class="content">NERKLEY CONCEPTS<br/>Colombia &bull; Tienda Oficial</div>
            </div>

            <div class="dest">
              <div class="section-title">DESTINATARIO:</div>
              <div class="content" style="font-size: 16px; text-transform: uppercase;">${order.customer_name}</div>
              <div class="content">C.C. / NIT: ${order.customer_document || "N/A"}</div>
              <div class="content">Tel: ${order.customer_phone}</div>
              <div class="content" style="margin-top: 6px;">📍 ${order.address}</div>
              <div class="content" style="font-size: 15px; font-weight: bold;">CIUDAD: ${order.city.toUpperCase()}</div>
            </div>

            <div class="section">
              <div class="section-title">LOGÍSTICA / TRANSPORTADORA:</div>
              <div class="content">${order.transport_company || "Transportadora Asignada"} &bull; GUÍA: ${order.shipping_guide || "POR ASIGNAR"}</div>
            </div>

            <div class="section">
              <div class="section-title">CONTENIDO DEL PAQUETE:</div>
              <div class="content" style="font-size: 12px;">${order.product_name}</div>
            </div>

            <div class="footer">
              <span>Manejar con cuidado &bull; Frágil</span>
              <span>Total: $${Number(order.total_price).toLocaleString()} COP</span>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Creación de producto con generación segura de slug anti-duplicados
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);

    const initialPrice = parseFloat(basePrice);
    const discount = discountPercent ? parseFloat(discountPercent) : 0;
    const initialStock = parseInt(stock) || 0;

    const finalSalePrice = discount > 0 ? Math.round(initialPrice * (1 - discount / 100)) : initialPrice;
    const storedOriginalPrice = discount > 0 ? initialPrice : null;

    // Normalizar slug limpiando acentos y caracteres especiales
    const rawSlugBase = (slug || name)
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

    const fullCategory = buildFullCategory(category, subcategory);
    const finalBadge = buildPresentationBadge(badge, presentationType, isFreeShippingActive);

    const productPayload = {
      name: name.trim(),
      slug: targetSlug,
      description: description.trim(),
      sale_price: finalSalePrice,
      original_price: storedOriginalPrice,
      discount_percent: discount,
      category: fullCategory,
      images: images.trim(),
      sizes: sizes.trim(),
      colors: colors.trim(),
      stock: initialStock,
      is_active: true,
      badge: finalBadge,
    };

    let { error } = await supabase.from("products").insert([productPayload]);

    // Reintento automático de seguridad si colisiona la clave única
    if (error && error.message.includes("products_slug_key")) {
      const retrySlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
      const retryRes = await supabase
        .from("products")
        .insert([{ ...productPayload, slug: retrySlug }]);
      error = retryRes.error;
    }

    if (error) {
      alert("Error al crear producto: " + error.message);
    } else {
      showToast("¡Producto publicado con éxito en NERKLEY!");
      setName("");
      setSlug("");
      setDescription("");
      setBasePrice("");
      setDiscountPercent("");
      setImages("");
      setSizes("");
      setColors("");
      setStock("");
      setBadge("");
      setIsFreeShippingActive(false);
      setPresentationType("unidad");
      setSubcategory("");
      fetchData(false);
    }
    setCreating(false);
  };

  // Apertura y guardado de edición completa de producto
  const openEditModal = (p: Product) => {
    const base = p.original_price || p.sale_price;
    const isFree = hasFreeShipping(p);
    const cleanBadge = cleanCustomBadgeText(p.badge);
    const pres = getProductPresentation(p);
    const { mainCategory, subcategory: productSub } = parseCategory(p.category);
    const inferredSub = productSub || getProductSubcategory(p);

    setEditingProduct(p);
    setEditForm({
      name: p.name || "",
      category: mainCategory,
      subcategory: inferredSub,
      basePrice: String(base || ""),
      discountPercent: p.discount_percent ? String(p.discount_percent) : "0",
      stock: String(p.stock ?? 0),
      badge: cleanBadge,
      isFreeShipping: isFree,
      presentation: pres,
      sizes: p.sizes || "",
      colors: p.colors || "",
      images: p.images || "",
      description: p.description || "",
      is_active: p.is_active ?? true,
    });
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingEdit(true);

    const base = parseFloat(editForm.basePrice);
    if (isNaN(base) || base <= 0) {
      alert("Por favor ingresa un precio base válido.");
      setSavingEdit(false);
      return;
    }

    const discount = parseFloat(editForm.discountPercent) || 0;
    const stockVal = parseInt(editForm.stock) || 0;
    const finalSalePrice = discount > 0 ? Math.round(base * (1 - discount / 100)) : base;
    const finalOriginalPrice = discount > 0 ? base : null;
    const finalBadge = buildPresentationBadge(editForm.badge, editForm.presentation, editForm.isFreeShipping);
    const fullCategory = buildFullCategory(editForm.category, editForm.subcategory);

    const updates = {
      name: editForm.name.trim(),
      category: fullCategory,
      sale_price: finalSalePrice,
      original_price: finalOriginalPrice,
      discount_percent: discount,
      stock: stockVal,
      badge: finalBadge,
      sizes: editForm.sizes.trim(),
      colors: editForm.colors.trim(),
      images: editForm.images.trim(),
      description: editForm.description.trim(),
      is_active: editForm.is_active,
    };

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", editingProduct.id);

    if (error) {
      alert("Error al actualizar el producto: " + error.message);
    } else {
      showToast(`¡"${editForm.name}" actualizado con éxito!`);
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...updates } : item))
      );
      setEditingProduct(null);
    }
    setSavingEdit(false);
  };

  // Alternar rápidamente modalidad Unidad / Combo directamente desde la tabla
  const handleToggleProductPresentation = async (p: Product) => {
    const isCurrentlyCombo = isProductCombo(p);
    const newPres = isCurrentlyCombo ? "unidad" : "combo";
    const isFree = hasFreeShipping(p);
    const cleanBadge = cleanCustomBadgeText(p.badge);
    const newBadge = buildPresentationBadge(cleanBadge, newPres, isFree);

    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, badge: newBadge } : item))
    );

    const { error } = await supabase.from("products").update({ badge: newBadge }).eq("id", p.id);
    if (error) {
      alert("Error al cambiar modalidad: " + error.message);
      fetchData(false);
    } else {
      showToast(`¡"${p.name}" ahora es ${newPres === "combo" ? "🎁 COMBO" : "📦 UNIDAD"}!`);
    }
  };

  // Acciones rápidas en línea
  const handleQuickEditPrice = async (p: Product) => {
    const currentBase = p.original_price || p.sale_price;
    const newPriceStr = window.prompt(`Ingresa el nuevo precio base para "${p.name}" (COP):`, String(currentBase));
    if (newPriceStr === null) return;

    const newBase = parseFloat(newPriceStr);
    if (isNaN(newBase) || newBase <= 0) {
      alert("Precio inválido.");
      return;
    }

    const discount = p.discount_percent || 0;
    const newSalePrice = discount > 0 ? Math.round(newBase * (1 - discount / 100)) : newBase;
    const newOriginalPrice = discount > 0 ? newBase : null;

    const { error } = await supabase
      .from("products")
      .update({ sale_price: newSalePrice, original_price: newOriginalPrice })
      .eq("id", p.id);

    if (error) {
      alert("Error al actualizar precio: " + error.message);
    } else {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, sale_price: newSalePrice, original_price: newOriginalPrice } : item
        )
      );
      showToast(`Precio actualizado: $${newSalePrice.toLocaleString()} COP`);
    }
  };

  const handleQuickEditDiscount = async (p: Product) => {
    const currentDiscount = p.discount_percent || 0;
    const newDiscountStr = window.prompt(
      `Ingresa el % de descuento para "${p.name}" (Ej: 15, 20, 30. Escribe 0 para quitar):`,
      String(currentDiscount)
    );
    if (newDiscountStr === null) return;

    const newDiscount = parseFloat(newDiscountStr);
    if (isNaN(newDiscount) || newDiscount < 0 || newDiscount >= 95) {
      alert("Porcentaje de descuento inválido (debe ser entre 0 y 90).");
      return;
    }

    const base = p.original_price || p.sale_price;
    const newSalePrice = newDiscount > 0 ? Math.round(base * (1 - newDiscount / 100)) : base;
    const newOriginalPrice = newDiscount > 0 ? base : null;

    const { error } = await supabase
      .from("products")
      .update({
        sale_price: newSalePrice,
        original_price: newOriginalPrice,
        discount_percent: newDiscount,
      })
      .eq("id", p.id);

    if (error) {
      alert("Error al actualizar descuento: " + error.message);
    } else {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? { ...item, sale_price: newSalePrice, original_price: newOriginalPrice, discount_percent: newDiscount }
            : item
        )
      );
      showToast(newDiscount > 0 ? `Descuento del ${newDiscount}% aplicado` : "Descuento eliminado");
    }
  };

  const handleQuickRemoveDiscount = async (p: Product) => {
    if (!window.confirm(`¿Quitar el descuento de "${p.name}" y restaurar su precio original completo?`)) return;

    const restoredPrice = p.original_price || p.sale_price;

    const { error } = await supabase
      .from("products")
      .update({
        sale_price: restoredPrice,
        original_price: null,
        discount_percent: 0,
      })
      .eq("id", p.id);

    if (error) {
      alert("Error al quitar descuento: " + error.message);
    } else {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? { ...item, sale_price: restoredPrice, original_price: null, discount_percent: 0 }
            : item
        )
      );
      showToast("Descuento removido con éxito");
    }
  };

  const handleUpdateProductField = async (id: string, field: keyof Product, value: any) => {
    setProducts((prev) => prev.map((prod) => (prod.id === id ? { ...prod, [field]: value } : prod)));
    const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
    if (error) {
      alert(`Error al actualizar: ${error.message}`);
      fetchData(false);
    } else {
      showToast("Inventario actualizado");
    }
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!window.confirm(`¿Deseas eliminar permanentemente "${productName}" del catálogo? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      fetchData(false);
      showToast("Producto eliminado");
    }
    setDeletingId(null);
  };

  const getProductImageByName = (productName: string) => {
    const found = products.find((p) => productName.toLowerCase().includes(p.name.toLowerCase()));
    if (found && found.images) {
      return found.images.split(",")[0].trim();
    }
    return null;
  };

  // Categorías únicas de productos
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return ["Todas", ...Array.from(set)];
  }, [products]);

  // Conteo y estadísticas por categoría
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; freeShipping: number }>();
    products.forEach((p) => {
      const cat = p.category ? p.category.trim() : "Sin Categoría";
      const current = map.get(cat) || { total: 0, freeShipping: 0 };
      current.total += 1;
      if (hasFreeShipping(p)) current.freeShipping += 1;
      map.set(cat, current);
    });
    return map;
  }, [products]);

  // Alternar Envío Gratis para un producto individual directamente desde la tabla
  const handleToggleSingleProductFreeShipping = async (p: Product) => {
    const isCurrentlyFree = hasFreeShipping(p);
    const newBadge = buildProductBadge(p.badge || "", !isCurrentlyFree);

    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, badge: newBadge } : item))
    );

    const { error } = await supabase
      .from("products")
      .update({ badge: newBadge })
      .eq("id", p.id);

    if (error) {
      alert("Error al actualizar envío: " + error.message);
      fetchData(false);
    } else {
      showToast(
        !isCurrentlyFree
          ? `¡Envío Gratis activado para "${p.name}"!`
          : `Envío fijado en $15.000 COP para "${p.name}"`
      );
    }
  };

  // Alternar Envío Gratis para TODOS los productos a la vez
  const handleToggleAllFreeShipping = async (enable: boolean) => {
    const count = products.length;
    if (count === 0) return;

    const actionText = enable ? "ACTIVAR Envío Gratis en TODOS" : "DESACTIVAR Envío Gratis en TODOS";
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText} los ${count} productos de la tienda?`)) {
      return;
    }

    setBulkShippingLoading(true);

    const updated = products.map((p) => ({
      ...p,
      badge: buildProductBadge(p.badge || "", enable),
    }));

    setProducts(updated);

    for (const p of updated) {
      await supabase.from("products").update({ badge: p.badge }).eq("id", p.id);
    }

    setBulkShippingLoading(false);
    showToast(
      enable
        ? `¡Envío Gratis activado con éxito en los ${count} productos!`
        : "Envío Gratis desactivado en todos los productos (Tarifa $15.000)"
    );
  };

  // Alternar Envío Gratis para una CATEGORÍA específica
  const handleToggleCategoryFreeShipping = async (categoryName: string, enable: boolean) => {
    const categoryProducts = products.filter(
      (p) => p.category?.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (categoryProducts.length === 0) return;

    const actionText = enable ? `ACTIVAR Envío Gratis para todos los "${categoryName}"` : `DESACTIVAR Envío Gratis para todos los "${categoryName}"`;
    if (!window.confirm(`¿Deseas ${actionText} (${categoryProducts.length} productos)?`)) {
      return;
    }

    setBulkShippingLoading(true);

    const updated = categoryProducts.map((p) => ({
      ...p,
      badge: buildProductBadge(p.badge || "", enable),
    }));

    setProducts((prev) =>
      prev.map((p) => {
        const found = updated.find((u) => u.id === p.id);
        return found || p;
      })
    );

    for (const p of updated) {
      await supabase.from("products").update({ badge: p.badge }).eq("id", p.id);
    }

    setBulkShippingLoading(false);
    showToast(
      enable
        ? `¡Envío Gratis activado para todos los productos de "${categoryName}"!`
        : `Envío Gratis desactivado para categoría "${categoryName}"`
    );
  };

  // Estadísticas globales de modalidad para el inventario
  const presentationStats = useMemo(() => {
    let unidades = 0;
    let combos = 0;
    products.forEach((p) => {
      if (isProductCombo(p)) combos++;
      else unidades++;
    });
    return { total: products.length, unidades, combos };
  }, [products]);

  // Productos filtrados para el inventario
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productCategoryFilter !== "Todas" && p.category?.toLowerCase() !== productCategoryFilter.toLowerCase()) {
        return false;
      }
      if (productPresentationFilter !== "todos") {
        const isCombo = isProductCombo(p);
        if (productPresentationFilter === "combo" && !isCombo) return false;
        if (productPresentationFilter === "unidad" && isCombo) return false;
      }
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.badge || "").toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productCategoryFilter, productPresentationFilter]);

  // Pantalla de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#111115] border border-white/10 p-8 md:p-10 shadow-2xl text-center space-y-6">
          <div className="space-y-1">
            <span className="text-3xl font-serif font-bold tracking-[0.3em] uppercase block text-white">NERKLEY</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-medium block">
              Panel de Control Absoluto &bull; Modo Dios
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">Contraseña Maestra</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresa tu clave de acceso"
                className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-xs text-white focus:outline-none focus:border-white tracking-widest text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black py-3.5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-md cursor-pointer active:scale-98"
            >
              Acceder al Panel
            </button>
          </form>

          <div className="pt-4 border-t border-white/10">
            <Link href="/" className="text-[10px] text-neutral-500 uppercase tracking-widest hover:text-white transition-colors">
              &larr; Volver a la Tienda Pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col md:flex-row selection:bg-white selection:text-black">
      {/* Toast flotante de notificación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white text-black px-5 py-3 border border-white shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Lateral */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between bg-[#0e0e12]">
        <div className="space-y-8">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#111115] border border-amber-400/30 flex items-center justify-center p-1">
                <img src="/logo.svg" alt="NERKLEY" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-serif font-bold tracking-[0.3em] uppercase text-white">NERKLEY</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-400 font-semibold">MODO DIOS ACTIVO</span>
              </div>
            </Link>
          </div>

          <nav className="space-y-2 text-xs uppercase tracking-[0.2em] font-medium">
            <button
              onClick={() => setActiveTab("pedidos")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === "pedidos"
                  ? "bg-white text-black font-bold border-white shadow-lg"
                  : "text-neutral-300 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Control de Pedidos</span>
              {counts.despachar > 0 && (
                <span className="bg-emerald-500 text-black px-2 py-0.5 text-[10px] font-bold rounded-xs">
                  {counts.despachar}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === "dashboard"
                  ? "bg-white text-black font-bold border-white shadow-lg"
                  : "text-neutral-300 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Finanzas & Métricas</span>
            </button>

            <button
              onClick={() => setActiveTab("clientes")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === "clientes"
                  ? "bg-white text-black font-bold border-white shadow-lg"
                  : "text-neutral-300 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Clientes & CRM</span>
              <span className="text-neutral-500 text-[10px]">{customers.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("publicar")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer flex items-center justify-between border ${
                activeTab === "publicar"
                  ? "bg-white text-black font-bold border-white shadow-lg"
                  : "text-neutral-300 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Catálogo & Stock</span>
              <span className="text-neutral-500 text-[10px]">{products.length}</span>
            </button>

            <Link
              href="/video-ad"
              target="_blank"
              className="w-full text-left px-4 py-3 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400 hover:text-black font-bold transition-all cursor-pointer flex items-center justify-between mt-3 group"
            >
              <span className="flex items-center gap-2">
                <span>🎬</span>
                <span className="text-xs uppercase tracking-wider">TikTok Ads Video</span>
              </span>
              <span className="text-[9px] uppercase font-mono tracking-wider bg-amber-400/20 group-hover:bg-black/20 px-2 py-0.5 rounded font-bold">
                CREADOR
              </span>
            </Link>
          </nav>
        </div>

        <div className="pt-8 border-t border-white/10 space-y-3">
          <div className="p-3 bg-white/5 border border-white/5 space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-neutral-400 block font-medium">Sincronización:</span>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>En vivo con Wompi</span>
            </div>
          </div>

          <Link href="/" className="block text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors">
            &larr; Ver Tienda Pública
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem("NERKLEY_admin_auth");
              setIsAuthenticated(false);
            }}
            className="block text-xs uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors text-left w-full cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto max-h-screen">
        <header className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wider font-bold text-white">
              {activeTab === "pedidos" && "Centro de Operaciones & Despachos"}
              {activeTab === "dashboard" && "Dashboard Financiero & Métricas Dios"}
              {activeTab === "clientes" && "Directorio de Clientes CRM"}
              {activeTab === "publicar" && "Catálogo, Precios & Control de Stock"}
            </h1>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">
              NERKLEY Luxury Concepts &bull; Actualizado en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              className="bg-[#111115] border border-white/10 hover:border-white px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualizar Ahora</span>
            </button>
          </div>
        </header>

        {/* PESTAÑA: PEDIDOS */}
        {activeTab === "pedidos" && (
          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => setOrderFilter("despachar")}
                className={`p-4 border transition-all cursor-pointer ${
                  orderFilter === "despachar" ? "bg-emerald-500/10 border-emerald-500 text-white" : "bg-[#111115] border-white/10 text-neutral-400 hover:border-white/30"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest block font-medium">Por Despachar (Pagados)</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">{counts.despachar}</span>
                <span className="text-[9px] text-neutral-400 mt-1 block">Requieren empaque y guía hoy</span>
              </div>

              <div
                onClick={() => setOrderFilter("enviados")}
                className={`p-4 border transition-all cursor-pointer ${
                  orderFilter === "enviados" ? "bg-sky-500/10 border-sky-500 text-white" : "bg-[#111115] border-white/10 text-neutral-400 hover:border-white/30"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest block font-medium">En Ruta / Enviados</span>
                <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">{counts.enviados}</span>
                <span className="text-[9px] text-neutral-400 mt-1 block">Con guía asignada</span>
              </div>

              <div
                onClick={() => setOrderFilter("entregados")}
                className={`p-4 border transition-all cursor-pointer ${
                  orderFilter === "entregados" ? "bg-purple-500/10 border-purple-500 text-white" : "bg-[#111115] border-white/10 text-neutral-400 hover:border-white/30"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest block font-medium">Entregados con Éxito</span>
                <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">{counts.entregados}</span>
                <span className="text-[9px] text-neutral-400 mt-1 block">Venta concluida</span>
              </div>

              <div
                onClick={() => setOrderFilter("pendientes")}
                className={`p-4 border transition-all cursor-pointer ${
                  orderFilter === "pendientes" ? "bg-amber-500/10 border-amber-500 text-white" : "bg-[#111115] border-white/10 text-neutral-400 hover:border-white/30"
                }`}
              >
                <span className="text-[10px] uppercase tracking-widest block font-medium">Intentos No Pagados</span>
                <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{counts.pendientes}</span>
                <span className="text-[9px] text-neutral-400 mt-1 block">Carritos no completados</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#111115] border border-white/10 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setOrderFilter("despachar")}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    orderFilter === "despachar" ? "bg-emerald-500 text-black border-emerald-500 shadow-sm" : "bg-[#0a0a0c] text-neutral-300 border-white/10 hover:text-white"
                  }`}
                >
                  🟢 Por Despachar ({counts.despachar})
                </button>
                <button
                  onClick={() => setOrderFilter("enviados")}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    orderFilter === "enviados" ? "bg-sky-500 text-black border-sky-500 shadow-sm" : "bg-[#0a0a0c] text-neutral-300 border-white/10 hover:text-white"
                  }`}
                >
                  🚚 En Ruta ({counts.enviados})
                </button>
                <button
                  onClick={() => setOrderFilter("entregados")}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    orderFilter === "entregados" ? "bg-purple-500 text-black border-purple-500 shadow-sm" : "bg-[#0a0a0c] text-neutral-300 border-white/10 hover:text-white"
                  }`}
                >
                  ✅ Entregados ({counts.entregados})
                </button>
                <button
                  onClick={() => setOrderFilter("pendientes")}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    orderFilter === "pendientes" ? "bg-amber-500 text-black border-amber-500 shadow-sm" : "bg-[#0a0a0c] text-neutral-300 border-white/10 hover:text-white"
                  }`}
                >
                  ⏳ No Pagados ({counts.pendientes})
                </button>
                <button
                  onClick={() => setOrderFilter("todos")}
                  className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    orderFilter === "todos" ? "bg-white text-black border-white shadow-sm" : "bg-[#0a0a0c] text-neutral-300 border-white/10 hover:text-white"
                  }`}
                >
                  Ver Todos ({counts.todos})
                </button>
              </div>

              {orderFilter === "pendientes" && counts.pendientes > 0 && (
                <button
                  onClick={handlePurgeAbandoned}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Limpiar Todos los No Pagados
                </button>
              )}

              <div className="relative min-w-[280px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, tel, ref o ciudad..."
                  className="w-full bg-[#0a0a0c] border border-white/10 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Consultando base de datos...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-[#111115] border border-dashed border-white/10 p-12 text-center space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                  No hay pedidos en esta sección
                </p>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {orderFilter === "despachar"
                    ? "¡Excelente! No tienes pedidos pagados pendientes de despacho en este momento."
                    : "No se encontraron registros con los filtros seleccionados."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10 bg-[#111115]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0a0c] uppercase text-neutral-400 border-b border-white/10 tracking-widest text-[10px]">
                    <tr>
                      <th className="p-4">Referencia & Fecha</th>
                      <th className="p-4">Cliente & Destino</th>
                      <th className="p-4">Artículos</th>
                      <th className="p-4">Total Pagado</th>
                      <th className="p-4">Transportadora & Guía</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOrders.map((o) => {
                      const imgUrl = getProductImageByName(o.product_name);
                      const isPaid = isPaidOrPrep(o.status);
                      const isEnv = isShipped(o.status);
                      const isEnt = isDelivered(o.status);
                      const isPend = isPending(o.status);

                      return (
                        <tr
                          key={o.id}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <td className="p-4 space-y-1">
                            <span className="font-mono font-bold text-white block text-sm">
                              {o.reference || `NRK-${o.id.slice(0, 8)}`}
                            </span>
                            <span className="text-[10px] text-neutral-400 block">
                              {new Date(o.created_at).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>

                          <td className="p-4 space-y-1">
                            <span className="font-bold text-white block text-sm">{o.customer_name}</span>
                            <div className="flex items-center gap-2 text-neutral-300 text-[11px]">
                              <span>{o.customer_phone}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sendWhatsAppDirect(o.customer_phone, `Hola ${o.customer_name}, te saludamos de NERKLEY.`);
                                }}
                                className="text-emerald-400 hover:text-emerald-300 text-[10px] underline cursor-pointer"
                              >
                                WhatsApp
                              </button>
                            </div>
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              📍 {o.city} &bull; {o.address}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3 max-w-xs">
                              <div className="w-10 h-12 bg-black border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="Producto" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-neutral-600">NERKLEY</span>
                                )}
                              </div>
                              <span className="text-neutral-200 line-clamp-2 text-xs font-medium">
                                {o.product_name}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-mono font-bold text-white text-sm block">
                              $ {Number(o.total_price).toLocaleString("es-CO")}
                            </span>
                            <span className="text-[9px] text-neutral-400 uppercase">COP</span>
                          </td>

                          <td className="p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
                            {o.shipping_guide ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-neutral-300 font-semibold block uppercase">
                                  {o.transport_company || "Transportadora"}
                                </span>
                                <span className="font-mono font-bold text-emerald-400 text-xs block">
                                  {o.shipping_guide}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-500 italic block">Sin guía asignada</span>
                            )}
                          </td>

                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={o.status}
                              onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-colors appearance-none cursor-pointer ${
                                isPaid
                                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                                  : isEnv
                                  ? "bg-sky-950/40 border-sky-500/50 text-sky-300"
                                  : isEnt
                                  ? "bg-purple-950/40 border-purple-500/50 text-purple-300"
                                  : isPend
                                  ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                                  : "bg-red-950/40 border-red-500/50 text-red-300"
                              }`}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st} className="bg-[#111115] text-white">
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(o);
                              }}
                              className="bg-white text-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all cursor-pointer"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA: DASHBOARD */}
        {activeTab === "dashboard" && (
          <section className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#111115] border border-white/10 p-6 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold block">
                  Ingresos Confirmados
                </span>
                <p className="text-3xl font-bold font-mono text-emerald-400">
                  $ {totalIngresos.toLocaleString("es-CO")} <span className="text-xs text-neutral-400">COP</span>
                </p>
                <p className="text-[10px] text-neutral-400">
                  Total de pagos aprobados en Wompi ({confirmedOrders.length} compras)
                </p>
              </div>

              <div className="bg-[#111115] border border-white/10 p-6 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold block">
                  Por Despachar Hoy
                </span>
                <p className="text-3xl font-bold font-mono text-white">
                  {counts.despachar} <span className="text-xs text-neutral-400">Pedidos</span>
                </p>
                <p className="text-[10px] text-neutral-400">
                  Clientes esperando que empaques su producto
                </p>
              </div>

              <div className="bg-[#111115] border border-white/10 p-6 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold block">
                  Ticket Promedio
                </span>
                <p className="text-3xl font-bold font-mono text-white">
                  $ {ticketPromedio.toLocaleString("es-CO")} <span className="text-xs text-neutral-400">COP</span>
                </p>
                <p className="text-[10px] text-neutral-400">
                  Valor medio por cada venta confirmada
                </p>
              </div>

              <div className="bg-[#111115] border border-white/10 p-6 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold block">
                  Ventas Entregadas
                </span>
                <p className="text-3xl font-bold font-mono text-purple-400">
                  {counts.entregados} <span className="text-xs text-neutral-400">Órdenes</span>
                </p>
                <p className="text-[10px] text-neutral-400">
                  Proceso logístico cerrado y cliente satisfecho
                </p>
              </div>
            </div>

            <div className="bg-[#111115] border border-white/10 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-xs uppercase tracking-[0.25em] font-bold text-white">
                  Últimos Pedidos Confirmados (Listos para Envío)
                </h3>
                <button
                  onClick={() => {
                    setActiveTab("pedidos");
                    setOrderFilter("despachar");
                  }}
                  className="text-[10px] uppercase tracking-widest text-emerald-400 hover:underline cursor-pointer"
                >
                  Gestionar Despachos &rarr;
                </button>
              </div>

              {confirmedOrders.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div>
                    <span className="font-mono font-bold text-white text-xs mr-3">
                      {o.reference || `NRK-${o.id.slice(0, 8)}`}
                    </span>
                    <span className="font-semibold text-neutral-200 text-xs">{o.customer_name}</span>
                    <span className="text-[10px] text-neutral-400 ml-2">📍 {o.city}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      $ {Number(o.total_price).toLocaleString("es-CO")} COP
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PESTAÑA: CLIENTES CRM */}
        {activeTab === "clientes" && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-neutral-300">
                  Directorio de Clientes ({customers.length})
                </h2>
                <p className="text-[10px] text-neutral-500 mt-0.5">Ordenados por volumen total de compra</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-white/10 bg-[#111115]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0a0a0c] uppercase text-neutral-400 border-b border-white/10 tracking-widest text-[10px]">
                  <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Documento / Cédula</th>
                    <th className="p-4">Teléfono & WhatsApp</th>
                    <th className="p-4">Ciudad / Dirección</th>
                    <th className="p-4 text-center">Compras Pagadas</th>
                    <th className="p-4 text-right">Inversión Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white uppercase">{c.name}</td>
                      <td className="p-4 text-neutral-300 font-mono">{c.document || "N/A"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-300">{c.phone}</span>
                          <button
                            onClick={() => sendWhatsAppDirect(c.phone, `Hola ${c.name}, te saludamos de NERKLEY.`)}
                            className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 px-2 py-0.5 text-[9px] uppercase font-bold transition-all cursor-pointer"
                          >
                            WhatsApp
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white block font-medium">{c.city}</span>
                        <span className="text-[10px] text-neutral-400 block">{c.address}</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white text-center">{c.paidOrderCount}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400 text-right">
                        $ {c.totalSpent.toLocaleString("es-CO")} COP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PESTAÑA: CATÁLOGO, PRECIOS & INVENTARIO */}
        {activeTab === "publicar" && (
          <div className="space-y-12">
            {/* Formulario de Publicación */}
            <section className="bg-[#111115] border border-white/10 p-8 max-w-4xl space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-white">
                  Publicar Nuevo Producto en NERKLEY
                </h2>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
                  Perfumes &bull; Ropa Selecta &bull; Gorras &bull; Zapatos &bull; Oro
                </span>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Perfume Creed Aventus / Camiseta Trapstar"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Stock Inicial *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Ej: 20"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Precio Base (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="Ej: 350000"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Descuento % (Opcional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="Ej: 15"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Categoría Principal *
                    </label>
                    <input
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ej: Ropa, Perfumes, Zapatos, Relojes, Oro"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                    />
                    {/* Chips rápidos de categorías principales */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["Ropa", "Perfumes", "Zapatos", "Relojes", "Oro"].map((catOption) => (
                        <button
                          key={catOption}
                          type="button"
                          onClick={() => setCategory(catOption)}
                          className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            category.toLowerCase() === catOption.toLowerCase()
                              ? "bg-white text-black font-bold border-white"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {catOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUBCATEGORÍA / TIPO DE PRODUCTO */}
                  <div className="md:col-span-3 space-y-2 p-3.5 bg-white/[0.02] border border-white/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
                        Tipo de Producto / Subcategoría
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {subcategory ? `Tipo: ${subcategory}` : "General (sin subcategoría)"}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      placeholder="Ej: Suéter, Gorras, Zapatos, Hoodies, Árabe, Diseñador..."
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white"
                    />

                    {/* Sugerencias contextuales según la categoría seleccionada */}
                    {SUGGESTED_SUBCATEGORIES[category] && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9.5px] text-neutral-400 font-light block">
                          Sugerencias rápidas para <strong className="text-white">{category}</strong> (toca para elegir):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTED_SUBCATEGORIES[category].map((subOption) => (
                            <button
                              key={subOption}
                              type="button"
                              onClick={() => setSubcategory(subOption)}
                              className={`text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                                subcategory.toLowerCase() === subOption.toLowerCase()
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

                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                        Tallas Disponibles (Separadas por comas)
                      </label>
                      <input
                        type="text"
                        value={sizes}
                        onChange={(e) => setSizes(e.target.value)}
                        placeholder="Ej: S, M, L, XL ó 39, 40, 41, 42"
                        className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                        Colores Disponibles (Separados por comas)
                      </label>
                      <input
                        type="text"
                        value={colors}
                        onChange={(e) => setColors(e.target.value)}
                        placeholder="Ej: Negro Obsidiana, Blanco, Dorado"
                        className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  {/* MODALIDAD DE VENTA: UNIDAD O COMBO */}
                  <div className="md:col-span-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
                        Modalidad de Venta / Presentación *
                      </label>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {presentationType === "combo" ? "🎁 Modo: COMBO / DÚO" : "📦 Modo: 1 UNIDAD"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPresentationType("unidad")}
                        className={`p-3.5 border rounded-lg text-left transition-all cursor-pointer flex items-center gap-3 ${
                          presentationType === "unidad"
                            ? "bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/50"
                            : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                            presentationType === "unidad"
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
                            1 solo artículo (ej: 1 Perfume 100ml)
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPresentationType("combo")}
                        className={`p-3.5 border rounded-lg text-left transition-all cursor-pointer flex items-center gap-3 ${
                          presentationType === "combo"
                            ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(232,198,98,0.25)] ring-1 ring-amber-400/50"
                            : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
                            presentationType === "combo"
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
                            2 o más artículos / pack ahorro
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Insignia / Etiqueta Destacada (Opcional)
                    </label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="Ej: Edición Limitada, Exclusivo, Top Ventas"
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  {/* PROMO ENVÍO GRATIS */}
                  <div className="md:col-span-3 p-4 bg-amber-500/5 border border-amber-400/20 rounded-sm">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isFreeShippingActive}
                        onChange={(e) => setIsFreeShippingActive(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                          🎁 Promoción Activa: Envío Gratis
                        </span>
                        <span className="text-[11px] text-neutral-400 font-light block mt-0.5">
                          Al activarlo, el producto se mostrará con costo de envío $0 COP, el comprador verá el ahorro y la insignia destacada.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">
                      Descripción del Producto *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalles de lujo, materiales originales, notas de autor o procedencia..."
                      className="w-full bg-[#0a0a0c] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  {/* FOTOS DEL PRODUCTO CON SELECTOR DE GALERÍA DIRECTO */}
                  <div className="md:col-span-3">
                    <ImageGalleryUploader
                      value={images}
                      onChange={setImages}
                      label="Fotos del Producto"
                      helperText="Selecciona fotos de tu galería o toma fotos directamente con la cámara"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="bg-white text-black px-8 py-3.5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {creating ? "Publicando en Tienda..." : "Publicar Producto"}
                </button>
              </form>
            </section>

            {/* Listado de Inventario & Control de Precios */}
            <section className="space-y-6">
              {/* PANEL MAESTRO: GESTIÓN DE ENVÍOS GLOBALES Y POR CATEGORÍA */}
              <div className="bg-[#111115] border border-white/10 p-5 rounded space-y-4 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚚</span>
                      <h3 className="text-xs uppercase tracking-widest font-bold text-white">
                        Control de Envíos & Categorías
                      </h3>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Tarifa fija nacional: <strong className="text-white">$15.000 COP</strong>. Activa o desactiva la promoción de Envío Gratis en 1 clic para toda la tienda o por categorías.
                    </p>
                  </div>

                  {/* Botones Globales */}
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button
                      type="button"
                      disabled={bulkShippingLoading || products.length === 0}
                      onClick={() => handleToggleAllFreeShipping(true)}
                      className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✨ Poner TODOS en Envío Gratis</span>
                    </button>

                    <button
                      type="button"
                      disabled={bulkShippingLoading || products.length === 0}
                      onClick={() => handleToggleAllFreeShipping(false)}
                      className="bg-white/5 text-neutral-300 border border-white/10 hover:border-white/30 hover:text-white px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <span>Quitar Envío Gratis a Todos</span>
                    </button>
                  </div>
                </div>

                {/* NAVEGACIÓN Y SECCIONES POR CATEGORÍAS */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block">
                      Selecciona una Categoría para Gestionar:
                    </span>
                    {productCategoryFilter !== "Todas" && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          disabled={bulkShippingLoading}
                          onClick={() => handleToggleCategoryFreeShipping(productCategoryFilter, true)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider cursor-pointer"
                        >
                          + Envío Gratis a todos los "{productCategoryFilter}"
                        </button>
                        <span className="text-neutral-600">•</span>
                        <button
                          type="button"
                          disabled={bulkShippingLoading}
                          onClick={() => handleToggleCategoryFreeShipping(productCategoryFilter, false)}
                          className="text-neutral-400 hover:text-white uppercase tracking-wider cursor-pointer"
                        >
                          Quitar en "{productCategoryFilter}"
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PESTAÑAS (TABS) DE CATEGORÍAS */}
                  <div className="flex flex-wrap gap-2">
                    {uniqueCategories.map((cat) => {
                      const stats = cat === "Todas"
                        ? { total: products.length, freeShipping: products.filter(p => hasFreeShipping(p)).length }
                        : categoryStats.get(cat) || { total: 0, freeShipping: 0 };
                      const isActive = productCategoryFilter.toLowerCase() === cat.toLowerCase();

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setProductCategoryFilter(cat)}
                          className={`px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
                            isActive
                              ? "bg-white text-black border-white shadow-md font-bold"
                              : "bg-[#0a0a0c] border-white/10 text-neutral-300 hover:border-white/30"
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${isActive ? "bg-black/10 text-black" : "bg-white/10 text-neutral-300"}`}>
                            {stats.total}
                          </span>
                          {stats.freeShipping > 0 && (
                            <span className={`text-[9px] font-bold ${isActive ? "text-emerald-800" : "text-emerald-400"}`}>
                              🚚 {stats.freeShipping}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BARRA DE BÚSQUEDA Y TOTALES */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-white">
                    {productCategoryFilter === "Todas" ? "Todas las Piezas" : `Categoría: ${productCategoryFilter}`} ({filteredProducts.length} productos)
                  </h4>
                  {/* PESTAÑAS DE MODALIDAD: TODAS / UNIDADES / COMBOS */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setProductPresentationFilter("todos")}
                      className={`px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 ${
                        productPresentationFilter === "todos"
                          ? "bg-white text-black font-bold shadow"
                          : "bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      <span>✨ Todas</span>
                      <span className="text-[9px] font-mono opacity-70">({presentationStats.total})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductPresentationFilter("unidad")}
                      className={`px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 ${
                        productPresentationFilter === "unidad"
                          ? "bg-white text-black font-bold shadow"
                          : "bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      <span>📦 Unidades</span>
                      <span className="text-[9px] font-mono opacity-70">({presentationStats.unidades})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProductPresentationFilter("combo")}
                      className={`px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 ${
                        productPresentationFilter === "combo"
                          ? "bg-gradient-to-r from-amber-400 to-amber-300 text-black font-black shadow-[0_0_15px_rgba(232,198,98,0.3)]"
                          : "bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
                      }`}
                    >
                      <span>🎁 Combos</span>
                      <span className="text-[9px] font-mono font-bold">({presentationStats.combos})</span>
                    </button>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre..."
                    className="w-full sm:w-72 bg-[#111115] border border-white/10 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-white/10 bg-[#111115]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0a0c] uppercase text-neutral-400 border-b border-white/10 tracking-widest text-[10px]">
                    <tr>
                      <th className="p-4">Foto & Producto</th>
                      <th className="p-4">Categoría</th>
                      <th className="p-4">Precio & Descuento</th>
                      <th className="p-4">Envío / Promo</th>
                      <th className="p-4 w-24">Stock</th>
                      <th className="p-4 w-28">Visibilidad</th>
                      <th className="p-4 text-right">Gestión Rápida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map((p) => {
                      const firstImg = p.images ? p.images.split(",")[0].trim() : null;
                      const hasDiscount = Boolean(p.discount_percent && p.discount_percent > 0);

                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-14 bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                                {firstImg ? (
                                  <img src={firstImg} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-neutral-600">N/A</span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <span className="font-bold text-white block text-sm">{p.name}</span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Pill de Modalidad con alternador rápido */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleProductPresentation(p)}
                                    title="Haz clic para alternar entre Unidad y Combo"
                                    className={`inline-flex items-center gap-1 text-[8.5px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                      isProductCombo(p)
                                        ? "text-amber-300 bg-amber-400/15 border-amber-400/40 hover:bg-amber-400/25 shadow-xs"
                                        : "text-neutral-300 bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30"
                                    }`}
                                  >
                                    <span>{isProductCombo(p) ? "🎁 COMBO" : "📦 UNIDAD"}</span>
                                    <span className="text-[7.5px] opacity-60">⇆</span>
                                  </button>

                                  {p.badge && extractDisplayBadge(p.badge) !== "" && (
                                    <span className="inline-block text-[9px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 border border-amber-400/20">
                                      {extractDisplayBadge(p.badge)}
                                    </span>
                                  )}
                                  {hasFreeShipping(p) && (
                                    <span className="inline-block text-[9px] uppercase tracking-wider font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 border border-emerald-500/30 rounded">
                                      🚚 Envío Gratis
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-neutral-300 uppercase tracking-wider text-[11px] font-semibold">
                            <span className="block text-white font-bold">{parseCategory(p.category).mainCategory}</span>
                            {getProductSubcategory(p) ? (
                              <span className="inline-block text-[9px] text-amber-400 font-mono tracking-normal bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded mt-0.5">
                                {getProductSubcategory(p)}
                              </span>
                            ) : null}
                          </td>

                          <td className="p-4 space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono font-bold text-emerald-400 text-sm">
                                $ {Number(p.sale_price).toLocaleString("es-CO")}
                              </span>
                              {hasDiscount && p.original_price && (
                                <span className="text-[10px] text-red-400 line-through font-mono">
                                  $ {Number(p.original_price).toLocaleString("es-CO")}
                                </span>
                              )}
                            </div>

                            {hasDiscount ? (
                              <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30">
                                -{p.discount_percent}% OFF
                              </span>
                            ) : (
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">
                                Sin descuento
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleToggleSingleProductFreeShipping(p)}
                              title="Haz clic para alternar Envío Gratis o $15.000 Fijo"
                              className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider border rounded cursor-pointer transition-all flex items-center gap-1.5 ${
                                hasFreeShipping(p)
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                                  : "bg-white/5 text-neutral-400 border-white/10 hover:border-white/30 hover:text-white"
                              }`}
                            >
                              <span>{hasFreeShipping(p) ? "🚚 Gratis" : "📦 $15.000"}</span>
                              <span className="text-[8px] opacity-60">⇆</span>
                            </button>
                          </td>

                          <td className="p-4">
                            <input
                              type="number"
                              value={p.stock}
                              onChange={(e) => handleUpdateProductField(p.id, "stock", Number(e.target.value))}
                              className="w-20 bg-[#0a0a0c] border border-white/20 px-2.5 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-white"
                            />
                          </td>

                          <td className="p-4">
                            <button
                              onClick={() => handleUpdateProductField(p.id, "is_active", !p.is_active)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                                p.is_active
                                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                                  : "bg-neutral-900 border-white/10 text-neutral-500"
                              }`}
                            >
                              {p.is_active ? "Público" : "Oculto"}
                            </button>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Editar Precio Base */}
                              <button
                                onClick={() => handleQuickEditPrice(p)}
                                title="Editar precio base en COP"
                                className="bg-white/10 hover:bg-white text-white hover:text-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-white/20 transition-all cursor-pointer"
                              >
                                $ Precio
                              </button>

                              {/* Botón Aplicar / Cambiar Descuento */}
                              <button
                                onClick={() => handleQuickEditDiscount(p)}
                                title="Aplicar o modificar % de descuento"
                                className="bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 transition-all cursor-pointer"
                              >
                                % Desc
                              </button>

                              {/* Botón Quitar Descuento */}
                              {hasDiscount && (
                                <button
                                  onClick={() => handleQuickRemoveDiscount(p)}
                                  title="Quitar descuento y volver al precio original"
                                  className="bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-500/30 transition-all cursor-pointer"
                                >
                                  &times; Quitar
                                </button>
                              )}

                              {/* Botón Editar Todo (Modal Completo) */}
                              <button
                                onClick={() => openEditModal(p)}
                                title="Editar todos los detalles de este producto"
                                className="bg-white text-black hover:bg-neutral-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Editar
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                disabled={deletingId === p.id}
                                className="text-red-400 hover:text-red-300 p-1 text-xs cursor-pointer"
                                title="Eliminar producto permanentemente"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* MODAL: EDICIÓN COMPLETA DE PRODUCTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-[160] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-[#111115] border border-white/20 max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative text-left">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                  Editar Producto &bull; {editingProduct.name}
                </h3>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
                  ID: {editingProduct.id.slice(0, 8)} &bull; Actualiza precio, descuento, stock o detalles
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-neutral-400 hover:text-white text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Precio Base en COP (Sin descuento) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.basePrice}
                    onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                      Descuento % (0 para ninguno)
                    </label>
                    {parseFloat(editForm.discountPercent) > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, discountPercent: "0" })}
                        className="text-[9px] text-red-400 underline cursor-pointer"
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
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                {/* Cálculo en vivo de precio final */}
                <div className="md:col-span-2 p-3 bg-white/5 border border-white/10 flex justify-between items-center text-xs">
                  <span className="text-neutral-400 uppercase tracking-wider text-[10px]">
                    Precio Final que verá el cliente:
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      $ {Math.round(
                        (parseFloat(editForm.basePrice) || 0) *
                          (1 - (parseFloat(editForm.discountPercent) || 0) / 100)
                      ).toLocaleString("es-CO")}{" "}
                      COP
                    </span>
                    {parseFloat(editForm.discountPercent) > 0 && (
                      <span className="text-[10px] text-red-400 block line-through">
                        Antes: $ {parseFloat(editForm.basePrice || "0").toLocaleString("es-CO")} COP
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Categoría Principal *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                  {/* Chips rápidos */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Ropa", "Perfumes", "Zapatos", "Relojes", "Oro"].map((catOption) => (
                      <button
                        key={catOption}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, category: catOption })}
                        className={`text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          editForm.category.toLowerCase() === catOption.toLowerCase()
                            ? "bg-white text-black font-bold border-white"
                            : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {catOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Tipo / Subcategoría
                  </label>
                  <input
                    type="text"
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                    placeholder="Ej: Suéter, Gorras, Zapatos..."
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                  {/* Sugerencias contextuales */}
                  {SUGGESTED_SUBCATEGORIES[editForm.category] && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {SUGGESTED_SUBCATEGORIES[editForm.category].slice(0, 4).map((subOption) => (
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

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                {/* MODALIDAD DE VENTA EN MODAL DE EDICIÓN: UNIDAD O COMBO */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest text-neutral-300 font-bold block">
                      Modalidad / Presentación *
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {editForm.presentation === "combo" ? "🎁 COMBO / DÚO" : "📦 UNIDAD"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, presentation: "unidad" })}
                      className={`p-3 border rounded-lg text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        editForm.presentation === "unidad"
                          ? "bg-white/10 border-white text-white ring-1 ring-white/50"
                          : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                      }`}
                    >
                      <span className="text-base">📦</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider block text-white truncate">
                          Unidad Individual
                        </span>
                        <span className="text-[9.5px] text-neutral-400 block truncate">1 artículo estándar</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, presentation: "combo" })}
                      className={`p-3 border rounded-lg text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        editForm.presentation === "combo"
                          ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 ring-1 ring-amber-400/50 shadow-md"
                          : "bg-[#0a0a0c] border-white/10 text-neutral-400 hover:border-white/30"
                      }`}
                    >
                      <span className="text-base">🎁</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider block text-amber-300 truncate">
                          Combo / Dúo / Kit
                        </span>
                        <span className="text-[9.5px] text-amber-200/70 block truncate">2 o más productos</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Insignia / Etiqueta Destacada
                  </label>
                  <input
                    type="text"
                    value={editForm.badge}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    placeholder="Ej: Edición Limitada, Exclusivo, Top Ventas"
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* PROMO ENVÍO GRATIS EN MODAL DE EDICIÓN */}
                <div className="md:col-span-2 p-3 bg-amber-500/5 border border-amber-400/20 rounded-sm">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.isFreeShipping}
                      onChange={(e) => setEditForm({ ...editForm, isFreeShipping: e.target.checked })}
                      className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                        🎁 Promoción: Envío Gratis para este producto
                      </span>
                      <span className="text-[10px] text-neutral-400 font-light block mt-0.5">
                        El comprador verá costo de envío $0 COP y la etiqueta de Envío Gratis.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Tallas (Separadas por comas)
                  </label>
                  <input
                    type="text"
                    value={editForm.sizes}
                    onChange={(e) => setEditForm({ ...editForm, sizes: e.target.value })}
                    placeholder="S, M, L, XL"
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Colores (Separados por comas)
                  </label>
                  <input
                    type="text"
                    value={editForm.colors}
                    onChange={(e) => setEditForm({ ...editForm, colors: e.target.value })}
                    placeholder="Negro, Blanco, Oro"
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* FOTOS DEL PRODUCTO EN MODAL CON SELECTOR DE GALERÍA */}
                <div className="space-y-1.5 md:col-span-2">
                  <ImageGalleryUploader
                    value={editForm.images}
                    onChange={(newUrls) => setEditForm({ ...editForm, images: newUrls })}
                    label="Fotos del Producto"
                    helperText="Agrega nuevas fotos desde tu galería, reordénalas o elimina las que no quieras"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_active_check"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                  <label htmlFor="is_active_check" className="text-xs uppercase tracking-wider text-neutral-300 cursor-pointer">
                    Producto visible en la tienda pública (Activo)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {savingEdit ? "Guardando Cambios..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODO DIOS DEL PEDIDO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-[#111115] border border-white/20 max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative text-left">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl font-mono font-bold text-white">
                    {selectedOrder.reference || `NRK-${selectedOrder.id.slice(0, 8)}`}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isPaidOrPrep(selectedOrder.status)
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : isShipped(selectedOrder.status)
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : isDelivered(selectedOrder.status)
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest">
                  Registrado el {new Date(selectedOrder.created_at).toLocaleString("es-CO")}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-white text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 block border-b border-white/10 pb-1.5">
                Datos del Comprador & Entrega
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Nombre:</span>
                  <span className="font-bold text-white text-sm uppercase">{selectedOrder.customer_name}</span>
                </div>

                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Documento / Cédula:</span>
                  <span className="font-mono text-white">{selectedOrder.customer_document || "No registrado"}</span>
                </div>

                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Teléfono / WhatsApp:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-white">{selectedOrder.customer_phone}</span>
                    <button
                      onClick={() => sendWhatsAppDirect(selectedOrder.customer_phone, `Hola ${selectedOrder.customer_name}, te saludamos de NERKLEY con respecto a tu orden ${selectedOrder.reference}.`)}
                      className="bg-emerald-500 text-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-400 cursor-pointer"
                    >
                      Abrir Chat
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 text-[10px] uppercase block">Correo Electrónico:</span>
                  <span className="text-neutral-200">{selectedOrder.customer_email || "No registrado"}</span>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-2">
                  <div>
                    <span className="text-neutral-400 text-[10px] uppercase block">Dirección de Destino:</span>
                    <span className="font-bold text-white text-sm">
                      📍 {selectedOrder.city} &bull; {selectedOrder.address}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${selectedOrder.customer_name} - ${selectedOrder.city} - ${selectedOrder.address} - Tel: ${selectedOrder.customer_phone}`);
                      showToast("¡Dirección copiada para transportadora!");
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-semibold px-3 py-1.5 border border-white/20 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Copiar Dirección
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 block border-b border-white/10 pb-1.5">
                Contenido del Pedido
              </span>

              <div className="flex items-start gap-3">
                <div className="w-14 h-16 bg-black border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {getProductImageByName(selectedOrder.product_name) ? (
                    <img
                      src={getProductImageByName(selectedOrder.product_name)!}
                      alt="Producto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px] text-neutral-600">NERKLEY</span>
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-white text-sm font-semibold">{selectedOrder.product_name}</p>
                  {selectedOrder.notes && (
                    <p className="text-[11px] text-neutral-400 italic bg-black/40 p-2 border border-white/5 font-mono">
                      {selectedOrder.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
                <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">Total Pagado:</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  $ {Number(selectedOrder.total_price).toLocaleString("es-CO")} COP
                </span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 block border-b border-white/10 pb-1.5">
                Logística de Despacho & Guía
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Transportadora
                  </label>
                  <select
                    value={selectedOrder.transport_company || "Interrapidísimo"}
                    onChange={(e) => handleUpdateOrderField(selectedOrder.id, "transport_company", e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-white/20 p-2.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    {TRANSPORT_COMPANIES.map((tc) => (
                      <option key={tc} value={tc} className="bg-[#111115] text-white">
                        {tc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block">
                    Número de Guía de Envío
                  </label>
                  <input
                    type="text"
                    value={selectedOrder.shipping_guide || ""}
                    onChange={(e) => handleUpdateOrderField(selectedOrder.id, "shipping_guide", e.target.value)}
                    placeholder="Ej: 2400981726"
                    className="w-full bg-[#0a0a0c] border border-white/20 p-2.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-white placeholder-neutral-600"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => notifyTrackingByWhatsApp(selectedOrder)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Enviar Guía por WhatsApp al Cliente</span>
                  <span>&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => printShippingLabel(selectedOrder)}
                  className="bg-white/10 hover:bg-white text-white hover:text-black py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border border-white/20"
                >
                  Imprimir Rótulo
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                Actualizar Estado de la Orden:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleOrderStatusChange(selectedOrder.id, "Pagado / En Preparación")}
                  className={`py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    isPaidOrPrep(selectedOrder.status)
                      ? "bg-emerald-500 text-black border-emerald-500 font-extrabold"
                      : "bg-[#0a0a0c] text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/30"
                  }`}
                >
                  🟢 Pagado
                </button>
                <button
                  onClick={() => handleOrderStatusChange(selectedOrder.id, "En Despacho / Enviado")}
                  className={`py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    isShipped(selectedOrder.status)
                      ? "bg-sky-500 text-black border-sky-500 font-extrabold"
                      : "bg-[#0a0a0c] text-sky-400 border-sky-500/30 hover:bg-sky-950/30"
                  }`}
                >
                  🚚 Enviado
                </button>
                <button
                  onClick={() => handleOrderStatusChange(selectedOrder.id, "Entregado")}
                  className={`py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    isDelivered(selectedOrder.status)
                      ? "bg-purple-500 text-black border-purple-500 font-extrabold"
                      : "bg-[#0a0a0c] text-purple-400 border-purple-500/30 hover:bg-purple-950/30"
                  }`}
                >
                  ✅ Entregado
                </button>
                <button
                  onClick={() => handleOrderStatusChange(selectedOrder.id, "Cancelado")}
                  className={`py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                    isCanceled(selectedOrder.status)
                      ? "bg-red-500 text-black border-red-500 font-extrabold"
                      : "bg-[#0a0a0c] text-red-400 border-red-500/30 hover:bg-red-950/30"
                  }`}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                ID Supabase: {selectedOrder.id.slice(0, 16)}...
              </span>
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.reference || selectedOrder.id)}
                className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold tracking-widest underline cursor-pointer"
              >
                Eliminar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
