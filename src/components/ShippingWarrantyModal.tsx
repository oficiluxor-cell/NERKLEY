"use client";

import React, { useState, useEffect } from "react";

export type WarrantyTab = "shipping" | "warranty" | "payments" | "returns";

interface ShippingWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: WarrantyTab;
}

export default function ShippingWarrantyModal({
  isOpen,
  onClose,
  defaultTab = "shipping",
}: ShippingWarrantyModalProps) {
  const [activeTab, setActiveTab] = useState<WarrantyTab>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Bloquear scroll de la página cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop con desenfoque de cristal oscuro */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Contenedor del Modal en Dark Obsidian & Oro */}
      <div className="relative w-full max-w-3xl bg-[#0e0e13] border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#13131a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400/90 font-semibold block">
                NERKLEY &bull; Protocolo Oficial
              </span>
              <h3 className="text-base sm:text-lg font-serif font-light uppercase tracking-wider text-white">
                Garantías, Envíos & Seguridad
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Barra de Pestañas Interactivas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/10 bg-[#101017] text-xs">
          <button
            onClick={() => setActiveTab("shipping")}
            className={`py-3 px-3 sm:px-4 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-b-2 text-[11px] ${
              activeTab === "shipping"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>🚚</span>
            <span>Envíos & Tiempos</span>
          </button>

          <button
            onClick={() => setActiveTab("warranty")}
            className={`py-3 px-3 sm:px-4 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-b-2 text-[11px] ${
              activeTab === "warranty"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>🛡️</span>
            <span>Garantía & Lujo</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`py-3 px-3 sm:px-4 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-b-2 text-[11px] ${
              activeTab === "payments"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>💳</span>
            <span>Pagos Blindados</span>
          </button>

          <button
            onClick={() => setActiveTab("returns")}
            className={`py-3 px-3 sm:px-4 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-b-2 text-[11px] ${
              activeTab === "returns"
                ? "border-amber-400 text-amber-300 bg-amber-400/5"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>🔄</span>
            <span>Cambios Fáciles</span>
          </button>
        </div>

        {/* Contenido Dinámico por Pestaña */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: ENVÍOS & TIEMPOS */}
          {activeTab === "shipping" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#14141c] border border-amber-400/20 p-4 rounded-xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">📦</span>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">
                    Envíos Prioritarios y Asegurados a Toda Colombia
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    Cada paquete sale con precinto de seguridad, empaque con amortiguación térmica y póliza asegurada contra avería o pérdida.
                  </p>
                </div>
              </div>

              {/* Tiempos de Entrega */}
              <div>
                <h5 className="text-amber-400 font-semibold uppercase tracking-widest text-xs mb-3">
                  Tiempos Estimados de Despacho
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#121218] border border-white/10 p-3.5 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">Ciudades Principales</span>
                      <span className="text-emerald-400 font-mono text-xs font-semibold">4 a 7 días hábiles</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, Pereira, Manizales e Ibagué.
                    </p>
                  </div>

                  <div className="bg-[#121218] border border-white/10 p-3.5 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">Resto de Colombia</span>
                      <span className="text-amber-300 font-mono text-xs font-semibold">5 a 8 días hábiles</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Municipios intermedios y trayectos especiales con cobertura nacional asegurada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Proceso en 3 Pasos */}
              <div>
                <h5 className="text-amber-400 font-semibold uppercase tracking-widest text-xs mb-3">
                  ¿Cómo Procesamos tu Orden?
                </h5>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-[#111116] border border-white/5 p-3 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="text-white font-semibold text-xs block">
                        Curaduría e Inspección de Lote (1 a 3 días hábiles)
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Verificamos atomizadores, batch codes, sellos térmicos, costuras y herrajes antes de embalar de forma individual.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-[#111116] border border-white/5 p-3 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="text-white font-semibold text-xs block">
                        Tránsito Nacional con Transportadoras Oficiales
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Alianza logística con <strong>Interrapidísimo, Servientrega, Coordinadora y Envía</strong> con póliza de seguro completa.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-[#111116] border border-white/5 p-3 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="text-white font-semibold text-xs block">
                        Notificación y Rastreo en Tiempo Real
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Apenas tu orden es recogida por la transportadora, recibes tu número de guía oficial para rastrear cada parada desde la web oficial o en el botón <strong>&quot;Mis Pedidos&quot;</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GARANTÍA & AUTENTICIDAD */}
          {activeTab === "warranty" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#14141c] border border-amber-400/20 p-4 rounded-xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">🛡️</span>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">
                    Compromiso de Autenticidad y Calidad NERKLEY
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    Curaduría rigurosa para quienes buscan exclusividad, fijación duradera y acabados impecables sin concesiones.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <span>💎</span>
                    <span>Perfumería de Autor & Diseñador</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Aromas con concentración Parfum o Eau de Parfum. Fijación en piel comprobada de 8 a 12 horas, frascos sellados de fábrica y batch codes contrastables.
                  </p>
                </div>

                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <span>👟</span>
                    <span>Calzado & Sneakers Exclusivos</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Suelas ergonómicas de alta densidad, costuras de precisión y caja original protegida con doble cartón para evitar abolladuras.
                  </p>
                </div>

                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <span>👕</span>
                    <span>Streetwear & Haute Couture</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Algodón pesado de alto gramaje, estampados y bordados resistentes al lavado y horma de corte contemporáneo.
                  </p>
                </div>

                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <span>👑</span>
                    <span>Joyería & Oro Laminado / Titanio</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Baño de alta densidad con acabado espejo que no mancha la piel ni pierde brillo con el uso habitual.
                  </p>
                </div>
              </div>

              <div className="bg-amber-400/5 border border-amber-400/20 p-3 rounded-lg text-neutral-300 text-xs flex items-center gap-2">
                <span className="text-amber-400 text-base">✦</span>
                <span>
                  Cada artículo cuenta con <strong>precinto de seguridad inviolable</strong> numerado por NERKLEY antes del despacho.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: PAGOS SEGUROS WOMPI */}
          {activeTab === "payments" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#14141c] border border-amber-400/20 p-4 rounded-xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">💳</span>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">
                    Pasarela Oficial Wompi (Grupo Bancolombia)
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    Tus pagos están blindados con cifrado bancario SHA-256 de 256 bits y certificación internacional PCI-DSS.
                  </p>
                </div>
              </div>

              <div>
                <h5 className="text-amber-400 font-semibold uppercase tracking-widest text-xs mb-3">
                  Medios de Pago Disponibles al Instante
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">Nequi</span>
                    <span className="text-[10px] text-neutral-400">Notificación directa y aprobación en 1 clic</span>
                  </div>
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">Bancolombia</span>
                    <span className="text-[10px] text-neutral-400">Transferencia oficial sin costo adicional</span>
                  </div>
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">PSE</span>
                    <span className="text-[10px] text-neutral-400">Débito con cualquier banco de Colombia</span>
                  </div>
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">Tarjetas de Crédito</span>
                    <span className="text-[10px] text-neutral-400">Visa, MasterCard, Amex (a cuotas)</span>
                  </div>
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">Daviplata</span>
                    <span className="text-[10px] text-neutral-400">Pago rápido desde tu celular</span>
                  </div>
                  <div className="bg-[#121218] border border-white/10 p-3 rounded-lg text-center">
                    <span className="font-bold text-white text-xs block mb-1">Garantía Bancaria</span>
                    <span className="text-[10px] text-emerald-400 font-medium">Reversión protegida por ley</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#111116] border border-white/10 rounded-lg space-y-2">
                <span className="text-white font-semibold text-xs flex items-center gap-2">
                  <span>🔒</span>
                  <span>¿Es seguro pagar en NERKLEY?</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Totalmente. Nosotros <strong>nunca almacenamos los datos de tus tarjetas o claves bancarias</strong>. La transacción ocurre directamente en los servidores protegidos de Wompi Bancolombia. Tu dinero está resguardado hasta que tu orden es confirmada.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: CAMBIOS & DEVOLUCIONES */}
          {activeTab === "returns" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-[#14141c] border border-amber-400/20 p-4 rounded-xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">🔄</span>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">
                    Política de Cambios y Protección al Comprador
                  </h4>
                  <p className="text-neutral-400 text-xs">
                    Tu satisfacción y tranquilidad son nuestra prioridad. Te respaldamos en cada paso de tu compra.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg">
                  <h5 className="font-bold text-white text-xs mb-1">
                    1. Cobertura por Daño o Avería en Transporte
                  </h5>
                  <p className="text-[11px] text-neutral-400">
                    Si el paquete llega visiblemente golpeado, derramado o con empaque roto por la transportadora, envíanos una foto en las primeras 48 horas y tramitamos la <strong>reposición inmediata de tu producto</strong> sin costo adicional para ti.
                  </p>
                </div>

                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg">
                  <h5 className="font-bold text-white text-xs mb-1">
                    2. Garantía por Defecto de Fabricación (5 Días)
                  </h5>
                  <p className="text-[11px] text-neutral-400">
                    Cuentas con hasta <strong>5 días calendario</strong> desde que recibes tu paquete para notificarnos cualquier inconveniente con atomizadores, costuras, cremalleras o cierres.
                  </p>
                </div>

                <div className="bg-[#121218] border border-white/10 p-4 rounded-lg">
                  <h5 className="font-bold text-white text-xs mb-1">
                    3. Cambios de Talla (Ropa y Sneakers)
                  </h5>
                  <p className="text-[11px] text-neutral-400">
                    Si pediste una talla y necesitas cambiarla, te asesoramos para gestionar el cambio por una talla disponible, siempre y cuando la prenda conserve sus etiquetas originales intactas y sin señales de uso.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones Rápidas */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#13131a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Asistencia y despacho activo en toda Colombia</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-ai-chat"));
                }
              }}
              className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 border border-white/20 text-neutral-200 hover:text-white px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>💬</span>
              <span>Consultar al Asesor IA</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 text-center"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
