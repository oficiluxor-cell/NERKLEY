"use client";

import { use, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function PerfilRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    if (resolvedParams?.slug) {
      router.replace(`/tienda/${encodeURIComponent(resolvedParams.slug)}`);
    }
  }, [resolvedParams?.slug, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
      Cargando Perfil Oficial NERKLEY...
    </div>
  );
}

export default function PerfilPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
          Cargando Perfil Oficial NERKLEY...
        </div>
      }
    >
      <PerfilRedirect params={params} />
    </Suspense>
  );
}
