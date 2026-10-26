"use client";

type Props = {
  orderId?: string;
};

export default function WompiCheckoutForm({ orderId }: Props) {
  const wompiLink = "https://checkout.wompi.co/l/VPOS_f57eYA";

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3 py-2">
      <a
        href={wompiLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 text-center"
      >
        <span>Pagar en Wompi (Seguro)</span>
      </a>

      {orderId && (
        <p className="text-[10px] text-neutral-500 text-center">
          Referencia de pedido: <span className="font-mono font-bold">{orderId}</span>
        </p>
      )}

      <p className="text-[9px] text-neutral-400 uppercase tracking-widest text-center">
        Pasarela oficial Wompi &bull; Transacción cifrada
      </p>
    </div>
  );
}
