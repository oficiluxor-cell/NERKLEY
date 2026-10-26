"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId?: string;
};

type PaymentData = {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  totalPrice: number;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerDocument?: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const [redirecting, setRedirecting] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSignature = async () => {
    if (!orderId) {
      setErrorMsg("No se proporcionó el identificador del pedido.");
      setFetchingData(false);
      return;
    }

    setFetchingData(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/wompi-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo preparar el pago seguro.");
      }

      setPaymentData(data as PaymentData);
    } catch (err) {
      console.error("Error al preparar firma Wompi:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Error al conectar con la pasarela de pagos."
      );
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    fetchSignature();
  }, [orderId]);

  // Redirección directa y a pantalla completa a la pasarela oficial de Wompi (sin ventanas flotantes)
  const handleProceedToPayment = () => {
    if (!paymentData) return;

    setRedirecting(true);
    setErrorMsg("");

    try {
      if (orderId && typeof window !== "undefined") {
        localStorage.setItem("NERKLEY_pending_order_id", orderId);
      }

      const returnUrl = `${window.location.origin}/success?order_id=${orderId || ""}&ref=${paymentData.reference}`;

      // Limpieza y validación de datos de cliente
      const cleanPhone = (paymentData.customerPhone || "").replace(/\D/g, "");
      const cleanDoc = (paymentData.customerDocument || "").replace(/\D/g, "");

      // Redirección nativa oficial GET a checkout.wompi.co/p/
      const form = document.createElement("form");
      form.method = "GET";
      form.action = "https://checkout.wompi.co/p/";

      const params: Record<string, string> = {
        "public-key": paymentData.publicKey,
        currency: paymentData.currency || "COP",
        "amount-in-cents": String(paymentData.amountInCents),
        reference: paymentData.reference,
        "signature:integrity": paymentData.signature,
        "redirect-url": returnUrl,
      };

      if (paymentData.customerEmail?.trim()) {
        params["customer-data:email"] = paymentData.customerEmail.trim();
      }
      if (paymentData.customerName?.trim()) {
        params["customer-data:full-name"] = paymentData.customerName.trim();
      }
      if (cleanPhone.length >= 7) {
        params["customer-data:phone-number"] = cleanPhone;
        params["customer-data:phone-number-prefix"] = "+57";
      }
      if (cleanDoc.length >= 5) {
        params["customer-data:legal-id"] = cleanDoc;
        params["customer-data:legal-id-type"] = "CC";
      }

      for (const [key, val] of Object.entries(params)) {
        if (val) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Error al redirigir a Wompi:", err);
      setErrorMsg("Ocurrió un problema al abrir la pasarela. Intenta de nuevo.");
      setRedirecting(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-medium">
          Preparando pasarela segura...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/30 p-4 text-center space-y-3">
        <p className="text-xs text-red-300 font-semibold">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchSignature}
          className="bg-white text-black px-5 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-neutral-200 transition-all cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!paymentData) return null;

  return (
    <div className="w-full flex flex-col items-center space-y-5 py-2 text-left">
      {/* Tarjeta de Resumen Estética */}
      <div className="w-full bg-white/5 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Resumen de Facturación
          </span>
          <span className="text-[10px] font-mono font-bold text-neutral-200 bg-[#111115] px-2 py-0.5 border border-white/10">
            {paymentData.reference}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-neutral-300 uppercase tracking-wider">Total a Pagar</span>
            <span className="text-xl font-bold text-white font-mono">
              $ {paymentData.totalPrice.toLocaleString("es-CO")} <span className="text-xs font-normal">COP</span>
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 italic">
            * Monto verificado y bloqueado contra alteraciones
          </p>
        </div>

        {/* Canales de Pago Disponibles */}
        <div className="pt-2 border-t border-white/10">
          <span className="text-[9px] uppercase tracking-widest text-neutral-400 block mb-2 font-medium">
            Medios habilitados en Wompi:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {["Bancolombia", "Nequi", "PSE", "Tarjetas", "Daviplata"].map((method) => (
              <span
                key={method}
                className="text-[9px] font-semibold uppercase tracking-wider bg-[#111115] text-neutral-300 border border-white/10 px-2.5 py-1 rounded-xs"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Botón Principal Estético a Pantalla Completa */}
      <button
        type="button"
        onClick={handleProceedToPayment}
        disabled={redirecting}
        className="w-full bg-white text-black py-4 px-6 text-xs font-bold uppercase tracking-[0.25em] hover:bg-neutral-200 transition-all shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-3 active:scale-[0.99] group"
      >
        {redirecting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Redirigiendo a Wompi Seguro...</span>
          </>
        ) : (
          <>
            <span>Ir a Pagar en Wompi</span>
            <span className="transition-transform group-hover:translate-x-1 font-serif text-sm">&rarr;</span>
          </>
        )}
      </button>

      {/* Sello de Garantía y Seguridad */}
      <div className="w-full flex items-center justify-center gap-2 text-[10px] text-neutral-400 uppercase tracking-widest pt-1">
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
        <span>Pasarela Oficial Wompi &bull; Cifrado SHA-256</span>
      </div>
    </div>
  );
}
