"use client";

import { useState } from "react";

type Props = {
  orderId: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePayment() {
    setLoading(true);
    setError("");

    try {
      console.log("Enviando orderId a la API:", orderId);

      const response = await fetch("/api/wompi-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      console.log("Respuesta de la API de firma:", data);

      if (!response.ok) {
        throw new Error(data.error || "No se pudo generar la firma de pago.");
      }

      if (!data.publicKey || !data.amountInCents || !data.reference || !data.signature) {
        throw new Error("La API respondió pero faltan datos esenciales para Wompi.");
      }

      // Creamos el formulario POST con los datos reales verificados
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://checkout.wompi.co/p/";

      const fields: Record<string, string> = {
        "public-key": data.publicKey,
        currency: data.currency || "COP",
        "amount-in-cents": String(data.amountInCents),
        reference: data.reference,
        "signature:integrity": data.signature,
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
      console.error("Error en handlePayment:", err);
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
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? "Conectando con Wompi..." : "Pagar con Wompi Ahora"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center px-2">
          {error}
        </p>
      )}

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </div>
  );
}