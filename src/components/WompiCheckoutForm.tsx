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

      // El Web Checkout estándar de Wompi /p/ recibe el monto directo en pesos (amount-in-cents / 100) o el valor entero
      const amountInPesos = Math.round(payment.amountInCents / 100);

      const wompiCheckoutUrl = `https://checkout.wompi.co/p/?public-key=${encodeURIComponent(
        payment.publicKey
      )}&currency=${encodeURIComponent(
        payment.currency
      )}&amount-in-cents=${encodeURIComponent(
        payment.amountInCents
      )}&reference=${encodeURIComponent(
        payment.reference
      )}&signature:integrity=${encodeURIComponent(payment.signature)}`;

      window.location.href = wompiCheckoutUrl;
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
        {loading ? "Preparando pago seguro..." : "Proceder al Pago con Wompi"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center">
          {error}
        </p>
      )}
    </div>
  );
}