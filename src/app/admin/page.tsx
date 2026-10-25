"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
}

interface Product {
  id: string;
  created_at: string;
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
  is_active: boolean;
}

const STATUS_OPTIONS = [
  "Pendiente de Pago",
  "Pagado / En Preparación",
  "En Despacho / Enviado",
  "Entregado",
  "Cancelado"
];

// CONTRASEÑA SECRETA PARA ENTRAR AL ADMIN
const ADMIN_PASSWORD = "NERKLEY2027-Kleyner.";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [activeTab, setActiveTab] = useState<"dashboard" | "pedidos" | "publicar" | "clientes">("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario de producto
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [category, setCategory] = useState("Perfume");
  const [images, setImages] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [stock, setStock] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("NERKLEY_admin_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

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

  async function fetchData() {
    setLoading(true);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersData) setOrders(ordersData);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsData) setProducts(productsData);

    setLoading(false);
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 p-8 shadow-2xl text-center space-y-6">
          <div>
            <span className="text-3xl font-serif font-bold tracking-[0.3em] uppercase block mb-1">NERKLEY</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">Acceso Restringido - Administrador</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Ingresa tu contraseña secreta"
              className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-xs text-white focus:outline-none focus:border-white tracking-widest text-center"
            />
            <button
              type="submit"
              className="w-full bg-white text-black py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-md cursor-pointer"
            >
              Ingresar al Panel
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-800">
            <Link href="/" className="text-[10px] text-neutral-500 uppercase tracking-widest hover:text-white transition-colors">
              &larr; Volver a la Tienda Pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- CÁLCULOS DEL DASHBOARD FINANCIERO ----
  const totalIngresos = orders
    .filter((o) => o.status === "Pagado / En Preparación" || o.status === "En Despacho / Enviado" || o.status === "Entregado")
    .reduce((acc, o) => acc + Number(o.total_price), 0);

  const totalPendiente = orders
    .filter((o) => o.status === "Pendiente de Pago")
    .reduce((acc, o) => acc + Number(o.total_price), 0);

  const totalVentasCompletadas = orders.filter((o) => o.status === "Entregado").length;
  const totalEnProceso = orders.filter((o) => o.status === "Pagado / En Preparación" || o.status === "En Despacho / Enviado").length;

  // ---- CÁLCULOS DEL CRM (CLIENTES) ----
  const customers = Object.values(
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
          lastOrderDate: order.created_at,
        };
      }

      if (order.status !== "Cancelado") {
        acc[key].totalSpent += Number(order.total_price);
        acc[key].orderCount += 1;
      }

      if (new Date(order.created_at) > new Date(acc[key].lastOrderDate)) {
        acc[key].lastOrderDate = order.created_at;
      }

      return acc;
    }, {})
  ).sort((a: any, b: any) => b.totalSpent - a.totalSpent);

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      alert("Error al actualizar el estado del pedido: " + error.message);
      fetchData(); 
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const initialPrice = parseFloat(basePrice);
    const discount = discountPercent ? parseFloat(discountPercent) : 0;
    const initialStock = parseInt(stock) || 0;

    const finalSalePrice = discount > 0 ? Math.round(initialPrice * (1 - discount / 100)) : initialPrice;
    const storedOriginalPrice = discount > 0 ? initialPrice : null;
    const generatedSlug = slug || name.toLowerCase().trim().replace(/ /g, "-").replace(/[^\w-]+/g, "");
    const formattedCategory = category.trim().charAt(0).toUpperCase() + category.trim().slice(1).toLowerCase();

    const { error } = await supabase.from("products").insert([
      {
        name: name.trim(),
        slug: generatedSlug,
        description: description.trim(),
        sale_price: finalSalePrice,
        original_price: storedOriginalPrice,
        discount_percent: discount,
        category: formattedCategory,
        images: images.trim(),
        sizes: sizes.trim(),
        colors: colors.trim(),
        stock: initialStock,
        is_active: true,
      },
    ]);

    if (error) {
      alert("Error al crear producto: " + error.message);
    } else {
      alert("¡Producto publicado con éxito en NERKLEY!");
      setName("");
      setSlug("");
      setDescription("");
      setBasePrice("");
      setDiscountPercent("");
      setImages("");
      setSizes("");
      setColors("");
      setStock("");
      fetchData();
    }
    setCreating(false);
  };

  const handleUpdateProductField = async (id: string, field: keyof Product, value: any) => {
    setProducts((prev) => prev.map((prod) => (prod.id === id ? { ...prod, [field]: value } : prod)));
    const { error } = await supabase.from("products").update({ [field]: value }).eq("id", id);
    if (error) {
      alert(`Error al actualizar: ${error.message}`);
      fetchData();
    }
  };

  const handleEditPrice = async (p: Product) => {
    const currentBase = p.original_price || p.sale_price;
    const newPriceStr = window.prompt(`Ingresa el nuevo precio base para "${p.name}" (COP):`, String(currentBase));
    if (newPriceStr === null) return;

    const newBasePrice = parseFloat(newPriceStr);
    if (isNaN(newBasePrice) || newBasePrice <= 0) {
      alert("Por favor ingresa un precio válido.");
      return;
    }

    const discount = p.discount_percent || 0;
    const newSalePrice = discount > 0 ? Math.round(newBasePrice * (1 - discount / 100)) : newBasePrice;
    const newOriginalPrice = discount > 0 ? newBasePrice : null;

    const { error } = await supabase
      .from("products")
      .update({ sale_price: newSalePrice, original_price: newOriginalPrice })
      .eq("id", p.id);

    if (!error) fetchData();
  };

  const handleSetDiscount = async (p: Product) => {
    const base = p.original_price || p.sale_price;
    const newDiscountStr = window.prompt(
      `Ingresa el % de descuento a restar al precio base ($ ${base.toLocaleString()} COP) de "${p.name}":`,
      p.discount_percent ? String(p.discount_percent) : "20"
    );
    if (newDiscountStr === null) return;

    const newDiscount = parseFloat(newDiscountStr);
    if (isNaN(newDiscount) || newDiscount <= 0) return;

    const newSalePrice = Math.round(base * (1 - newDiscount / 100));

    const { error } = await supabase
      .from("products")
      .update({ sale_price: newSalePrice, original_price: base, discount_percent: newDiscount })
      .eq("id", p.id);

    if (!error) fetchData();
  };

  const handleRemoveDiscount = async (p: Product) => {
    const restoredPrice = p.original_price || p.sale_price;
    const { error } = await supabase
      .from("products")
      .update({ sale_price: restoredPrice, original_price: null, discount_percent: 0 })
      .eq("id", p.id);
    if (!error) fetchData();
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!window.confirm(`¿Deseas eliminar "${productName}" permanentemente?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) fetchData();
    setDeletingId(null);
  };

  // Función auxiliar para buscar la foto de un producto según el nombre del pedido
  const getProductImageByName = (productName: string) => {
    const found = products.find((p) => productName.toLowerCase().includes(p.name.toLowerCase()));
    if (found && found.images) {
      return found.images.split(",")[0].trim();
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 p-6 flex flex-col justify-between">
        <div>
          <Link href="/" className="block mb-8">
            <span className="text-2xl font-serif font-bold tracking-[0.3em] uppercase text-white">NERKLEY</span>
            <span className="text-[9px] block uppercase tracking-[0.3em] text-neutral-500 mt-1">Panel Admin</span>
          </Link>

          <nav className="space-y-3 text-xs uppercase tracking-[0.2em] font-medium">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              Métricas & Resumen
            </button>
            <button
              onClick={() => setActiveTab("pedidos")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer ${
                activeTab === "pedidos"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              Pedidos Recibidos ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("clientes")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer ${
                activeTab === "clientes"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              Base de Clientes ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab("publicar")}
              className={`w-full text-left px-4 py-3 transition-all cursor-pointer ${
                activeTab === "publicar"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              Catálogo e Inventario
            </button>
          </nav>
        </div>

        <div className="pt-8 border-t border-neutral-800 space-y-3">
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
            Cerrar Sesión Admin
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 space-y-8">
        <header className="border-b border-neutral-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif uppercase tracking-wider font-medium">
              {activeTab === "dashboard" && "Dashboard Financiero"}
              {activeTab === "pedidos" && "Gestión de Pedidos"}
              {activeTab === "clientes" && "Directorio de Clientes CRM"}
              {activeTab === "publicar" && "Catálogo & Publicación"}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Sincronizado en tiempo real con Supabase</p>
          </div>
          <button
            onClick={fetchData}
            className="bg-neutral-900 border border-neutral-800 hover:border-white px-4 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            Actualizar Datos
          </button>
        </header>

        {/* TAB: DASHBOARD FINANCIERO */}
        {activeTab === "dashboard" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between h-32">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">Ingresos Totales (Confirmados)</h3>
                <p className="text-2xl font-bold text-white">$ {totalIngresos.toLocaleString()} COP</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between h-32">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">Pagos Pendientes</h3>
                <p className="text-2xl font-bold text-yellow-500">$ {totalPendiente.toLocaleString()} COP</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between h-32">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">Pedidos en Proceso</h3>
                <p className="text-2xl font-bold text-white">{totalEnProceso} Órdenes</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between h-32">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-medium">Entregas Completadas</h3>
                <p className="text-2xl font-bold text-emerald-400">{totalVentasCompletadas} Órdenes</p>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 max-w-2xl mt-8">
              <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400 mb-4 border-b border-neutral-800 pb-3">
                Resumen de Inventario General
              </h3>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-300">Total Referencias Publicadas:</span>
                <span className="font-bold text-white">{products.length} Productos</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-neutral-800/50">
                <span className="text-sm text-neutral-300">Referencias con Stock Crítico (≤ 3):</span>
                <span className="font-bold text-red-400">{products.filter(p => p.stock <= 3).length} Productos</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-neutral-800/50">
                <span className="text-sm text-neutral-300">Productos Ocultos en Tienda:</span>
                <span className="font-bold text-neutral-500">{products.filter(p => !p.is_active).length} Productos</span>
              </div>
            </div>
          </section>
        )}

        {/* TAB: PEDIDOS */}
        {activeTab === "pedidos" && (
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400">
              Órdenes Registradas ({orders.length})
            </h2>

            {loading ? (
              <div className="text-xs text-neutral-500 uppercase tracking-[0.3em] py-12 text-center animate-pulse">
                Cargando pedidos...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-xs text-neutral-500 uppercase tracking-widest py-12 text-center border border-dashed border-neutral-800 bg-neutral-900/30">
                Aún no hay pedidos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 uppercase text-neutral-400 border-b border-neutral-800 tracking-wider">
                    <tr>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Producto & Foto</th>
                      <th className="p-4">Dirección</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado del Pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {orders.map((o) => {
                      const imgUrl = getProductImageByName(o.product_name);
                      return (
                        <tr key={o.id} className="hover:bg-neutral-900/60 transition-colors">
                          <td className="p-4 text-neutral-400">{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className="font-semibold text-white block">{o.customer_name}</span>
                            <span className="text-neutral-300 text-[11px] block mt-1">{o.customer_phone}</span>
                            <span className="text-neutral-500 text-[10px] block">{o.customer_email || "Sin correo"}</span>
                            <span className="text-neutral-500 text-[10px] block">{o.customer_document}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-14 bg-neutral-950 border border-neutral-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="Producto" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-neutral-600">N/A</span>
                                )}
                              </div>
                              <div>
                                <span className="text-white font-medium block">{o.product_name}</span>
                                <span className="text-neutral-400 text-[10px] block mt-1">
                                  {o.selected_size && `Talla: ${o.selected_size}`} {o.selected_color && `| Color: ${o.selected_color}`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-neutral-300">
                            <span className="block font-semibold">{o.city}</span>
                            <span className="block text-[10px] text-neutral-400 mt-1">{o.address}</span>
                          </td>
                          <td className="p-4 font-bold text-white">$ {Number(o.total_price).toLocaleString()} COP</td>
                          <td className="p-4">
                            <select
                              value={o.status}
                              onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                              className={`w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider border focus:outline-none transition-colors appearance-none cursor-pointer ${
                                o.status === "Pendiente de Pago" ? "bg-yellow-950/30 border-yellow-900/50 text-yellow-500" :
                                o.status === "Pagado / En Preparación" ? "bg-blue-950/30 border-blue-900/50 text-blue-400" :
                                o.status === "En Despacho / Enviado" ? "bg-amber-950/30 border-amber-900/50 text-amber-500" :
                                o.status === "Entregado" ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" :
                                o.status === "Cancelado" ? "bg-red-950/30 border-red-900/50 text-red-500" :
                                "bg-neutral-900 border-neutral-700 text-white"
                              }`}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st} className="bg-neutral-900 text-white">{st}</option>
                              ))}
                            </select>
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

        {/* TAB: CLIENTES (CRM) */}
        {activeTab === "clientes" && (
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400">
              Listado de Clientes (Ranking de Compras)
            </h2>

            {loading ? (
              <div className="text-xs text-neutral-500 uppercase tracking-[0.3em] py-12 text-center animate-pulse">
                Analizando base de clientes...
              </div>
            ) : customers.length === 0 ? (
              <div className="text-xs text-neutral-500 uppercase tracking-widest py-12 text-center border border-dashed border-neutral-800 bg-neutral-900/30">
                Aún no hay clientes registrados en la base de datos.
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 uppercase text-neutral-400 border-b border-neutral-800 tracking-wider">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Ubicación Frecuente</th>
                      <th className="p-4">Total Compras</th>
                      <th className="p-4">Inversión Total</th>
                      <th className="p-4">Última Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {customers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="p-4">
                          <span className="font-semibold text-white block uppercase">{c.name}</span>
                          <span className="text-neutral-500 text-[10px] block mt-1">{c.document}</span>
                        </td>
                        <td className="p-4 text-neutral-300">
                          <span className="block">{c.phone}</span>
                          <span className="text-neutral-500 text-[10px] block mt-1">{c.email || "Sin correo"}</span>
                        </td>
                        <td className="p-4 text-neutral-300">
                          <span className="block font-medium">{c.city}</span>
                          <span className="block text-[10px] text-neutral-400 mt-1">{c.address}</span>
                        </td>
                        <td className="p-4 font-bold text-white text-center">
                          <span className="bg-neutral-800 px-2 py-1 rounded">{c.orderCount}</span>
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
                          $ {c.totalSpent.toLocaleString()} COP
                        </td>
                        <td className="p-4 text-neutral-400 text-[10px]">
                          {new Date(c.lastOrderDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB: PUBLICAR (CATÁLOGO E INVENTARIO) */}
        {activeTab === "publicar" && (
          <div className="space-y-12">
            <section className="bg-neutral-900 border border-neutral-800 p-8 max-w-4xl">
              <h2 className="text-sm uppercase tracking-[0.25em] font-semibold mb-6 text-white border-b border-neutral-800 pb-3">
                Agregar Nuevo Producto al Catálogo
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Nombre del Producto *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Perfume Layton" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Stock Inicial *</label>
                    <input type="number" required min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Ej: 50" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Precio Base (COP) *</label>
                    <input type="number" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Ej: 140000" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Descuento % (Opcional)</label>
                    <input type="number" min="0" max="90" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="Ej: 25" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Categoría *</label>
                    <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Perfume" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Descripción Elegante del Producto</label>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Una fragancia cautivadora con notas de salida..." className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">URLs de Fotos (Separadas por comas)</label>
                    <input type="text" value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://foto1.jpg, https://foto2.jpg" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Tallas (Opcional)</label>
                    <input type="text" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Ej: 100ml, 50ml" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2 font-medium">Colores / Ediciones (Opcional)</label>
                    <input type="text" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Ej: Edición Oro, Clásico" className="w-full bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors" />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                  <button type="submit" disabled={creating} className="bg-white text-black px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-md disabled:opacity-50 cursor-pointer">
                    {creating ? "Publicando..." : "Publicar Producto en Tienda"}
                  </button>
                </div>
              </form>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400">
                Inventario & Productos Publicados ({products.length})
              </h2>

              {products.length === 0 ? (
                <div className="text-xs text-neutral-500 uppercase tracking-widest py-8 text-center border border-dashed border-neutral-800">
                  No hay productos registrados en el inventario.
                </div>
              ) : (
                <div className="overflow-x-auto border border-neutral-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900 uppercase text-neutral-400 border-b border-neutral-800 tracking-wider">
                      <tr>
                        <th className="p-4">Foto & Producto</th>
                        <th className="p-4">Precio (COP)</th>
                        <th className="p-4 w-32">Stock</th>
                        <th className="p-4 w-36">Estado (Tienda)</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {products.map((p) => {
                        const firstImg = p.images ? p.images.split(",")[0].trim() : null;
                        return (
                          <tr key={p.id} className={`hover:bg-neutral-900/60 transition-colors ${!p.is_active && 'opacity-60'}`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-14 bg-neutral-950 border border-neutral-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                  {firstImg ? (
                                    <img src={firstImg} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[8px] text-neutral-600">Sin foto</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-semibold text-white block">{p.name}</span>
                                  <span className="text-neutral-500 text-[10px] uppercase mt-1 block">{p.category}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div>
                                  {p.original_price && <span className="line-through text-neutral-500 text-[10px] block">$ {Number(p.original_price).toLocaleString()}</span>}
                                  <span className="font-bold text-white">$ {Number(p.sale_price).toLocaleString()}</span>
                                </div>
                                <button onClick={() => handleEditPrice(p)} className="text-[10px] text-neutral-400 hover:text-white border border-neutral-700 px-2 py-1 ml-2 cursor-pointer">Editar $</button>
                              </div>
                              <div className="mt-2">
                                {p.discount_percent && p.discount_percent > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-1 text-[9px] uppercase font-bold">-{p.discount_percent}% OFF</span>
                                    <button onClick={() => handleRemoveDiscount(p)} className="text-[10px] text-neutral-400 underline hover:text-white cursor-pointer">Quitar</button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleSetDiscount(p)} className="text-[10px] text-neutral-400 underline hover:text-white cursor-pointer">+ Aplicar %</button>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <input
                                type="number"
                                value={p.stock}
                                onChange={(e) => handleUpdateProductField(p.id, "stock", Number(e.target.value))}
                                className={`w-full bg-neutral-950 border px-3 py-2 text-white focus:outline-none transition-colors ${
                                  p.stock <= 3 ? "border-red-500/50 text-red-400" : "border-neutral-700 focus:border-white"
                                }`}
                              />
                              {p.stock <= 3 && <span className="text-red-500 text-[9px] uppercase font-bold block mt-1">Stock Bajo</span>}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleUpdateProductField(p.id, "is_active", !p.is_active)}
                                className={`w-full border px-3 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors cursor-pointer ${
                                  p.is_active
                                    ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50"
                                    : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                                }`}
                              >
                                {p.is_active ? "Público" : "Oculto"}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                disabled={deletingId === p.id}
                                className="bg-red-900/20 hover:bg-red-900/80 border border-red-900/50 text-red-400 hover:text-white px-3 py-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {deletingId === p.id ? "Eliminando..." : "Eliminar"}
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
          </div>
        )}
      </main>
    </div>
  );
}