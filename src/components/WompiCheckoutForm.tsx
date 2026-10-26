"use client";

import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  useEffect(() => {
    async function fetchSignature() {
      try {
        const response = await fetch("/api/wompi-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "No se pudo obtener la firma de pago.");
        }

        setPaymentData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al preparar el botón de pago."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSignature();
  }, [orderId]);

  useEffect(() => {
    if (!paymentData) return;

    const container = document.getElementById("wompi-widget-container");
    if (container) {
      container.innerHTML = "";

      // Creamos el formulario exacto que indica la documentación oficial de Wompi para el Widget
      const form = document.createElement("form");
      const script = document.createElement("script");

      script.src = "https://checkout.wompi.co/widget.js";
      script.async = true;
      script.setAttribute("data-render", "button");
      script.setAttribute("data-public-key", paymentData.publicKey);
      script.setAttribute("data-currency", paymentData.currency);
      script.setAttribute("data-amount-in-cents", String(paymentData.amountInCents));
      script.setAttribute("data-reference", paymentData.reference);
      script.setAttribute("data-signature:integrity", paymentData.signature);

      form.appendChild(script);
      container.appendChild(form);
    }
  }, [paymentData]);

  if (loading) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-400 animate-pulse">
          Preparando pasarela segura...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-xs text-red-600 font-semibold text-center px-2">
        {error}
      </p>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      {/* Contenedor donde Wompi inyectará su botón oficial interactivo */}
      <div id="wompi-widget-container" className="w-full flex justify-center"></div>

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </div>
  );
}