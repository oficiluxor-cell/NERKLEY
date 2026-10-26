"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId?: string;
};

type PaymentData = {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  totalPrice: number;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerDocument?: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Cargar automáticamente los datos de la orden y la firma de integridad del backend
  const fetchSignature = async () => {
    if (!orderId) {
      setErrorMsg("No se proporcionó el identificador del pedido.");
      setFetchingData(false);
      return;
    }

    setFetchingData(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/wompi-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo preparar el pago seguro.");
      }

      setPaymentData(data as PaymentData);
    } catch (err) {
      console.error("Error al preparar firma Wompi:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Error al conectar con la pasarela de pagos."
      );
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    fetchSignature();
  }, [orderId]);

  // Ejecutar el pago con monto fijo e inmodificable
  const handlePay = () => {
    if (!paymentData) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const returnUrl = `${window.location.origin}/success?order_id=${orderId}`;

      // 1. Intentar abrir con el Widget interactivo oficial de Wompi si está cargado
      if (typeof (window as any).WidgetCheckout === "function") {
        const checkout = new (window as any).WidgetCheckout({
          currency: paymentData.currency || "COP",
          amountInCents: paymentData.amountInCents,
          reference: paymentData.reference,
          publicKey: paymentData.publicKey,
          signature: {
            integrity: paymentData.signature,
          },
          redirectUrl: returnUrl,
          customerData: {
            email: paymentData.customerEmail,
            fullName: paymentData.customerName,
            phoneNumber: paymentData.customerPhone,
            phoneNumberPrefix: "+57",
            legalId: paymentData.customerDocument,
            legalIdType: "CC",
          },
        });

        checkout.open(function (result: any) {
          const transaction = result?.transaction;
          if (
            transaction &&
            (transaction.status === "APPROVED" || transaction.status === "PENDING")
          ) {
            window.location.href = `${returnUrl}&id=${transaction.id}`;
          } else {
            setLoading(false);
          }
        });
        return;
      }

      // 2. Si el script no está disponible (adblocker, etc.), redireccionar de forma segura mediante GET
      const form = document.createElement("form");
      form.method = "GET";
      form.action = "https://checkout.wompi.co/p/";

      const params: Record<string, string> = {
        "public-key": paymentData.publicKey,
        currency: paymentData.currency || "COP",
        "amount-in-cents": String(paymentData.amountInCents),
        reference: paymentData.reference,
        "signature:integrity": paymentData.signature,
        "redirect-url": returnUrl,
      };

      if (paymentData.customerEmail) params["customer-data:email"] = paymentData.customerEmail;
      if (paymentData.customerName) params["customer-data:full-name"] = paymentData.customerName;
      if (paymentData.customerPhone) {
        params["customer-data:phone-number"] = paymentData.customerPhone;
        params["customer-data:phone-number-prefix"] = "+57";
      }
      if (paymentData.customerDocument) {
        params["customer-data:legal-id"] = paymentData.customerDocument;
        params["customer-data:legal-id-type"] = "CC";
      }

      for (const [key, val] of Object.entries(params)) {
        if (val) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("Error al abrir Wompi:", err);
      setErrorMsg("No fue posible abrir la pasarela. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="w-full py-6 flex flex-col items-center justify-center space-y-2">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] uppercase tracking-widest text-neutral-500">
          Asegurando monto y firma oficial Wompi...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full bg-red-50 border border-red-200 p-4 text-center space-y-3">
        <p className="text-xs text-red-700 font-semibold">{errorMsg}</p>
        <button
          type="button"
          onClick={fetchSignature}
          className="bg-black text-white px-4 py-2 text-[10px] uppercase font-bold tracking-wider hover:bg-neutral-800 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!paymentData) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 py-2">
      {/* Resumen del Monto Bloqueado */}
      <div className="w-full bg-neutral-50 border border-neutral-200 p-4 text-center space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
          Monto Exacto a Pagar (No editable)
        </span>
        <p className="text-2xl font-bold text-black font-mono">
          $ {paymentData.totalPrice.toLocaleString("es-CO")} COP
        </p>
        <p className="text-[10px] text-neutral-400 font-mono">
          Ref: {paymentData.reference}
        </p>
      </div>

      {/* Botón Principal de Pago Seguro */}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-black text-white py-4 px-6 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
            <span>Abriendo pasarela segura...</span>
          </>
        ) : (
          <span>Pagar con Wompi ($ {paymentData.totalPrice.toLocaleString("es-CO")} COP)</span>
        )}
      </button>

      {/* Métodos Aceptados e Integridad */}
      <div className="w-full text-center space-y-1.5 pt-1">
        <p className="text-[10px] font-semibold text-neutral-700 uppercase tracking-wider">
          Bancolombia &bull; Nequi &bull; PSE &bull; Tarjetas Débito / Crédito
        </p>
        <p className="text-[9px] text-emerald-700 bg-emerald-50 py-1 px-2 border border-emerald-200 uppercase tracking-widest inline-block font-semibold">
          ✓ Monto 100% Blindado con Firma Criptográfica SHA-256
        </p>
      </div>
    </div>
  );
}
