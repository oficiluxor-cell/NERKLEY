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

  async function handleStandardCheckout() {
    setLoading(true);
    setError("");

    try {
      // 1. Solicitamos el monto exacto, la referencia y la firma segura a tu API de Supabase
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

      // 2. Creamos dinámicamente un formulario POST hacia la pasarela oficial de pago de Wompi
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
      form.submit(); // Envía al usuario a Wompi con el monto automático y seguro
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al conectar con Wompi."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <button
        type="button"
        onClick={handleStandardCheckout}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <span>{loading ? "Calculando total y abriendo Wompi..." : "Pagar con Wompi (Automático)"}</span>
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center px-2">
          {error}
        </p>
      )}

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Monto exacto calculado por el sistema
      </p>
    </div>
  );
}