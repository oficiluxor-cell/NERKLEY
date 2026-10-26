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
  const [errorMsg, setErrorMsg] = useState("");

  async function handlePayment() {
    setLoading(true);
    setErrorMsg("");

    try {
      console.log("Enviando orderId a la API:", orderId);
      
      const res = await fetch("/api/wompi-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      console.log("Respuesta de la API:", data);

      if (!res.ok) {
        throw new Error(data.error || "Error al conectar con la base de datos.");
      }

      const payment = data as PaymentData;

      if (!payment.publicKey || !payment.reference || !payment.amountInCents) {
        throw new Error("La API respondió pero faltan datos obligatorios.");
      }

      // Creamos y enviamos el formulario con los datos reales
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://checkout.wompi.co/p/";

      const payload: Record<string, string> = {
        "public-key": payment.publicKey,
        currency: payment.currency || "COP",
        "amount-in-cents": String(payment.amountInCents),
        reference: payment.reference,
        "signature:integrity": payment.signature,
      };

      for (const [key, value] of Object.entries(payload)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Error en el pago:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado al procesar.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <span>{loading ? "Conectando con Wompi..." : "Pagar con Wompi"}</span>
      </button>

      {errorMsg && (
        <div className="w-full bg-red-50 border border-red-200 p-2 rounded text-center">
          <p className="text-xs text-red-600 font-bold">{errorMsg}</p>
        </div>
      )}

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </div>
  );
}