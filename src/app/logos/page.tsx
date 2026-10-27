"use client";

import Link from "next/link";

export default function LogosPreviewPage() {
  const logos = [
    {
      id: "bag",
      title: "Opción 1: Bolsa de Boutique de Lujo (Recomendada)",
      desc: "Comunica TIENDA y COMPRAS al instante. Silueta de bolsa de boutique en negro obsidiana con asas en oro puro 24K, monograma N y etiqueta de autenticidad.",
      badge: "⭐ MÁS COMERCIAL PARA PLAY STORE",
      file: "/logo-shopping-bag.svg",
    },
    {
      id: "cart",
      title: "Opción 2: Carrito de Compras Royal E-Commerce",
      desc: "El símbolo universal de compras online con estructura geométrica en oro cepillado y monograma N integrado.",
      badge: "COMPRAS ONLINE & APP",
      file: "/logo-shopping-cart.svg",
    },
    {
      id: "box",
      title: "Opción 3: Caja de Empaque & Unboxing de Lujo",
      desc: "Caja de regalo y paquete de boutique isométrica sellada con cintas y lazo de oro líquido.",
      badge: "UNBOXING & EXCLUSIVIDAD",
      file: "/logo-luxury-box.svg",
    },
    {
      id: "option_a",
      title: "Opción 4: Monograma 'N' Facetado en Joya",
      desc: "Monograma tallado en diamante negro con bisel de oro pulido sobre negro profundo.",
      badge: "ALTA JOYERÍA & MARCA",
      file: "/nerkley_logo_option_a_1793073104599.jpg",
    },
    {
      id: "option_b",
      title: "Opción 5: Escudo Hexagonal de Titanio & Oro",
      desc: "Escudo con silueta N inscrita, estilo sello de garantía y autenticidad.",
      badge: "SELLO DE ALTA GAMA",
      file: "/nerkley_logo_option_b_1793073128352.jpg",
    },
    {
      id: "option_c",
      title: "Opción 6: Alta Costura Láser",
      desc: "Diseño minimalista estilo pasarela europea con corte arquitectónico.",
      badge: "ALTA COSTURA",
      file: "/nerkley_logo_option_c_1793073152213.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 md:p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-xs uppercase tracking-[0.3em] text-neutral-400 hover:text-white transition-colors block mb-2">
              &larr; Volver a NERKLEY Store
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif font-bold uppercase tracking-wider text-white">
              Galería de Logotipos &bull; Google Play Store
            </h1>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">
              Resolución cuadrada 512x512 px &bull; Diseñados para icono de app móvil y favicon web
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1.5 uppercase tracking-widest">
              6 Propuestas Listas
            </span>
          </div>
        </header>

        {/* Cuadrícula de Logos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {logos.map((logo, idx) => (
            <div
              key={logo.id}
              className="bg-[#111115] border border-white/10 hover:border-amber-400/50 transition-all p-6 space-y-5 flex flex-col justify-between group shadow-xl"
            >
              <div className="space-y-4">
                {/* Visualizador del Icono como si estuviera en la pantalla del celular */}
                <div className="w-full aspect-square bg-[#050507] border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center p-3 relative group-hover:scale-[1.02] transition-transform">
                  <img
                    src={logo.file}
                    alt={logo.title}
                    className="w-full h-full object-contain rounded-2xl shadow-2xl"
                  />
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold text-neutral-300 border border-white/10">
                    512 x 512
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    {logo.badge}
                  </span>
                  <h3 className="text-base font-bold text-white font-serif">{logo.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{logo.desc}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                  Opción 0{idx + 1}
                </span>
                <a
                  href={logo.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-all"
                >
                  Abrir HD &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
