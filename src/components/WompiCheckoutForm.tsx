"use client";

import { useState } from "react";

type Props = {
  orderId: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(false);

  function handleDirectPayment() {
    setLoading(true);
    // Redirección directa al enlace de pago oficial de Wompi de tu tienda NERKLEY
    window.location.href = "https://checkout.wompi.co/l/FeML2C";
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <button
        type="button"
        onClick={handleDirectPayment}
        disabled={loading}
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <span>{loading ? "Abriendo Wompi..." : "Pagar con Wompi"}</span>
      </button>

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción segura
      </p>
    </div>
  );
}