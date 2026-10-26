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

declare global {
  interface Window {
    WidgetCheckout: any;
  }
}

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOpenWompi() {
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

      if (!window.WidgetCheckout) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.wompi.co/widget.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("No se pudo cargar el script de Wompi."));
          document.body.appendChild(script);
        });
      }

      const checkout = new window.WidgetCheckout({
        currency: payment.currency || "COP",
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

      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error al abrir la pasarela."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <button
        type="button"
        onClick={handleOpenWompi}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? "Abriendo Wompi..." : "Seleccionar y Pagar con Wompi"}
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