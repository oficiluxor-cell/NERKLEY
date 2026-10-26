import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const event = body.event;
    const tx = body.data?.transaction;

    if (!tx) {
      return NextResponse.json({ message: "Payload no reconocido" }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Faltan variables de Supabase para Wompi Webhook");
      return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const reference = tx.reference;
    const txStatus = tx.status;
    const txId = tx.id;
    const paymentMethod = tx.payment_method_type || "Wompi";

    console.log(`[Wompi Webhook] Evento: ${event}, Ref: ${reference}, Status: ${txStatus}, TxId: ${txId}`);

    if (reference) {
      // Buscar la orden por reference o dentro del product_name/notes
      const { data: order } = await supabase
        .from("orders")
        .select("id, status, notes")
        .or(`reference.eq.${reference},notes.ilike.%${reference}%,product_name.ilike.%${reference}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (order) {
        let newStatus = order.status;
        if (txStatus === "APPROVED") {
          newStatus = "Pagado / En Preparación";
        } else if (txStatus === "DECLINED") {
          newStatus = "Cancelado";
        }

        const currentNotes = order.notes || "";
        const txNote = `\n[Wompi] ID: ${txId} | Estado: ${txStatus} | Medio: ${paymentMethod}`;
        const updatedNotes = currentNotes.includes(txId) ? currentNotes : `${currentNotes}${txNote}`;

        await supabase
          .from("orders")
          .update({
            status: newStatus,
            notes: updatedNotes,
          })
          .eq("id", order.id);

        console.log(`[Wompi Webhook] Orden ${order.id} actualizada a: ${newStatus}`);
      } else {
        console.warn(`[Wompi Webhook] No se encontró orden para ref: ${reference}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Wompi Webhook Error]:", err);
    return NextResponse.json({ error: err.message || "Error procesando webhook" }, { status: 500 });
  }
}
