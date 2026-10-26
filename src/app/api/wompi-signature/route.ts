import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Falta el ID del pedido." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const publicKey = process.env.WOMPI_PUBLIC_KEY;

    if (!supabaseUrl || !serviceRoleKey || !integritySecret || !publicKey) {
      return NextResponse.json({ error: "Faltan credenciales en el servidor." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, reference, total_price")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "No se encontró el pedido en la base de datos." }, { status: 404 });
    }

    const currency = "COP";
    const amountInCents = Math.round(Number(order.total_price) * 100);

    const signature = createHash("sha256")
      .update(`${order.reference}${amountInCents}${currency}${integritySecret}`, "utf8")
      .digest("hex");

    return NextResponse.json({
      publicKey,
      reference: order.reference,
      amountInCents,
      currency,
      signature,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno." },
      { status: 500 }
    );
  }
}