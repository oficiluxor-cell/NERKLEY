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

// Declaración global para que TypeScript reconozca el script de Wompi
declare global {
  interface Window {
    WidgetCheckout: any;
  }
}

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleWompiPayment() {
    setLoading(true);
    setError("");

    try {
      // 1. Solicitamos la firma y los datos seguros al servidor
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

      // 2. Verificamos que el script de Wompi esté cargado, si no, lo inyectamos dinámicamente
      if (!window.WidgetCheckout) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.wompi.co/widget.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("No se pudo cargar la pasarela de Wompi."));
          document.body.appendChild(script);
        });
      }

      // 3. Abrimos el Checkout Widget oficial de Wompi
      const checkout = new window.WidgetCheckout({
        currency: payment.currency,
        amountInCents: payment.amountInCents,
        reference: payment.reference,
        publicKey: payment.publicKey,
        signature: {
          integrity: payment.signature,
        },
      });

      checkout.open((result: { transaction: { status: string; id: string } }) => {
        const transaction = result.transaction;
        if (transaction && transaction.status === "APPROVED") {
          window.location.href = `/success?id=${transaction.id}`;
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar el pago."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={handleWompiPayment}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? "Abriendo pasarela..." : "Proceder al Pago con Wompi"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600 font-semibold text-center">
          {error}
        </p>
      )}
    </div>
  );
}