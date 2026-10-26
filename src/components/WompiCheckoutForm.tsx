"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId: string;
};

type PaymentData = {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [payment, setPayment] = useState<PaymentData | null>(null);

  // Apenas carga el componente, consultamos los datos seguros en la API
  useEffect(() => {
    async function loadPaymentData() {
      try {
        const res = await fetch("/api/wompi-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo obtener la información del pedido.");
        }

        setPayment(data);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al conectar con la base de datos.");
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadPaymentData();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="w-full py-4 text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-400 animate-pulse">
          Preparando pasarela segura...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full bg-red-50 border border-red-200 p-3 rounded text-center">
        <p className="text-xs text-red-600 font-bold">{errorMsg}</p>
      </div>
    );
  }

  if (!payment) return null;

  // Formulario HTML nativo hacia Wompi con PSE y todos los medios de pago habilitados
  return (
    <form
      action="https://checkout.wompi.co/p/"
      method="POST"
      className="w-full flex flex-col items-center justify-center space-y-3 py-2"
    >
      <input type="hidden" name="public-key" value={payment.publicKey} />
      <input type="hidden" name="currency" value={payment.currency || "COP"} />
      <input type="hidden" name="amount-in-cents" value={payment.amountInCents} />
      <input type="hidden" name="reference" value={payment.reference} />
      <input type="hidden" name="signature:integrity" value={payment.signature} />

      <button
        type="submit"
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
      >
        <span>Pagar con PSE / Tarjeta (Wompi)</span>
      </button>

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Incluye PSE, Nequi, Tarjetas y Bancolombia &bull; Transacción cifrada
      </p>
    </form>
  );
}