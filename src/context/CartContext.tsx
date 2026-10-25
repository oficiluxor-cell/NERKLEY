"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string | null;
  size?: string;
  color?: string;
  quantity: number;
  maxStock: number;
}

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
  status: string;
  shipping_guide?: string;
  transport_company?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isOrdersOpen: boolean;
  setIsOrdersOpen: (isOpen: boolean) => void;
  customerOrders: Order[];
  fetchCustomerOrders: (emailOrDoc: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    documentId: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    reference: string;
    total: number;
    customerName: string;
    email: string;
    phone: string;
    documentId: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedCart = localStorage.getItem("NERKLEY_cart");
        if (storedCart) setCartItems(JSON.parse(storedCart));

        // Cargar pedidos guardados previamente en este navegador
        const savedEmail = localStorage.getItem("NERKLEY_client_email");
        if (savedEmail) {
          fetchCustomerOrders(savedEmail);
        }
      } catch (e) {
        console.error("Error leyendo localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("NERKLEY_cart", JSON.stringify(cartItems));
      } catch (e) {}
    }
  }, [cartItems]);

  const fetchCustomerOrders = async (identifier: string) => {
    if (!identifier) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .or(`customer_email.eq.${identifier},customer_document.eq.${identifier},customer_phone.eq.${identifier}`)
      .order("created_at", { ascending: false });

    if (data && !error) {
      setCustomerOrders(data);
    }
  };

  const addToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const newQty = currentQty + newItem.quantity;

        if (newQty > newItem.maxStock) {
          alert(`Lo sentimos, solo hay ${newItem.maxStock} unidades disponibles en stock.`);
          return prev;
        }

        updated[existingIndex].quantity = newQty;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty > item.maxStock) {
            alert(`Stock máximo alcanzado (${item.maxStock} disponibles).`);
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!formData.fullName || !formData.email || !formData.phone || !formData.documentId || !formData.city || !formData.address) {
      alert("Por favor completa todos los campos obligatorios de envío.");
      return;
    }

    setSubmitting(true);

    const uniqueRef = `NRK-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderSummary = cartItems.map(item => 
      `${item.quantity}x ${item.name} ${item.size ? `[Talla: ${item.size}]` : ''} ${item.color ? `[Color: ${item.color}]` : ''}`
    ).join(", ");

    const pendingOrderData = {
      product_name: `[Ref: ${uniqueRef}] ${orderSummary.length > 200 ? orderSummary.substring(0, 197) + "..." : orderSummary}`,
      total_price: cartTotal,
      customer_name: formData.fullName,
      customer_document: formData.documentId,
      customer_email: formData.email,
      customer_phone: formData.phone,
      country: "Colombia",
      city: formData.city,
      address: formData.address,
      notes: `Ref Pago: ${uniqueRef}\n${formData.notes}`,
      status: "Pendiente de Pago",
    };

    try {
      await supabase.from("orders").insert([pendingOrderData]);
      // Guardar identificador localmente para consultar sus pedidos luego
      localStorage.setItem("NERKLEY_client_email", formData.email);
      fetchCustomerOrders(formData.email);
    } catch (err) {
      console.error("Error guardando orden en Supabase:", err);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("NERKLEY_pending_order", JSON.stringify(pendingOrderData));
      } catch (e) {}
    }
    
    setPendingPaymentInfo({
      reference: uniqueRef,
      total: cartTotal,
      customerName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      documentId: formData.documentId,
    });

    setSubmitting(false);
  };

  return (
    <CartContext.Provider
      value={{ 
        cartItems, addToCart, removeFromCart, updateQuantity, 
        cartCount, cartTotal, isCartOpen, setIsCartOpen, 
        isOrdersOpen, setIsOrdersOpen, customerOrders, fetchCustomerOrders 
      }}
    >
      {children}

      {/* MODAL / CAJÓN DE "MIS PEDIDOS" */}
      {isOrdersOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={() => setIsOrdersOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white text-neutral-900 z-[101] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${
          isOrdersOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-serif uppercase tracking-widest font-bold text-black">Mis Pedidos & Compras</h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Historial y garantía verificada</p>
          </div>
          <button onClick={() => setIsOrdersOpen(false)} className="text-neutral-500 hover:text-black text-2xl leading-none cursor-pointer">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formulario rápido para consultar por cédula o correo si no hay cargados */}
          <div className="bg-[#fafafa] p-4 border border-neutral-200 space-y-3">
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-700 block">¿No ves tus pedidos recientes?</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                id="searchOrderInput" 
                placeholder="Ingresa tu cédula o correo" 
                className="flex-1 bg-white border border-neutral-300 px-3 py-2 text-xs uppercase"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById("searchOrderInput") as HTMLInputElement)?.value;
                  if (val) fetchCustomerOrders(val);
                }}
                className="bg-black text-white px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-neutral-800 cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {customerOrders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-2xl">📦</span>
                <p className="text-xs uppercase tracking-widest text-neutral-500">No hay pedidos registrados en este dispositivo</p>
                <p className="text-[10px] text-neutral-400">Realiza una compra o ingresa tu cédula arriba para consultar.</p>
              </div>
            ) : (
              customerOrders.map((ord) => (
                <div key={ord.id} className="bg-white border border-neutral-200 p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <span className="text-[10px] font-mono text-neutral-400">{new Date(ord.created_at).toLocaleDateString()}</span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                      ord.status === "Pagado" || ord.status === "Entregado" ? "bg-emerald-100 text-emerald-800" :
                      ord.status === "Pendiente de Pago" ? "bg-amber-100 text-amber-800" :
                      "bg-neutral-100 text-neutral-800"
                    }`}>
                      {ord.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-black">{ord.customer_name}</h4>
                    <p className="text-[11px] text-neutral-700 font-medium mt-1 bg-neutral-50 p-2 border border-neutral-100">{ord.product_name}</p>
                  </div>

                  <div className="bg-neutral-50 p-2.5 border border-neutral-100 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500 uppercase text-[9px]">Ciudad / Dirección:</span>
                      <span className="font-semibold">{ord.city} - {ord.address}</span>
                    </div>
                    {ord.shipping_guide ? (
                      <div className="flex justify-between pt-1 border-t border-neutral-200">
                        <span className="text-neutral-500 uppercase text-[9px]">Guía de Envío:</span>
                        <span className="font-mono font-bold text-emerald-600">{ord.transport_company || "Envío"}: {ord.shipping_guide}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between pt-1 border-t border-neutral-200 text-neutral-400 italic text-[10px]">
                        <span>Guía de despacho:</span>
                        <span>En preparación de bodega</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">Total:</span>
                    <span className="text-sm font-bold text-black">$ {Number(ord.total_price).toLocaleString()} COP</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-neutral-900 text-white p-4 text-[10px] space-y-2 uppercase tracking-wider">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🛡️</span> Compra 100% Garantizada & Segura
            </p>
            <p className="text-neutral-400 font-light leading-relaxed">
              Todos nuestros envíos en Colombia están respaldados con guía de rastreo oficial y soporte directo en caso de novedades.
            </p>
          </div>
        </div>
      </div>

      {/* CARRITO Y CHECKOUT LATERAL (EXISTENTE) */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={() => {
            if (!pendingPaymentInfo) setIsCartOpen(false);
          }}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white text-neutral-900 z-[101] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-serif uppercase tracking-widest font-bold text-black">
            {pendingPaymentInfo ? "Pasarela de Pago Wompi" : `Tu Carrito (${cartCount})`}
          </h2>
          {!pendingPaymentInfo && (
            <button onClick={() => setIsCartOpen(false)} className="text-neutral-500 hover:text-black text-2xl leading-none cursor-pointer">
              &times;
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {pendingPaymentInfo ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-neutral-950 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-lg">
                $
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-semibold block mb-1">Orden Registrada en NERKLEY</span>
                <h3 className="text-xl font-serif uppercase tracking-wider font-bold text-black">¡Hola, {pendingPaymentInfo.customerName}!</h3>
              </div>

              <div className="bg-[#fafafa] border border-neutral-200 p-6 space-y-4 text-left shadow-sm">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                  <span className="text-xs uppercase tracking-wider text-neutral-600 font-medium">Referencia:</span>
                  <span className="text-sm font-mono font-bold bg-black text-white px-3 py-1 tracking-widest">{pendingPaymentInfo.reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-neutral-600 font-medium">Total a Pagar:</span>
                  <span className="text-lg font-bold text-black">$ {pendingPaymentInfo.total.toLocaleString()} COP</span>
                </div>
              </div>

              <form action="https://checkout.wompi.co/p/" method="GET" className="w-full">
                <input type="hidden" name="public-key" value="pub_prod_Y4gYBwGlAk98UoZRPbtpCIESjkMsMVG" />
                <input type="hidden" name="currency" value="COP" />
                <input type="hidden" name="amount-in-cents" value={pendingPaymentInfo.total * 100} />
                <input type="hidden" name="reference" value={pendingPaymentInfo.reference} />
                
                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all text-center shadow-md cursor-pointer"
                >
                  Pagar $ {pendingPaymentInfo.total.toLocaleString()} COP en Wompi &rarr;
                </button>
              </form>

              <button
                onClick={() => {
                  setPendingPaymentInfo(null);
                  setIsCartOpen(false);
                }}
                className="text-[10px] text-neutral-500 uppercase tracking-widest underline hover:text-black block mx-auto pt-2 cursor-pointer"
              >
                Modificar datos o carrito
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">Tu carrito está vacío</p>
              <button onClick={() => setIsCartOpen(false)} className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-md cursor-pointer">
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-[#fafafa] p-3 border border-neutral-200 relative group">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2 right-2 text-neutral-400 hover:text-red-600 text-lg font-bold leading-none cursor-pointer"
                      title="Eliminar producto"
                    >&times;</button>
                    
                    <div className="w-20 h-24 bg-white flex-shrink-0 border border-neutral-200 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-serif">NERKLEY</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-between py-1 pr-6 w-full">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-black line-clamp-1">{item.name}</h4>
                        <div className="flex gap-2 mt-1 text-[10px] text-neutral-600 uppercase font-medium">
                          {item.size && <span>Talla: {item.size}</span>}
                          {item.size && item.color && <span>|</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-neutral-300 bg-white">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-2 py-0.5 text-xs text-neutral-800 hover:bg-neutral-100 font-bold cursor-pointer"
                            >-</button>
                            <span className="px-2.5 text-xs font-semibold text-black">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-2 py-0.5 text-xs text-neutral-800 hover:bg-neutral-100 font-bold cursor-pointer"
                            >+</button>
                          </div>
                          <span className="text-[9px] text-neutral-500">Stock: {item.maxStock}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-black mt-2">$ {(item.price * item.quantity).toLocaleString()} COP</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-semibold uppercase tracking-widest text-black">Total a Pagar</span>
                  <span className="text-xl font-bold text-black">$ {cartTotal.toLocaleString()} COP</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4 bg-[#fafafa] p-5 border border-neutral-200">
                  <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-900 border-b border-neutral-200 pb-2 mb-4">
                    Datos para Envío y Facturación (Wompi)
                  </h3>
                  
                  <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} placeholder="Nombre Completo *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" name="documentId" required value={formData.documentId} onChange={handleInputChange} placeholder="Cédula *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="Teléfono *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  </div>
                  
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="Correo Electrónico *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value="Colombia" disabled className="w-full bg-neutral-100 text-neutral-600 border border-neutral-300 px-4 py-2.5 text-xs cursor-not-allowed" />
                    <input type="text" name="city" required value={formData.city} onChange={handleInputChange} placeholder="Ciudad *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  </div>
                  
                  <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="Dirección Exacta (Casa, Apto) *" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  
                  <textarea name="notes" rows={2} value={formData.notes} onChange={handleInputChange} placeholder="Notas Adicionales (Opcional)" className="w-full bg-white text-black border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black placeholder-neutral-400" />
                  
                  <button type="submit" disabled={submitting} className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md disabled:opacity-50 mt-4 active:scale-98 flex items-center justify-center gap-2 cursor-pointer">
                    {submitting ? "Procesando..." : "Proceder al Pago con Wompi"}
                  </button>
                  <p className="text-[9px] text-center text-neutral-500 uppercase tracking-widest mt-2">Pagos Seguros Wompi &bull; Bancolombia</p>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}