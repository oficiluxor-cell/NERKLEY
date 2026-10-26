"use client";

import { useState } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function preparePayment() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wompi-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo preparar el pago.");
      }

      const payment = data as PaymentData;

      // Usamos tu enlace de pago oficial de Wompi pasando el parámetro amount o amount-in-cents
      const wompiPaymentLink = `https://checkout.wompi.co/l/VPOS_f57eYA?amount=${encodeURIComponent(
        payment.amountInCents
      )}&reference=${encodeURIComponent(
        payment.reference
      )}&signature:integrity=${encodeURIComponent(payment.signature)}`;

      // Redirigimos al enlace de pago oficial
      window.location.href = wompiPaymentLink;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al preparar el pago."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={preparePayment}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? "Abriendo enlace de pago..." : "Proceder al Pago con Wompi"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center">
          {error}
        </p>
      )}
    </div>
  );
}