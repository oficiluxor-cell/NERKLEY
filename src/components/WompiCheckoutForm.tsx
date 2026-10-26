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

      // Construimos la URL de redirección exacta con los parámetros limpios para Wompi
      const wompiUrl = new URL("https://checkout.wompi.co/p/");
      wompiUrl.searchParams.append("public-key", payment.publicKey);
      wompiUrl.searchParams.append("currency", payment.currency);
      wompiUrl.searchParams.append("amount-in-cents", String(payment.amountInCents));
      wompiUrl.searchParams.append("reference", payment.reference);
      wompiUrl.searchParams.append("signature:integrity", payment.signature);

      // Redirigimos directamente
      window.location.href = wompiUrl.toString();
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