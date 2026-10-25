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

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  // Cargar localStorage de forma segura
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedCart = localStorage.getItem("NERKLEY_cart");
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (e) {
        console.error("Error leyendo carrito", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("NERKLEY_cart", JSON.stringify(cartItems));
      } catch (e) {
        console.error("Error guardando carrito", e);
      }
    }
  }, [cartItems]);

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
    setIsCartOpen(true);
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

  // Función directa para abrir el Widget de Wompi de manera inmediata
  const openWompiWidget = () => {
    if (!pendingPaymentInfo) return;

    // @ts-ignore
    if (typeof window !== "undefined" && window.CheckoutWidget) {
      // @ts-ignore
      const checkout = new window.CheckoutWidget({
        publicKey: "pub_test_b1Y0m1GkrxaRtibHpoNDfoWiBY77ggeI",
        currency: "COP",
        amountInCents: pendingPaymentInfo.total * 100,
        reference: pendingPaymentInfo.reference,
        customerData: {
          email: pendingPaymentInfo.email,
          fullName: pendingPaymentInfo.customerName,
          phoneNumber: pendingPaymentInfo.phone,
          phoneNumberPrefix: "+57",
          legalId: pendingPaymentInfo.documentId,
          legalIdType: "CC"
        }
      });

      checkout.open(function (result: any) {
        const transaction = result.transaction;
        console.log("Transacción Wompi:", transaction);
        if (transaction && transaction.status === "APPROVED") {
          window.location.href = `/success?id=${transaction.id}`;
        }
      });
    } else {
      alert("Cargando pasarela de pago, por favor intenta de nuevo en un momento.");
    }
  };

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, cartCount, cartTotal, isCartOpen, setIsCartOpen }}
    >
      {children}

      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
          onClick={() => {
            if (!pendingPaymentInfo) setIsCartOpen(false);
          }}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white z-[101] shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-serif uppercase tracking-widest font-bold">
            {pendingPaymentInfo ? "Pasarela de Pago Wompi" : `Tu Carrito (${cartCount})`}
          </h2>
          {!pendingPaymentInfo && (
            <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-black text-2xl leading-none">
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
                <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-semibold block mb-1">Orden Registrada en NERKLEY</span>
                <h3 className="text-xl font-serif uppercase tracking-wider font-bold">¡Hola, {pendingPaymentInfo.customerName}!</h3>
              </div>

              <div className="bg-[#fafafa] border border-neutral-200 p-6 space-y-4 text-left shadow-sm">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                  <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Referencia:</span>
                  <span className="text-sm font-mono font-bold bg-black text-white px-3 py-1 tracking-widest">{pendingPaymentInfo.reference}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Total a Pagar:</span>
                  <span className="text-lg font-bold text-black">$ {pendingPaymentInfo.total.toLocaleString()} COP</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 leading-relaxed text-left">
                <p className="font-bold mb-1 uppercase tracking-wider">Pago Seguro Wompi (Bancolombia):</p>
                Haz clic en el botón de abajo para abrir la ventana de pago seguro con el monto exacto predefinido.
              </div>

              <button
                type="button"
                onClick={openWompiWidget}
                className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all text-center shadow-md cursor-pointer"
              >
                Pagar $ {pendingPaymentInfo.total.toLocaleString()} COP en Wompi &rarr;
              </button>

              <button
                onClick={() => {
                  setPendingPaymentInfo(null);
                  setIsCartOpen(false);
                }}
                className="text-[10px] text-neutral-400 uppercase tracking-widest underline hover:text-black block mx-auto pt-2"
              >
                Modificar datos o carrito
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs uppercase tracking-widest text-neutral-400 mb-6">Tu carrito está vacío</p>
              <button onClick={() => setIsCartOpen(false)} className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-md">
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-[#fafafa] p-3 border border-neutral-100 relative group">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 text-lg font-bold leading-none"
                      title="Eliminar producto"
                    >&times;</button>
                    
                    <div className="w-20 h-24 bg-white flex-shrink-0 border border-neutral-200 flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] uppercase tracking-widest text-neutral-300 font-serif">NERKLEY</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-between py-1 pr-6 w-full">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider line-clamp-1">{item.name}</h4>
                        <div className="flex gap-2 mt-1 text-[10px] text-neutral-500 uppercase font-medium">
                          {item.size && <span>Talla: {item.size}</span>}
                          {item.size && item.color && <span>|</span>}
                          {item.color && <span>Color: {item.color}</span>}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-neutral-300 bg-white">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 font-bold"
                            >-</button>
                            <span className="px-2.5 text-xs font-semibold">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 font-bold"
                            >+</button>
                          </div>
                          <span className="text-[9px] text-neutral-400">Stock: {item.maxStock}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-black mt-2">$ {(item.price * item.quantity).toLocaleString()} COP</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-semibold uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-xl font-bold">$ {cartTotal.toLocaleString()} COP</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4 bg-[#fafafa] p-5 border border-neutral-200">
                  <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-900 border-b border-neutral-200 pb-2 mb-4">
                    Datos para Envío y Facturación (Wompi)
                  </h3>
                  
                  <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} placeholder="Nombre Completo *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" name="documentId" required value={formData.documentId} onChange={handleInputChange} placeholder="Cédula *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="Teléfono *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  </div>
                  
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="Correo Electrónico *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value="Colombia" disabled className="w-full bg-neutral-100 border border-neutral-300 px-4 py-2.5 text-xs text-neutral-500 cursor-not-allowed" />
                    <input type="text" name="city" required value={formData.city} onChange={handleInputChange} placeholder="Ciudad *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  </div>
                  
                  <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="Dirección Exacta (Casa, Apto) *" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  
                  <textarea name="notes" rows={2} value={formData.notes} onChange={handleInputChange} placeholder="Notas Adicionales (Opcional)" className="w-full bg-white border border-neutral-300 px-4 py-2.5 text-xs focus:outline-none focus:border-black" />
                  
                  <button type="submit" disabled={submitting} className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md disabled:opacity-50 mt-4 active:scale-98 flex items-center justify-center gap-2">
                    {submitting ? "Procesando..." : "Proceder al Pago con Wompi"}
                  </button>
                  <p className="text-[9px] text-center text-neutral-400 uppercase tracking-widest mt-2">Pagos Seguros Wompi &bull; Bancolombia</p>
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