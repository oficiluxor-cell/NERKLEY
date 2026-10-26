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
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<PaymentData | null>(null);

  useEffect(() => {
    async function fetchSignature() {
      try {
        const response = await fetch("/api/wompi-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setPayment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar pago.");
      } finally {
        setLoading(false);
      }
    }
    fetchSignature();
  }, [orderId]);

  if (loading) return <p className="text-xs text-center text-neutral-400 py-3">Cargando pasarela...</p>;
  if (error) return <p className="text-xs text-red-600 text-center">{error}</p>;
  if (!payment) return null;

  return (
    <form action="https://checkout.wompi.co/p/" method="GET" className="w-full space-y-3">
      <input type="hidden" name="public-key" value={payment.publicKey} />
      <input type="hidden" name="currency" value={payment.currency} />
      <input type="hidden" name="amount-in-cents" value={payment.amountInCents} />
      <input type="hidden" name="reference" value={payment.reference} />
      <input type="hidden" name="signature:integrity" value={payment.signature} />

      <button
        type="submit"
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer"
      >
        Seleccionar y Pagar con Wompi
      </button>

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </form>
  );
}