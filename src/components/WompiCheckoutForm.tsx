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

  async function handleOpenWompiModal() {
    setLoading(true);
    setError("");

    try {
      // 1. Solicitamos los datos seguros y la firma al servidor
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

      // 2. Verificamos si el script oficial del widget de Wompi ya está cargado, si no, lo inyectamos
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

      // 3. Inicializamos el Widget oficial de Wompi en un modal flotante
      const checkout = new window.WidgetCheckout({
        currency: payment.currency || "COP",
        amountInCents: payment.amountInCents,
        reference: payment.reference,
        publicKey: payment.publicKey,
        signature: {
          integrity: payment.signature,
        },
      });

      // 4. Abrimos el modal de pagos de forma interactiva
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
        err instanceof Error ? err.message : "Ocurrió un error al abrir el pago."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      {/* Botón de selección de pasarela limpio en el checkout */}
      <button
        type="button"
        onClick={handleOpenWompiModal}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <span>{loading ? "Abriendo pasarela..." : "Seleccionar y Pagar con Wompi"}</span>
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