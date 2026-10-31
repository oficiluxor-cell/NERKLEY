"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface ProductContext {
  id?: string;
  name?: string;
  sale_price?: number;
  original_price?: number;
  category?: string;
  sizes?: string;
  colors?: string;
  stock?: number;
  description?: string;
}

interface Props {
  currentProduct?: ProductContext;
}

// Clasificación inteligente del producto
function getProductType(p?: ProductContext): "perfume" | "footwear" | "clothing" | "cap" | "jewelry" | "general" {
  if (!p) return "general";
  const text = `${p.category || ""} ${p.name || ""}`.toLowerCase();
  if (
    text.includes("perfume") ||
    text.includes("fragancia") ||
    text.includes("locion") ||
    text.includes("loción") ||
    text.includes("parfum") ||
    text.includes("colonia") ||
    text.includes("aroma") ||
    text.includes("eau de") ||
    text.includes("elixir")
  ) {
    return "perfume";
  }
  if (
    text.includes("zapato") ||
    text.includes("sneaker") ||
    text.includes("tenis") ||
    text.includes("calzado") ||
    text.includes("retro") ||
    text.includes("jordan") ||
    text.includes("dunk") ||
    text.includes("bota")
  ) {
    return "footwear";
  }
  if (text.includes("gorra") || text.includes("cap") || text.includes("beanie") || text.includes("sombrero")) {
    return "cap";
  }
  if (
    text.includes("joya") ||
    text.includes("oro") ||
    text.includes("cadena") ||
    text.includes("reloj") ||
    text.includes("pulsera") ||
    text.includes("anillo") ||
    text.includes("dije")
  ) {
    return "jewelry";
  }
  if (
    text.includes("ropa") ||
    text.includes("camisa") ||
    text.includes("camiseta") ||
    text.includes("hoodie") ||
    text.includes("buzo") ||
    text.includes("pantalon") ||
    text.includes("pantalón") ||
    text.includes("short") ||
    text.includes("chaqueta")
  ) {
    return "clothing";
  }
  return "general";
}

function getWelcomeMessage(currentProduct?: ProductContext): string {
  if (!currentProduct) {
    return "¡Hola! Bienvenido a **NERKLEY Concierge**. ✨\n\nSoy tu Asesor Virtual de Inteligencia Artificial disponible 24/7. Te puedo guiar con perfumería exclusiva, sneakers, moda urbana, tiempos de despacho o medios de pago con Wompi (Nequi, Bancolombia, PSE). ¿En qué te puedo asesorar hoy?";
  }

  const type = getProductType(currentProduct);
  const priceFormatted = `$${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP`;

  switch (type) {
    case "perfume":
      return `¡Hola! 👋 Veo que estás interesado en la fragancia **${currentProduct.name}** (${priceFormatted}).\n\n¿Deseas conocer su aroma/notas olfativas, fijación en piel (8-12 hrs), presentación (${currentProduct.sizes || "100ml / Frasco de lujo"}), tiempos de entrega o cómo pagar con Nequi o Bancolombia?`;
    case "footwear":
      return `¡Hola! 👋 Veo que estás interesado en los sneakers **${currentProduct.name}** (${priceFormatted}).\n\n¿Deseas saber sobre las tallas de calzado disponibles (${currentProduct.sizes || "38 a 43"}), guía de horma (si viene exacta), tiempos de envío o medios de pago?`;
    case "clothing":
      return `¡Hola! 👋 Veo que estás interesado en la prenda **${currentProduct.name}** (${priceFormatted}).\n\n¿Tienes alguna duda sobre tallas disponibles (${currentProduct.sizes || "S, M, L, XL"}), calidad del tejido o acabados, tiempos de entrega o medios de pago?`;
    case "cap":
      return `¡Hola! 👋 Veo que estás interesado en la gorra **${currentProduct.name}** (${priceFormatted}).\n\n¿Tienes alguna duda sobre el ajuste (${currentProduct.sizes || "Talla única ajustable con broche"}), materiales o tiempos de envío?`;
    case "jewelry":
      return `¡Hola! 👋 Veo que estás interesado en la joya **${currentProduct.name}** (${priceFormatted}).\n\n¿Tienes alguna duda sobre los materiales (${currentProduct.colors || "Oro / Laminado de alta durabilidad"}), medidas o tiempos de despacho?`;
    default:
      return `¡Hola! 👋 Veo que estás interesado en **${currentProduct.name}** (${priceFormatted}).\n\n¿Tienes alguna duda sobre este artículo, materiales, tiempo de entrega a tu ciudad o medios de pago con Wompi?`;
  }
}

function getSwitchProductMessage(currentProduct: ProductContext): string {
  const type = getProductType(currentProduct);
  const priceFormatted = `$${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP`;

  if (type === "perfume") {
    return `📌 *Viendo:* **${currentProduct.name}** — ${priceFormatted}\n¿Deseas conocer su aroma, fijación en piel o presentación en mililitros?`;
  } else if (type === "footwear") {
    return `📌 *Viendo:* **${currentProduct.name}** — ${priceFormatted}\n¿Deseas consultar tallas de calzado disponibles (${currentProduct.sizes || "38 a 43"}) o guía de horma?`;
  } else if (type === "cap") {
    return `📌 *Viendo:* **${currentProduct.name}** — ${priceFormatted}\n¿Deseas saber sobre el broche ajustable o materiales?`;
  } else if (type === "clothing") {
    return `📌 *Viendo:* **${currentProduct.name}** — ${priceFormatted}\n¿Deseas consultar tallas (${currentProduct.sizes || "S, M, L, XL"}) o tipo de corte?`;
  } else {
    return `📌 *Viendo:* **${currentProduct.name}** — ${priceFormatted}\n¿Tienes alguna duda sobre los materiales o tiempos de entrega?`;
  }
}

function getQuickQuestions(currentProduct?: ProductContext): string[] {
  if (!currentProduct) {
    return [
      "¿Cuánto tarda el envío?",
      "¿Qué medios de pago aceptan?",
      "¿Qué perfumes tienen en catálogo?",
      "¿Cómo hago una compra segura?",
    ];
  }

  const type = getProductType(currentProduct);
  switch (type) {
    case "perfume":
      return [
        "¿Qué aroma y notas tiene?",
        "¿Qué fijación y duración tiene?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
      ];
    case "footwear":
      return [
        "¿Qué tallas de calzado tienen?",
        "¿La horma es exacta o amplia?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
      ];
    case "clothing":
      return [
        "¿Qué tallas de ropa tienen?",
        "¿Qué tipo de tela y corte es?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
      ];
    case "cap":
      return [
        "¿Es talla única ajustable?",
        "¿Qué materiales y acabados tiene?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
      ];
    case "jewelry":
      return [
        "¿Qué material y garantía tiene?",
        "¿Qué medidas o largo tiene?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
      ];
    default:
      return [
        "¿Cuáles son los materiales?",
        "¿Cuánto tarda el envío?",
        "¿Cómo pago con Nequi o Bancolombia?",
        "¿Es original y con garantía?",
      ];
  }
}

export default function AIChatSupport({ currentProduct }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: getWelcomeMessage(currentProduct),
      time: "Ahora",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Bloquear el scroll de la página de fondo cuando el chat está abierto en móviles/tablets
  // para que al deslizar mensajes o tocar el chat, lo de atrás permanezca 100% fijo.
  useEffect(() => {
    if (!isOpen) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    if (isMobile) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.overflow = originalOverflow;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Si cambia el producto (ej. navega a otro), actualizamos el contexto de forma inteligente
  useEffect(() => {
    if (currentProduct) {
      setMessages((prev) => [
        ...prev,
        {
          id: `product-switch-${Date.now()}`,
          role: "assistant",
          content: getSwitchProductMessage(currentProduct),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [currentProduct?.name]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentProduct,
        }),
      });

      const data = await response.json();
      const replyText = data.reply || "Con gusto te asisto en NERKLEY. ¿En qué más puedo orientarte?";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (!isOpen) setUnreadCount((prev) => prev + 1);
    } catch (err) {
      console.error("Error al contactar soporte IA:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content:
            "En NERKLEY contamos con envíos asegurados a toda Colombia (5 a 8 días hábiles con inspección individual de calidad) y pagos 100% blindados con Wompi (Nequi, Bancolombia, PSE o Tarjetas). ¿Qué duda tienes sobre tu compra?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = getQuickQuestions(currentProduct);

  return (
    <>
      {/* Botón flotante animado de Soporte IA */}
      <div className="fixed bottom-20 right-3.5 md:bottom-5 md:right-5 z-[80] flex flex-col items-end">
        {/* Burbuja de invitación: SOLO en desktop/tablets (hidden en celulares para no tapar la pantalla) */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden md:flex mb-2 bg-[#121217]/95 border border-amber-400/30 text-white text-[11px] py-1.5 px-3 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] cursor-pointer items-center gap-2 hover:border-amber-400/60 transition-all animate-bounce"
            style={{ animationDuration: "3.5s" }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-semibold text-neutral-200">
              {currentProduct ? "¿Dudas de este artículo? IA 24/7" : "Soporte IA 24/7 • NERKLEY"}
            </span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Soporte IA"
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#1a1a24] to-[#0a0a0c] border border-amber-400/40 text-white shadow-[0_0_20px_rgba(232,198,98,0.25)] hover:shadow-[0_0_35px_rgba(232,198,98,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        >
          {isOpen ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Icono de IA estilizado en oro */}
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 transition-transform group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {/* Indicador sutil de disponibilidad 24/7 en la esquina */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black"></span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Ventana de Chat Soporte IA */}
      {isOpen && (
        <>
          {/* Telón de fondo en móviles para aislar el chat y evitar deslizamientos en la página de fondo */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[84] md:hidden transition-opacity"
            aria-hidden="true"
          />

          <div
            style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
            className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-[85] w-[94vw] sm:w-[410px] h-[550px] max-h-[80vh] bg-[#0c0c10]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white font-sans animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            {/* Cabecera del Chat */}
            <div 
              onTouchMove={(e) => e.stopPropagation()}
              className="p-3.5 bg-gradient-to-r from-[#14141c] via-[#101017] to-[#0a0a0e] border-b border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-black border border-amber-400/40 flex items-center justify-center p-1 shadow-inner">
                  <img src="/logo.svg" alt="NERKLEY AI" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold font-serif tracking-wider text-white">NERKLEY CONCIERGE</h3>
                    <span className="text-[8px] uppercase tracking-wider font-bold bg-amber-400/15 text-amber-300 px-1.5 py-0.5 rounded-xs border border-amber-400/30">
                      IA 24/7
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>En línea &bull; Asistente de Compras</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white text-2xl p-1 leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Banner de Contexto de Producto si está en una ficha */}
            {currentProduct && (
              <div 
                onTouchMove={(e) => e.stopPropagation()}
                className="bg-[#15151e] border-b border-white/10 p-2.5 px-3.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">Artículo activo:</span>
                  <span className="text-white font-medium truncate max-w-[170px] sm:max-w-[200px]">{currentProduct.name}</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold text-xs whitespace-nowrap">
                  ${Number(currentProduct.sale_price).toLocaleString("es-CO")}
                </span>
              </div>
            )}

            {/* Cuerpo de Mensajes con aislamiento total de scroll */}
            <div 
              style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
              className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 text-xs overscroll-contain"
            >
              {messages.map((m) => {
                const isAi = m.role === "assistant";
                return (
                  <div key={m.id} className={`flex flex-col ${isAi ? "items-start" : "items-end"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 leading-relaxed shadow-sm ${
                        isAi
                          ? "bg-[#181822] text-neutral-100 border border-white/10 rounded-tl-xs"
                          : "bg-white text-black font-medium rounded-tr-xs"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                    <span className="text-[9px] text-neutral-500 mt-1 px-1">{m.time}</span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-neutral-400 text-xs bg-[#181822] border border-white/10 p-2.5 rounded-2xl rounded-tl-xs max-w-[180px]">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[10px] text-neutral-300 font-medium">Asesorando...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preguntas Rápidas Contextuales */}
            <div 
              style={{ overscrollBehavior: "contain" }}
              className="px-3 py-2 bg-[#0e0e14] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar overscroll-contain"
            >
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="whitespace-nowrap bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-[10px] text-neutral-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Entrada de Texto */}
            <div 
              onTouchMove={(e) => e.stopPropagation()}
              className="p-3 bg-[#111117] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentProduct
                    ? `Pregunta sobre ${currentProduct.name}...`
                    : "Pregunta sobre envíos, pagos o productos..."
                }
                className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-amber-400 transition-colors"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputValue.trim()}
                className="bg-amber-400 text-black px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0 shadow-md"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
