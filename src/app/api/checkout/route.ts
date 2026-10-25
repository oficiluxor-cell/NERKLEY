import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, orderId, customerData } = body;

    // Token de acceso oficial (puedes reemplazarlo aquí directamente si lo tienes a la mano)
    const accessToken = process.env.MP_ACCESS_TOKEN || "APP_USR-tu-access-token-aqui";

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: items.map((item: any) => ({
          id: item.product_id,
          title: item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          currency_id: "COP",
        })),
        payer: {
          name: customerData.fullName,
          email: customerData.email,
          phone: {
            number: customerData.phone,
          },
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/success?order_id=${orderId}`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/`,
        },
        auto_return: "approved",
        external_reference: orderId,
      },
    });

    return NextResponse.json({ url: response.init_point });
  } catch (error: any) {
    console.error("Error en Mercado Pago:", error);
    return NextResponse.json({ error: error.message || "Error al procesar el pago" }, { status: 500 });
  }
}