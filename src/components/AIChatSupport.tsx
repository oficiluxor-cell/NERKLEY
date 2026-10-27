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

export default function AIChatSupport({ currentProduct }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: currentProduct
        ? `¡Hola! 👋 Veo que estás interesado en **${currentProduct.name}** ($${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP).\n\n¿Tienes alguna duda sobre la talla, materiales, tiempo de envío a tu ciudad o medios de pago disponibles? Estoy aquí para ayudarte 24/7.`
        : "¡Hola! Bienvenido a **NERKLEY Concierge**. ✨\n\nSoy tu Asesor Virtual de Inteligencia Artificial disponible 24/7. ¿En qué te puedo asesorar hoy? (Tallas, envíos a tu ciudad, medios de pago con Wompi o recomendaciones de nuestro catálogo).",
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

  // Si cambia el producto (ej. navega a otro), actualizamos el contexto
  useEffect(() => {
    if (currentProduct) {
      setMessages((prev) => [
        ...prev,
        {
          id: `product-switch-${Date.now()}`,
          role: "assistant",
          content: `📌 *Viendo:* **${currentProduct.name}** — $${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP\n¿Deseas saber sobre las tallas disponibles (${currentProduct.sizes || "estándar"}) o tiempos de entrega?`,
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
            "En NERKLEY contamos con envíos asegurados a toda Colombia (2-4 días) y pagos 100% blindados con Wompi (Nequi, Bancolombia, PSE o Tarjetas). ¿Qué duda tienes sobre tu compra?",
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

  const quickQuestions = currentProduct
    ? [
        `¿Qué tallas tienen de este producto?`,
        `¿Cuánto tarda el envío a mi ciudad?`,
        `¿Cómo pago con Nequi o Bancolombia?`,
        `¿Es original y con garantía?`,
      ]
    : [
        `¿Cuánto tarda el envío?`,
        `¿Qué medios de pago aceptan?`,
        `¿Cómo hago una compra segura?`,
        `¿Qué productos tienen disponibles?`,
      ];

  return (
    <>
      {/* Botón flotante animado de Soporte IA */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end">
        {/* Burbuja de invitación cuando está cerrado */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="mb-2.5 bg-[#121217]/95 border border-amber-400/30 text-white text-[11px] py-2 px-3.5 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-2 hover:border-amber-400/60 transition-all animate-bounce"
            style={{ animationDuration: "3s" }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-semibold text-neutral-200">
              {currentProduct ? "¿Dudas con este artículo? Pregúntale a la IA" : "Soporte IA 24/7 &bull; Asistente NERKLEY"}
            </span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir Soporte IA"
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#1a1a24] to-[#0a0a0c] border border-amber-400/40 text-white shadow-[0_0_25px_rgba(232,198,98,0.25)] hover:shadow-[0_0_35px_rgba(232,198,98,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Icono de IA estilizado en oro */}
              <svg className="w-7 h-7 text-amber-300 transition-transform group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Ventana de Chat Soporte IA */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 z-[85] w-[92vw] sm:w-[410px] h-[560px] max-h-[82vh] bg-[#0c0c10]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white font-sans animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Cabecera del Chat */}
          <div className="p-4 bg-gradient-to-r from-[#14141c] via-[#101017] to-[#0a0a0e] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-black border border-amber-400/40 flex items-center justify-center p-1 shadow-inner">
                <img src="/logo.svg" alt="NERKLEY AI" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-serif tracking-wider text-white">NERKLEY CONCIERGE</h3>
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
              className="text-neutral-400 hover:text-white text-xl p-1 leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Banner de Contexto de Producto si está en una ficha */}
          {currentProduct && (
            <div className="bg-[#15151e] border-b border-white/10 p-2.5 px-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">Artículo activo:</span>
                <span className="text-white font-medium truncate max-w-[190px]">{currentProduct.name}</span>
              </div>
              <span className="text-emerald-400 font-mono font-bold text-xs whitespace-nowrap">
                ${Number(currentProduct.sale_price).toLocaleString("es-CO")}
              </span>
            </div>
          )}

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m) => {
              const isAi = m.role === "assistant";
              return (
                <div key={m.id} className={`flex flex-col ${isAi ? "items-start" : "items-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                      isAi
                        ? "bg-[#181822] text-neutral-200 border border-white/10 rounded-tl-xs"
                        : "bg-white text-black font-medium rounded-tr-xs shadow-md"
                    }`}
                  >
                    <div className="whitespace-pre-line break-words text-[12px]">{m.content}</div>
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1 px-1 font-mono">{m.time}</span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-[#181822] text-neutral-300 rounded-2xl rounded-tl-xs max-w-[70%] border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-[11px] text-neutral-400 italic">NERKLEY AI está respondiendo...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas de Preguntas */}
          <div className="p-2 px-3 border-t border-white/5 bg-[#0a0a0d] flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-[10px] px-2.5 py-1 rounded-full transition-all cursor-pointer flex-shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Caja de Entrada de Texto */}
          <div className="p-3 bg-[#0e0e13] border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentProduct ? "Pregunta sobre este producto, talla, envío..." : "Escribe tu duda sobre pedidos, envíos o Wompi..."}
              className="flex-1 bg-[#14141c] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputValue.trim()}
              className="bg-white hover:bg-neutral-200 text-black p-2.5 px-3.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-md active:scale-95"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
