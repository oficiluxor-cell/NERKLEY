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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let integritySecret = process.env.WOMPI_INTEGRITY_SECRET?.trim();
    if (!integritySecret || integritySecret.includes("GJI5") || integritySecret.endsWith("9M71")) {
      integritySecret = "prod_integrity_CNGPJNqACancGJISOqQ1YsSwNxnx9M7l";
    }
    const publicKey = process.env.WOMPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

    if (!supabaseUrl || !serviceRoleKey || !integritySecret || !publicKey) {
      return NextResponse.json(
        { error: "Faltan credenciales del servidor para firmar la transacción." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error("Error consultando pedido para Wompi:", error);
      return NextResponse.json({ error: "No se encontró el pedido en la base de datos." }, { status: 404 });
    }

    const currency = "COP";
    const amountInCents = Math.round(Number(order.total_price) * 100);

    // Obtener o inferir la referencia única
    let reference = order.reference;
    if (!reference && order.product_name) {
      const match = order.product_name.match(/\[Ref:\s*([^\]]+)\]/);
      if (match) reference = match[1].trim();
    }
    if (!reference) {
      reference = `NRK-${String(order.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`;
    }

    // Fórmula oficial de Wompi: reference + amountInCents + currency + integritySecret
    const cleanSecret = integritySecret.trim();
    const signature = createHash("sha256")
      .update(`${reference}${amountInCents}${currency}${cleanSecret}`, "utf8")
      .digest("hex");

    return NextResponse.json({
      publicKey: publicKey.trim(),
      reference,
      amountInCents,
      currency,
      signature,
      totalPrice: Number(order.total_price),
      customerEmail: order.customer_email || "",
      customerName: order.customer_name || "",
      customerPhone: order.customer_phone || "",
      customerDocument: order.customer_document || "",
    });
  } catch (err) {
    console.error("Error en /api/wompi-signature:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno del servidor." },
      { status: 500 }
    );
  }
}
