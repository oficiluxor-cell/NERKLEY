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

  async function handlePaymentRedirect() {
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
        throw new Error(data.error || "No se pudo preparar la pasarela de pago.");
      }

      const payment = data as PaymentData;

      // Creamos el formulario POST oficial que procesa la pasarela estándar de Wompi de producción
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://checkout.wompi.co/p/";

      const fields: Record<string, string> = {
        "public-key": payment.publicKey,
        currency: payment.currency || "COP",
        "amount-in-cents": String(payment.amountInCents),
        reference: payment.reference,
        "signature:integrity": payment.signature,
      };

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al procesar el pago."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <button
        type="button"
        onClick={handlePaymentRedirect}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <span>{loading ? "Conectando con Wompi..." : "Seleccionar y Pagar con Wompi"}</span>
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center px-2">
          {error}
        </p>
      )}

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pago seguro y cifrado con Wompi
      </p>
    </div>
  );
}