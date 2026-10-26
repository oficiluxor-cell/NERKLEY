"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

    // Limpiamos cualquier botón previo si existiera
    const container = document.getElementById("wompi-button-container");
    if (container) {
      container.innerHTML = "";

      // Creamos el formulario y el script oficial del botón de Wompi
      const form = document.createElement("form");

      const script = document.createElement("script");
      script.src = "https://checkout.wompi.co/widget.js";
      script.setAttribute("data-public-key", paymentData.publicKey);
      script.setAttribute("data-currency", paymentData.currency);
      script.setAttribute("data-amount-in-cents", String(paymentData.amountInCents));
      script.setAttribute("data-reference", paymentData.reference);
      script.setAttribute("data-signature:integrity", paymentData.signature);
      script.setAttribute("data-redirect-url", window.location.origin + "/success");

      form.appendChild(script);
      container.appendChild(form);
    }
  }, [paymentData]);

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-500 animate-pulse">
          Generando botón de pago seguro...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-xs text-red-600 font-semibold text-center">
        {error}
      </p>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      {/* Contenedor donde Wompi inyectará su botón oficial nativo */}
      <div id="wompi-button-container" className="w-full flex justify-center"></div>
      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </div>
  );
}