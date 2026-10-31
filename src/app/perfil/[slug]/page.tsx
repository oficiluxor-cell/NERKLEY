"use client";

import { Suspense } from "react";
import TiendaPage from "@/app/tienda/[slug]/page";

export default function PerfilPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
          Cargando Perfil Oficial NERKLEY...
        </div>
      }
    >
      <TiendaPage params={params} />
    </Suspense>
  );
}
