"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ShippingWarrantyModal, { WarrantyTab } from "@/components/ShippingWarrantyModal";
import WompiCheckoutForm from "../components/WompiCheckoutForm";
import { STANDARD_SHIPPING_COST, getShippingQuote, COLOMBIA_REGIONS } from "@/lib/shipping";

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
  free_shipping?: boolean;
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
  reference?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  cartCount: number;
  itemsSubtotal: number;
  shippingCost: number;
  isCartFreeShipping: boolean;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isOrdersOpen: boolean;
  setIsOrdersOpen: (isOpen: boolean) => void;
  customerOrders: Order[];
  fetchCustomerOrders: (emailOrDoc: string) => void;
  handleCheckout: (e: React.FormEvent) => void;
  submitting: boolean;
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  createdOrderId: string | null;
  isWarrantyOpen: boolean;
  setIsWarrantyOpen: (isOpen: boolean) => void;
  warrantyTab: WarrantyTab;
  setWarrantyTab: (tab: WarrantyTab) => void;
  openWarrantyModal: (tab?: WarrantyTab) => void;
  isCartBouncing: boolean;
  addedNotification: { name: string; price: number; image: string | null } | null;
  setAddedNotification: (val: { name: string; price: number; image: string | null } | null) => void;
  shippingDestination: { department: string; city: string };
  setShippingDestination: (department: string, city: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [warrantyTab, setWarrantyTab] = useState<WarrantyTab>("shipping");
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [addedNotification, setAddedNotification] = useState<{ name: string; price: number; image: string | null } | null>(null);
  const bounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openWarrantyModal = (tab: WarrantyTab = "shipping") => {
    setWarrantyTab(tab);
    setIsWarrantyOpen(true);
  };

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const tab = e.detail?.tab || "shipping";
      openWarrantyModal(tab);
    };
    window.addEventListener("open-shipping-modal", handleOpenEvent);
    return () => window.removeEventListener("open-shipping-modal", handleOpenEvent);
  }, []);

  const [shippingDestination, setShippingDestinationState] = useState<{ department: string; city: string }>({
    department: "Antioquia",
    city: "Medellín",
  });

  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityText, setCustomCityText] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    documentId: "",
    email: "",
    phone: "",
    department: "Antioquia",
    city: "Medellín",
    address: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const setShippingDestination = (department: string, city: string) => {
    const cleanDept = department || "Antioquia";
    const cleanCity = typeof city === "string" ? city : "";
    setShippingDestinationState({ department: cleanDept, city: cleanCity });
    setFormData((prev) => ({
      ...prev,
      department: cleanDept,
      city: cleanCity,
    }));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "NERKLEY_shipping_destination",
          JSON.stringify({ department: cleanDept, city: cleanCity })
        );
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedCart = localStorage.getItem("NERKLEY_cart");
        if (storedCart) setCartItems(JSON.parse(storedCart));

        const storedDest = localStorage.getItem("NERKLEY_shipping_destination");
        if (storedDest) {
          const parsed = JSON.parse(storedDest);
          if (parsed.department && typeof parsed.city === "string") {
            setShippingDestinationState(parsed);
            setFormData((prev) => ({
              ...prev,
              department: parsed.department,
              city: parsed.city,
            }));
            const list = (COLOMBIA_REGIONS[parsed.department] || []).filter((c: string) => c !== "Otro Municipio / Corregimiento...");
            if (parsed.city && !list.includes(parsed.city)) {
              setIsCustomCity(true);
              setCustomCityText(parsed.city);
            }
          }
        }

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
    // Animación de pulso del icono del carrito
    setIsCartBouncing(true);
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    bounceTimeoutRef.current = setTimeout(() => {
      setIsCartBouncing(false);
    }, 1000);

    // Toast flotante de confirmación con imagen y precio
    setAddedNotification({
      name: newItem.name,
      price: newItem.price,
      image: newItem.image,
    });
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    notifTimeoutRef.current = setTimeout(() => {
      setAddedNotification(null);
    }, 3200);
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
  const itemsSubtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const isCartFreeShipping = cartItems.some((item) => item.free_shipping);
  const shippingQuote = getShippingQuote(formData.department, formData.city);
  const shippingCost = cartItems.length === 0 || isCartFreeShipping ? 0 : shippingQuote.rate;
  const cartTotal = itemsSubtotal + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // REGISTRA EL PEDIDO EN SUPABASE Y OBTIENE SU ID REAL PARA FIRMARLO
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

    const customerNotes = (formData.notes || "").trim();
    const shippingNote = isCartFreeShipping
      ? `Envío: GRATIS a ${formData.city}, ${formData.department} (Promoción activa)`
      : `Envío a ${formData.city}, ${formData.department}: $${shippingQuote.rate.toLocaleString()} COP (${shippingQuote.deliveryTime})`;

    const pendingOrderData = {
      reference: uniqueRef,
      product_name: `[Ref: ${uniqueRef}] ${orderSummary.length > 200 ? orderSummary.substring(0, 197) + "..." : orderSummary}`,
      total_price: cartTotal,
      customer_name: formData.fullName,
      customer_document: formData.documentId,
      customer_email: formData.email,
      customer_phone: formData.phone,
      country: "Colombia",
      city: `${formData.city}, ${formData.department}`,
      address: formData.address,
      notes: customerNotes
        ? `📝 INSTRUCCIÓN DE ENTREGA:\n${customerNotes}\n\n[Detalles: Ref ${uniqueRef} | ${shippingNote}]`
        : `[Ref Pago: ${uniqueRef} | ${shippingNote}]`,
      status: "pending",
    };

    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([pendingOrderData])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCreatedOrderId(data.id); localStorage.setItem("NERKLEY_pending_order", JSON.stringify({ ...pendingOrderData, id: data.id }));
      }

      localStorage.setItem("NERKLEY_client_email", formData.email);
      fetchCustomerOrders(formData.email);
    } catch (err: any) {
      console.error("Error detallado en Supabase:", err);
      alert("Error Supabase: " + (err.message || JSON.stringify(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CartContext.Provider
      value={{ 
        cartItems, addToCart, removeFromCart, updateQuantity, 
        cartCount, itemsSubtotal, shippingCost, isCartFreeShipping, cartTotal, isCartOpen, setIsCartOpen, 
        isOrdersOpen, setIsOrdersOpen, customerOrders, fetchCustomerOrders,
        isWarrantyOpen, setIsWarrantyOpen, warrantyTab, setWarrantyTab, openWarrantyModal,
        isCartBouncing, addedNotification, setAddedNotification,
        handleCheckout, submitting, formData, handleInputChange, createdOrderId,
        shippingDestination, setShippingDestination
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
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#111115] text-white z-[101] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${
          isOrdersOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-serif uppercase tracking-widest font-bold text-white">Mis Pedidos & Compras</h2>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">Historial y garantía verificada</p>
          </div>
          <button onClick={() => setIsOrdersOpen(false)} className="text-neutral-400 hover:text-white text-2xl leading-none cursor-pointer">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#0a0a0c] p-4 border border-white/10 space-y-3">
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-300 block">¿No ves tus pedidos recientes?</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                id="searchOrderInput" 
                placeholder="Ingresa tu cédula o correo" 
                className="flex-1 bg-[#111115] border border-white/15 px-3 py-2 text-xs uppercase"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById("searchOrderInput") as HTMLInputElement)?.value;
                  if (val) fetchCustomerOrders(val);
                }}
                className="bg-white text-black px-4 py-2 text-xs uppercase font-bold tracking-wider hover:bg-neutral-200 cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {customerOrders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-2xl">📦</span>
                <p className="text-xs uppercase tracking-widest text-neutral-400">No hay pedidos registrados en este dispositivo</p>
                <p className="text-[10px] text-neutral-400">Realiza una compra o ingresa tu cédula arriba para consultar.</p>
              </div>
            ) : (
              customerOrders.map((ord) => (
                <div key={ord.id} className="bg-[#111115] border border-white/10 p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono text-neutral-400">{new Date(ord.created_at).toLocaleDateString()}</span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                      ord.status === "Pagado" || ord.status === "Entregado" ? "bg-emerald-500/15 text-emerald-300" :
                      ord.status === "pending" ? "bg-amber-500/15 text-amber-300" :
                      "bg-white/10 text-neutral-200"
                    }`}>
                      {ord.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">{ord.customer_name}</h4>
                    <p className="text-[11px] text-neutral-300 font-medium mt-1 bg-white/5 p-2 border border-white/5">{ord.product_name}</p>
                  </div>

                  <div className="bg-white/5 p-2.5 border border-white/5 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 uppercase text-[9px]">Ciudad / Dirección:</span>
                      <span className="font-semibold">{ord.city} - {ord.address}</span>
                    </div>
                    {ord.shipping_guide ? (
                      <div className="flex justify-between pt-1 border-t border-white/10">
                        <span className="text-neutral-400 uppercase text-[9px]">Guía de Envío:</span>
                        <span className="font-mono font-bold text-emerald-400">{ord.transport_company || "Envío"}: {ord.shipping_guide}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between pt-1 border-t border-white/10 text-neutral-400 italic text-[10px]">
                        <span>Guía de despacho:</span>
                        <span>En preparación de bodega</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Total:</span>
                    <span className="text-sm font-bold text-white">$ {Number(ord.total_price).toLocaleString()} COP</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CARRITO Y CHECKOUT LATERAL */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-full sm:max-w-[480px] bg-[#111115] text-white z-[101] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col overflow-x-hidden ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg sm:text-xl font-serif uppercase tracking-widest font-bold text-white">
            Tu Carrito ({cartCount})
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white text-2xl leading-none p-1 cursor-pointer">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-5 sm:space-y-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs uppercase tracking-widest text-neutral-400 mb-6">Tu carrito está vacío</p>
              <button onClick={() => setIsCartOpen(false)} className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-md cursor-pointer">
                Explorar Catálogo
              </button>
            </div>
          ) : createdOrderId ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center mx-auto text-base font-serif font-bold shadow-sm">
                ✓
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-white">Pedido Registrado con Éxito</h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Tu orden fue generada. Continúa a la pasarela segura con el monto oficial blindado.
                </p>
              </div>

              <WompiCheckoutForm orderId={createdOrderId} />

              <button
                onClick={() => setCreatedOrderId(null)}
                className="text-[10px] text-neutral-400 uppercase tracking-widest underline hover:text-white cursor-pointer block mx-auto pt-2"
              >
                &larr; Modificar datos o carrito
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-[#0a0a0c] p-3 border border-white/10 relative group">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2 right-2 text-neutral-400 hover:text-red-400 text-lg font-bold leading-none cursor-pointer"
                      title="Eliminar producto"
                    >&times;</button>
                    
                    <div className="w-20 h-24 bg-[#111115] flex-shrink-0 border border-white/10 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-serif">NERKLEY</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-between py-1 pr-6 w-full">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white line-clamp-1">{item.name}</h4>
                        <div className="flex gap-2 mt-1 text-[10px] text-neutral-300 uppercase font-medium">
                          {item.size && <span>Talla: {item.size}</span>}
                          {item.size && item.color && <span>|</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-white/15 bg-[#111115]">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-2 py-0.5 text-xs text-neutral-200 hover:bg-white/10 font-bold cursor-pointer"
                            >-</button>
                            <span className="px-2.5 text-xs font-semibold text-white">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-2 py-0.5 text-xs text-neutral-200 hover:bg-white/10 font-bold cursor-pointer"
                            >+</button>
                          </div>
                          <span className="text-[9px] text-neutral-400">Stock: {item.maxStock}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white mt-2">$ {(item.price * item.quantity).toLocaleString()} COP</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-5 space-y-4">
                {/* INFORMACIÓN DE ENVÍO AUTOMÁTICO SEGÚN DESTINO */}
                <div className="bg-[#0a0a0c] p-3.5 border border-white/10 space-y-1.5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-300">
                      Envío a {formData.city || "Colombia"}:
                    </span>
                    {isCartFreeShipping ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded">
                        Envío Gratis Aplicado ✨
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-300 font-mono">
                        $ {shippingQuote.rate.toLocaleString()} COP
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    {isCartFreeShipping
                      ? `¡Promoción activa! Envío 100% gratuito asegurado a ${formData.city || "tu destino"}.`
                      : `Tarifa calculada automáticamente: entrega en ${shippingQuote.deliveryTime} (${shippingQuote.zoneLabel}).`}
                  </p>
                </div>

                {/* DESGLOSE MATEMÁTICO DEL CARRITO */}
                <div className="bg-[#0a0a0c] p-3.5 border border-white/10 space-y-2 text-xs rounded-lg">
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Subtotal Piezas ({cartCount}):</span>
                    <span className="text-white font-mono">$ {itemsSubtotal.toLocaleString()} COP</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Costo de Envío ({formData.city}):</span>
                    {isCartFreeShipping ? (
                      <span className="text-emerald-400 font-bold">
                        GRATIS <span className="text-[10px] line-through text-neutral-500 font-normal">($ {shippingQuote.rate.toLocaleString()})</span>
                      </span>
                    ) : (
                      <span className="text-white font-mono">+ $ {shippingCost.toLocaleString()} COP</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-white/15 flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Total a Pagar</span>
                    <span className="text-xl font-bold text-white tracking-tight font-mono">$ {cartTotal.toLocaleString()} COP</span>
                  </div>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3.5 bg-[#0a0a0c] p-4 sm:p-5 border border-white/10 rounded-lg">
                  <h3 className="text-[11px] uppercase tracking-widest font-bold text-white border-b border-white/10 pb-2 mb-3">
                    Datos para Envío y Facturación (Wompi)
                  </h3>
                  
                  <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} placeholder="Nombre Completo *" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                  
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <input type="text" name="documentId" required value={formData.documentId} onChange={handleInputChange} placeholder="Cédula *" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="Teléfono / WhatsApp *" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                  </div>
                  
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="Correo Electrónico *" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                  
                  {/* SELECTOR INTELIGENTE DE DESTINO (CALCULA ENVÍO AUTOMÁTICO) */}
                  <div className="space-y-2.5 bg-[#14141c] p-3 border border-amber-400/25 rounded-lg">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 block">
                      📍 Destino de Entrega en Colombia
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                          Departamento *
                        </label>
                        <select
                          name="department"
                          required
                          value={formData.department}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            const availableCities = COLOMBIA_REGIONS[newDept] || ["Medellín"];
                            const firstCity = availableCities.find((c) => c !== "Otro Municipio / Corregimiento...") || "";
                            setIsCustomCity(false);
                            setCustomCityText("");
                            setShippingDestination(newDept, firstCity);
                          }}
                          className="w-full bg-[#0a0a0c] text-white border border-white/20 px-2.5 py-2 text-xs focus:outline-none focus:border-amber-400 rounded-md cursor-pointer"
                        >
                          {Object.keys(COLOMBIA_REGIONS).map((dept) => (
                            <option key={dept} value={dept} className="bg-[#111115] text-white">
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                          Ciudad o Municipio *
                        </label>
                        <select
                          value={
                            isCustomCity || (formData.city && !(COLOMBIA_REGIONS[formData.department] || []).filter(c => c !== "Otro Municipio / Corregimiento...").includes(formData.city))
                              ? "Otro Municipio / Corregimiento..."
                              : formData.city
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Otro Municipio / Corregimiento...") {
                              setIsCustomCity(true);
                              setCustomCityText("");
                              setShippingDestination(formData.department, "");
                            } else {
                              setIsCustomCity(false);
                              setCustomCityText("");
                              setShippingDestination(formData.department, val);
                            }
                          }}
                          className="w-full bg-[#0a0a0c] text-white border border-white/20 px-2.5 py-2 text-xs focus:outline-none focus:border-amber-400 rounded-md cursor-pointer"
                        >
                          {(COLOMBIA_REGIONS[formData.department] || ["Otro Municipio / Corregimiento..."]).map((c) => (
                            <option key={c} value={c} className="bg-[#111115] text-white">
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {(isCustomCity || (formData.city && !(COLOMBIA_REGIONS[formData.department] || []).filter(c => c !== "Otro Municipio / Corregimiento...").includes(formData.city)) || formData.city === "") && (
                      <input
                        type="text"
                        required
                        name="city"
                        value={isCustomCity ? customCityText : formData.city}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIsCustomCity(true);
                          setCustomCityText(val);
                          setShippingDestination(formData.department, val);
                        }}
                        placeholder="Escribe el nombre de tu municipio o corregimiento *"
                        className="w-full bg-[#0a0a0c] text-white border border-amber-400/50 px-3 py-2 text-xs focus:outline-none focus:border-amber-400 rounded-md"
                      />
                    )}
                  </div>
                  
                  <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="Dirección Exacta (Calle, Carrera, Casa, Apto) *" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                  
                  <textarea name="notes" rows={2} value={formData.notes} onChange={handleInputChange} placeholder="Notas Adicionales o Instrucciones de Entrega (Opcional)" className="w-full bg-[#111115] text-white border border-white/15 px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400 rounded-md placeholder-neutral-500" />
                  
                  <button type="submit" disabled={submitting} className="w-full bg-white text-black py-3.5 sm:py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all shadow-md disabled:opacity-50 mt-2 active:scale-98 flex items-center justify-center gap-2 cursor-pointer rounded-md">
                    {submitting ? "Procesando..." : "Proceder al Pago con Wompi"}
                  </button>
                  <p className="text-[9px] text-center text-neutral-400 uppercase tracking-widest mt-1">Pagos Seguros Wompi &bull; Bancolombia &bull; Nequi</p>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      {/* NOTIFICACIÓN FLOTANTE ANIMADA AL AÑADIR PRODUCTO */}
      {addedNotification && (
        <div className="fixed top-4 right-3 sm:top-6 sm:right-6 z-[120] animate-in fade-in slide-in-from-top-4 duration-300 max-w-[340px] sm:max-w-sm w-full">
          <div className="bg-[#111116]/95 backdrop-blur-xl border border-amber-400/40 p-3 sm:p-3.5 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 text-white">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
              {addedNotification.image ? (
                <img src={addedNotification.image} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl">🛍️</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>¡Agregado al Carrito!</span>
              </div>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {addedNotification.name}
              </p>
              <p className="text-[11px] font-mono text-neutral-300">
                $ {Number(addedNotification.price).toLocaleString()} COP
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAddedNotification(null);
                setIsCartOpen(true);
              }}
              className="bg-white text-black hover:bg-neutral-200 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Ver Carrito
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE GARANTÍAS Y ENVÍOS OFICIAL */}
      <ShippingWarrantyModal
        isOpen={isWarrantyOpen}
        onClose={() => setIsWarrantyOpen(false)}
        defaultTab={warrantyTab}
      />
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

