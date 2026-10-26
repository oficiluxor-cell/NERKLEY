"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function SuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("id");
  const orderIdParam = searchParams.get("order_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateOrderStatus = async () => {
      if (typeof window !== "undefined") {
        try {
          // 1. Limpiar el carrito de compras local ya que se pagó con éxito
          localStorage.removeItem("NERKLEY_cart");

          // 2. Si recibimos order_id en la URL, actualizar directamente esa orden a Pagado
          if (orderIdParam) {
            const { data: orderData } = await supabase
              .from("orders")
              .select("id, notes")
              .eq("id", orderIdParam)
              .single();

            if (orderData) {
              const currentNotes = orderData.notes || "";
              await supabase
                .from("orders")
                .update({
                  status: "Pagado",
                  notes: `${currentNotes}\nID Transacción Wompi: ${transactionId || "Aprobado"}`,
                })
                .eq("id", orderIdParam);
            }
          }

          // 3. Fallback: Recuperar la orden pendiente guardada localmente
          const pendingOrderString = localStorage.getItem("NERKLEY_pending_order");
          if (pendingOrderString) {
            const pendingOrder = JSON.parse(pendingOrderString);

            const { data: existingOrders } = await supabase
              .from("orders")
              .select("id, notes")
              .eq("customer_email", pendingOrder.customer_email)
              .or("status.eq.pending,status.eq.Pendiente de Pago")
              .order("id", { ascending: false })
              .limit(1);

            if (existingOrders && existingOrders.length > 0) {
              const orderId = existingOrders[0].id;
              const currentNotes = existingOrders[0].notes || "";

              await supabase
                .from("orders")
                .update({
                  status: "Pagado",
                  notes: `${currentNotes}\nID Transacción Wompi: ${transactionId || "Aprobado"}`,
                })
                .eq("id", orderId);
            }

            localStorage.removeItem("NERKLEY_pending_order");
          }
        } catch (e) {
          console.error("Error al actualizar la orden en Supabase:", e);
        }
      }
      setLoading(false);
    };

    const timer = setTimeout(() => {
      updateOrderStatus();
    }, 800);

    return () => clearTimeout(timer);
  }, [orderIdParam, transactionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
        <div className="text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
          Actualizando estado de tu orden en NERKLEY...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 font-sans flex flex-col selection:bg-black selection:text-white">
      <header className="border-b border-neutral-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-center items-center">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl font-serif font-bold tracking-[0.3em] uppercase">NERKLEY</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white p-10 md:p-16 max-w-xl w-full border border-neutral-200 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <span className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-semibold block">
            Pago Exitoso &bull; Orden Actualizada
          </span>
          <h1 className="text-3xl font-serif uppercase tracking-wider text-neutral-900 font-semibold">
            ¡Gracias por tu compra!
          </h1>

          <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 p-4 border border-neutral-100">
            Tu pago ha sido procesado exitosamente y el estado en tu panel administrativo se ha actualizado a{" "}
            <span className="font-bold text-emerald-600 uppercase">Pagado</span>. En breve prepararemos tu envío.
          </p>

          {transactionId && (
            <p className="text-xs text-neutral-500 font-mono">
              Comprobante Wompi: <span className="font-semibold text-black">{transactionId}</span>
            </p>
          )}

          <div className="pt-6">
            <Link
              href="/"
              className="inline-block w-full bg-black text-white py-4 text-xs font-semibold uppercase tracking-[0.25em] hover:bg-neutral-800 transition-all shadow-md active:scale-98"
            >
              Volver a la Tienda
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400 uppercase tracking-widest bg-white">
        &copy; {new Date().getFullYear()} NERKLEY STORES. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-400 animate-pulse">
            Cargando pasarela de NERKLEY...
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
