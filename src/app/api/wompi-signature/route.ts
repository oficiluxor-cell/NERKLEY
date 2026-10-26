import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Identificador de pedido inválido." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const publicKey = process.env.WOMPI_PUBLIC_KEY;

    if (!supabaseUrl || !serviceRoleKey || !integritySecret || !publicKey) {
      console.error("Falta configurar una variable de entorno.");
      return NextResponse.json(
        { error: "El servicio de pagos no está configurado." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Consultamos la tabla orders adaptada a tus columnas reales
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, reference, total_price, status")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "No se encontró el pedido." },
        { status: 404 }
      );
    }

    const currency = "COP";
    // Wompi exige el monto en centavos (multiplicado por 100)
    const amountInCents = Math.round(Number(order.total_price) * 100);

    const signature = createHash("sha256")
      .update(
        `${order.reference}${amountInCents}${currency}${integritySecret}`,
        "utf8"
      )
      .digest("hex");

    return NextResponse.json({
      publicKey,
      reference: order.reference,
      amountInCents,
      currency,
      signature,
    });
  } catch (error) {
    console.error("Error preparando el pago:", error);
    return NextResponse.json(
      { error: "No se pudo preparar el pago." },
      { status: 500 }
    );
  }
}