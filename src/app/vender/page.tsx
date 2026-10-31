"use client";

import { useState } from "react";
import Link from "next/link";
import { COLOMBIA_REGIONS } from "@/lib/shipping";
import { registerNewSeller } from "@/lib/marketplace";

export default function VenderPage() {
  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const CATEGORIES = [
    "Perfumería & Fragancias",
    "Sneakers & Calzado de Colección",
    "Moda Urbana & Ropa de Diseñador",
    "Gorras & Accesorios",
    "Joyería & Relojería",
    "Catálogo Multimarca / Variado",
  ];

  const BANK_OPTIONS = [
    "Bancolombia",
    "Nequi",
    "Daviplata",
    "Banco de Bogotá",
    "Davivienda",
    "BBVA Colombia",
    "Otro Banco",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const finalCity = isCustomCity ? customCityText.trim() : formData.city.trim();
    if (!finalCity) {
      setErrorMessage("Por favor indica la ciudad o municipio de despacho.");
      setLoading(false);
      return;
    }

    const res = await registerNewSeller({
      ...formData,
      city: finalCity,
    });

    setLoading(false);
    if (res.success) {
      setIsSuccess(true);
    } else {
      setErrorMessage(res.error || "Ocurrió un error al enviar tu solicitud. Intenta nuevamente.");
    }
  };

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
            <Link
              href="/admin"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-[11px] font-semibold transition-all"
            >
              Acceso Admin
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
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

          {/* TARJETAS DE BENEFICIOS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
              <span className="text-2xl">🔒</span>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Cero Riesgo de Pago</h3>
              <p className="text-[11px] text-neutral-400 leading-snug">
                El cliente paga antes de que despaches. El dinero queda protegido en custodia en tu billetera.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
              <span className="text-2xl">⚡</span>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Liquidación Rápida</h3>
              <p className="text-[11px] text-neutral-400 leading-snug">
                Una vez entregado el pedido, retiras tus ganancias directas a Nequi, Bancolombia o Daviplata.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
              <span className="text-2xl">👑</span>
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Sello de Verificación</h3>
              <p className="text-[11px] text-neutral-400 leading-snug">
                Auditamos cada tienda para proteger la reputación y asegurar solo vendedores serios y productos originales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FORMULARIO DE REGISTRO */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {isSuccess ? (
          <div className="p-8 bg-[#111116] border border-amber-400/40 rounded-2xl text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="text-2xl font-serif font-bold text-white">¡Solicitud Recibida con Éxito!</h2>
            <p className="text-neutral-300 text-sm leading-relaxed max-w-md mx-auto">
              Tu boutique <strong className="text-amber-300">"{formData.store_name}"</strong> ha sido registrada en nuestro sistema de verificación.
            </p>
            <div className="p-4 bg-black/40 border border-white/10 rounded-xl text-left text-xs space-y-2 text-neutral-300">
              <p className="font-semibold text-white flex items-center gap-2">
                <span>🛡️</span> Proceso de Verificación de Seriedad:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-400 text-[11px]">
                <li>Revisaremos la información de tu boutique para garantizar la seriedad de tu catálogo.</li>
                <li>Te contactaremos al WhatsApp <strong>{formData.phone}</strong> para coordinar la activación.</li>
                <li>Una vez verificada, tus productos tendrán el sello oficial y podrás comenzar a vender.</li>
              </ul>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="bg-white text-black font-bold uppercase tracking-wider px-6 py-3 text-xs rounded hover:bg-neutral-200 transition-all text-center"
              >
                Volver a la Tienda Principal
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#111116] border border-white/10 p-6 sm:p-8 rounded-2xl space-y-6">
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
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="Ej: Milano Fragancias, King Sneakers, Urban Luxury..."
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Categoría Principal de Productos *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#111116] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Breve Descripción o Redes Sociales</label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos qué productos vendes, enlace a tu Instagram o experiencia comercial..."
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* SECCIÓN 2: TITULAR Y CONTACTO */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                2. Datos del Representante Legal / Titular
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre y Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="Tu nombre completo"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Cédula de Ciudadanía o NIT *</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_document}
                    onChange={(e) => setFormData({ ...formData, owner_document: e.target.value })}
                    placeholder="Número de documento de identidad"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">WhatsApp de Contacto Directo *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej: 3001234567"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Contraseña para tu Panel de Vendedor *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* SECCIÓN 3: ORIGEN DE DESPACHO */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                3. Ubicación desde donde despachas
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Departamento *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const cities = COLOMBIA_REGIONS[newDept] || ["Medellín"];
                      const firstCity = cities.find((c) => c !== "Otro Municipio / Corregimiento...") || "";
                      setIsCustomCity(false);
                      setCustomCityText("");
                      setFormData({ ...formData, department: newDept, city: firstCity });
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
                      (formData.city &&
                        !(COLOMBIA_REGIONS[formData.department] || [])
                          .filter((c) => c !== "Otro Municipio / Corregimiento...")
                          .includes(formData.city))
                        ? "Otro Municipio / Corregimiento..."
                        : formData.city
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Otro Municipio / Corregimiento...") {
                        setIsCustomCity(true);
                        setCustomCityText("");
                        setFormData({ ...formData, city: "" });
                      } else {
                        setIsCustomCity(false);
                        setCustomCityText("");
                        setFormData({ ...formData, city: val });
                      }
                    }}
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {(COLOMBIA_REGIONS[formData.department] || ["Otro Municipio / Corregimiento..."]).map((c) => (
                      <option key={c} value={c} className="bg-[#111116] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(isCustomCity || formData.city === "") && (
                <div>
                  <input
                    type="text"
                    required
                    value={customCityText}
                    onChange={(e) => {
                      setCustomCityText(e.target.value);
                      setFormData({ ...formData, city: e.target.value });
                    }}
                    placeholder="Escribe el nombre de tu municipio o corregimiento *"
                    className="w-full bg-[#0a0a0c] border border-amber-400/50 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            {/* SECCIÓN 4: CUENTA BANCARIA */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block border-b border-white/10 pb-1">
                4. Cuenta para recibir los pagos de tus ventas
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Entidad Bancaria *</label>
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {BANK_OPTIONS.map((b) => (
                      <option key={b} value={b} className="bg-[#111116] text-white">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Número de Cuenta / Teléfono Nequi *</label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Número de cuenta o celular Nequi"
                    className="w-full bg-[#0a0a0c] border border-white/15 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black py-4 text-xs font-bold uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? "Enviando Solicitud..." : "Postular Mi Boutique para Verificación"}
              </button>

              <p className="text-[10px] text-center text-neutral-400">
                Al postular tu boutique aceptas los estándares de autenticidad, seriedad comercial y tiempos de entrega estipulados por NERKLEY.
              </p>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
