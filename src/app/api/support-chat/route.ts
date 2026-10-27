import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Base de Conocimiento Experta NERKLEY
const NERKLEY_KNOWLEDGE = {
  storeName: "NERKLEY",
  concept: "Concept Store de Alto Lujo & Moda Urbana Exclusiva",
  categories: [
    "Perfumería de Autor y Diseñador (100% auténticos y nicho)",
    "Ropa Urbana & Haute Couture (Calidad 1.1 Top y originales)",
    "Calzado & Sneakers Exclusivos",
    "Gorras de Edición Limitada",
    "Joyería & Oro Laminado / 18k",
  ],
  shipping: {
    coverage: "Envíos asegurados a toda Colombia (ciudades principales y municipios).",
    time: "De 5 a 8 días hábiles a nivel nacional (ciudades principales de 4 a 7 días hábiles). Cada producto pasa por un estricto protocolo de inspección individual de calidad, autenticidad y embalaje blindado de lote antes del despacho para garantizar su estado óptimo.",
    carriers: "Interrapidísimo, Servientrega, Envía y Coordinadora con número de guía oficial.",
    cost: "Envío asegurado con seguimiento y guía oficial.",
  },
  payments: {
    methods: "Bancolombia, Nequi, PSE, Tarjetas de Crédito/Débito y Daviplata.",
    gateway: "Pasarela oficial blindada de Wompi (Grupo Bancolombia) con cifrado SHA-256.",
    security: "Precios fijos y sellados en centavos. 100% seguro sin riesgo de clonación.",
  },
  guarantee: {
    satisfaction: "Garantía de calidad en cada pieza. Empaque de seguridad sellado.",
    support: "Atención prioritaria y seguimiento en tiempo real con número de guía.",
  },
};

function buildSystemPrompt(products: any[], currentProduct?: any) {
  const productCatalogText = products
    .slice(0, 40)
    .map(
      (p) =>
        `- ${p.name} | Categoría: ${p.category} | Precio: $${Number(p.sale_price).toLocaleString()} COP${
          p.original_price ? ` (Antes: $${Number(p.original_price).toLocaleString()} COP)` : ""
        }${p.discount_percent ? ` | Descuento: ${p.discount_percent}%` : ""} | Stock: ${
          p.stock > 0 ? `${p.stock} unidades disponibles` : "Agotado"
        }${p.badge ? ` | Insignia: ${p.badge}` : ""}${p.sizes ? ` | Tallas: ${p.sizes}` : ""}${
          p.colors ? ` | Colores: ${p.colors}` : ""
        }`
    )
    .join("\n");

  let focusedProductContext = "";
  if (currentProduct) {
    focusedProductContext = `
EL CLIENTE ESTÁ VIENDO ACTUALMENTE ESTE PRODUCTO:
- Nombre: "${currentProduct.name}"
- Precio: $${Number(currentProduct.sale_price).toLocaleString()} COP
- Categoría: ${currentProduct.category}
- Tallas disponibles: ${currentProduct.sizes || "Talla Única / Estándar"}
- Colores: ${currentProduct.colors || "Según catálogo"}
- Stock: ${currentProduct.stock > 0 ? `${currentProduct.stock} unidades en bodega` : "Agotado temporalmente"}
- Descripción: ${currentProduct.description || "Producto exclusivo de colección NERKLEY"}
Si el usuario pregunta por "este producto", "la talla", "el envío de esto" o "los materiales", respóndele específicamente sobre este artículo de forma persuasiva y experta.
`;
  }

  return `Eres "NERKLEY AI", el Asesor y Concierge de Lujo Oficial de la tienda NERKLEY.
Tu rol es brindar atención al cliente 24/7, resolver todas las dudas de compra, recomendar productos del catálogo, dar detalles sobre envíos, pagos y tallas, y cerrar ventas para que el cliente no tenga que esperar atención humana.

TONO Y PERSONALIDAD:
- Sofisticado, educado, persuasivo, seguro y muy servicial.
- Hablas con elegancia moderna (estilo boutique de alta gama).
- Tratas al cliente con respeto ("Tú" cercano pero distinguido).
- Responde de forma clara, directa y atractiva, usando viñetas cuando sea útil.

CONOCIMIENTO DE LA TIENDA:
- Tienda: ${NERKLEY_KNOWLEDGE.storeName} (${NERKLEY_KNOWLEDGE.concept})
- Medios de pago: ${NERKLEY_KNOWLEDGE.payments.methods} a través de la pasarela segura oficial de Wompi.
- Envíos: ${NERKLEY_KNOWLEDGE.shipping.coverage} Tiempos: ${NERKLEY_KNOWLEDGE.shipping.time} Transportadoras: ${NERKLEY_KNOWLEDGE.shipping.carriers}.
- Garantía: Todas las compras incluyen empaque de protección y número de guía para rastreo.

${focusedProductContext}

CATÁLOGO EN TIEMPO REAL DE NERKLEY:
${productCatalogText}

REGLAS DE ORO:
1. Recomienda siempre productos que estén en el catálogo anterior con sus precios en COP.
2. POLÍTICA DE ENVÍOS Y TIEMPOS (MUY IMPORTANTE): NUNCA digas que llega en 24 o 48 horas. Vende la experiencia de exclusividad: Explica que en NERKLEY cada pieza pasa por un riguroso protocolo de inspección individual de autenticidad, verificación de lote y empaque blindado de protección (1 a 3 días hábiles) antes de ser entregado a la transportadora (3 a 5 días hábiles en ruta). El tiempo total estimado de entrega es de 5 a 8 días hábiles a nivel nacional (4 a 7 días hábiles en ciudades principales). Esto le asegura al cliente un artículo nuevo, verificado y 100% perfecto con guía de rastreo oficial.
3. Si el cliente pregunta cómo comprar, indícale que agregue el producto al carrito ("Agregar al Carrito") y presione "Proceder al Pago Seguro", donde la pasarela oficial Wompi le permitirá pagar al instante con Nequi, Bancolombia o tarjeta.
4. Si el cliente pregunta si es seguro, confirma que los pagos están 100% protegidos por Bancolombia / Wompi con cifrado SHA-256.
5. Mantén las respuestas concisas (máximo 2 a 3 párrafos cortos) para que sea rápido y persuasivo de leer en el celular.`;
}

// Motor de Inteligencia Asistente Local con fallback inteligente
function generateLocalAIResponse(userMessage: string, products: any[], currentProduct?: any): string {
  const msg = userMessage.toLowerCase().trim();

  // 1. Preguntas sobre el producto específico que está viendo
  if (currentProduct && (msg.includes("este") || msg.includes("talla") || msg.includes("material") || msg.includes("aroma") || msg.includes("original") || msg.includes("precio"))) {
    const isPerfume = (currentProduct.category || "").toLowerCase().includes("perfume");
    const isClothes = (currentProduct.category || "").toLowerCase().includes("ropa") || (currentProduct.category || "").toLowerCase().includes("gorra") || (currentProduct.category || "").toLowerCase().includes("zapato");

    if (msg.includes("talla") || msg.includes("medida")) {
      return `Para **${currentProduct.name}**, contamos con las siguientes opciones disponibles: **${currentProduct.sizes || "Talla estándar / única"}**.\n\nTe sugerimos pedir tu talla habitual, ya que el tallaje es estándar de corte premium. Puedes seleccionar tu talla directamente en la ficha del producto y añadirlo a tu carrito. ✨`;
    }

    if (msg.includes("precio") || msg.includes("cuanto cuesta") || msg.includes("valor")) {
      const priceText = `$${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP`;
      const originalText = currentProduct.original_price ? ` (antes en $${Number(currentProduct.original_price).toLocaleString("es-CO")} COP)` : "";
      return `El valor actual de **${currentProduct.name}** es de **${priceText}**${originalText}.\n\nIncluye empaque de protección exclusivo y garantía verificada de NERKLEY. ¿Deseas que te ayude a completar tu pedido?`;
    }

    if (msg.includes("original") || msg.includes("calidad") || msg.includes("1.1")) {
      return `En **NERKLEY** garantizamos la máxima calidad en cada pieza. ${
        isPerfume
          ? "Nuestros perfumes son esencias auténticas de alta concentración y fijación prolongada."
          : "Nuestra colección de moda urbana y accesorios cuenta con acabados 1.1 Top y materiales de confección idénticos a los estándares internacionales."
      }\n\nCada orden se despacha con sello de seguridad e inspección previa antes del envío.`;
    }
  }

  // 2. Preguntas sobre Envíos y Tiempos de Entrega
  if (msg.includes("envio") || msg.includes("envío") || msg.includes("cuanto tarda") || msg.includes("tiempo") || msg.includes("llega") || msg.includes("ciudad") || msg.includes("tarda") || msg.includes("demora")) {
    return `📦 **Protocolo de Envío & Tiempos de Entrega NERKLEY:**\n\nEn NERKLEY cada pieza pasa por un proceso de curaduría selecta para garantizar que recibas un producto 100% impecable:\n\n• **Fase 1 - Inspección & Embalaje de Seguridad:** (1 a 3 días hábiles) Verificación individual de autenticidad, acabados y sellado térmico de fábrica.\n• **Fase 2 - Tránsito Nacional Prioritario:** (3 a 5 días hábiles) Despacho directo asegurado con *Interrapidísimo, Servientrega o Coordinadora*.\n\n⏱ **Tiempo estimado total:** De **5 a 8 días hábiles** a nivel nacional (ciudades principales como Bogotá, Medellín, Cali y Barranquilla suelen tardar entre **4 y 7 días hábiles**).\n\n🔍 **Guía de Rastreo:** En cuanto tu lote sale a ruta, te notificamos con tu número de guía oficial para que sigas el estado de entrega en tiempo real.`;
  }

  // 3. Preguntas sobre Métodos de Pago
  if (msg.includes("pago") || msg.includes("pagar") || msg.includes("nequi") || msg.includes("bancolombia") || msg.includes("tarjeta") || msg.includes("pse") || msg.includes("contraentrega")) {
    return `💳 **Medios de Pago Disponibles:**\n\nPuedes pagar con total tranquilidad a través de la pasarela blindada oficial de **Wompi (Grupo Bancolombia)**:\n\n• **Nequi** (Notificación directa a tu app)\n• **Bancolombia** (Transferencia segura)\n• **PSE** (Cualquier banco de Colombia)\n• **Tarjetas de Crédito / Débito** (Visa, Mastercard, Amex)\n• **Daviplata**\n\nEl precio queda bloqueado y verificado en centavos contra alteraciones. Tu dinero está 100% protegido.`;
  }

  // 4. Preguntas sobre cómo comprar
  if (msg.includes("como comprar") || msg.includes("cómo comprar") || msg.includes("como hago") || msg.includes("comprar")) {
    return `Comprar en **NERKLEY** es muy rápido y seguro:\n\n1. Elige tu artículo favorito en nuestro catálogo y selecciona tu talla/color.\n2. Haz clic en **"Agregar al Carrito"**.\n3. Abre tu carrito y presiona **"Proceder al Pago Seguro"**.\n4. Llena tus datos de envío y elige tu medio de pago favorito (Nequi, Bancolombia, PSE o Tarjetas) en la pasarela oficial de Wompi.\n\n¡Inmediatamente confirmemos tu pago, nuestro equipo de logística preparará tu despacho! ✨`;
  }

  // 5. Preguntas sobre catálogo o recomendaciones
  if (msg.includes("que tienen") || msg.includes("catálogo") || msg.includes("catalogo") || msg.includes("recomienda") || msg.includes("productos") || msg.includes("perfume") || msg.includes("ropa") || msg.includes("gorra") || msg.includes("zapato") || msg.includes("oro")) {
    const featured = products.slice(0, 3);
    const list = featured
      .map((p) => `• **${p.name}** — $${Number(p.sale_price).toLocaleString("es-CO")} COP (${p.category})`)
      .join("\n");
    return `En **NERKLEY** somos una Concept Store exclusiva especializada en:\n\n💎 **Perfumería de Autor & Diseñador**\n👕 **Ropa Urbana & Moda 1.1 Top**\n👟 **Sneakers Exclusivos**\n🧢 **Gorras de Edición Limitada**\n👑 **Joyería & Oro**\n\nAlgunas piezas destacadas en stock hoy:\n${list}\n\n¿Buscas algo en específico para hoy?`;
  }

  // 6. Saludo
  if (msg.includes("hola") || msg.includes("buen") || msg.includes("buenas") || msg.includes("hey")) {
    return `¡Hola! Bienvenido a **NERKLEY**. ✨\n\nSoy tu Asesor Virtual de Inteligencia Artificial disponible 24/7. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tallas, disponibilidad de productos, métodos de pago con Wompi o tiempos de envío a tu ciudad.`;
  }

  // 7. Respuesta de cortesía por defecto
  return `Con gusto te asisto en **NERKLEY**. ¿Tienes alguna duda sobre nuestras prendas, perfumes, envíos a tu ciudad o medios de pago (Nequi, Bancolombia, PSE)?\n\nPuedes preguntarme con toda confianza y te orientaré de inmediato.`;
}

export async function POST(req: Request) {
  try {
    const { messages, currentProduct } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes inválidos." }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Consultar catálogo en vivo desde Supabase para que la IA siempre sepa qué hay en stock
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let products: any[] = [];
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey);
      const { data } = await supabase
        .from("products")
        .select("id, name, sale_price, original_price, discount_percent, category, stock, sizes, colors, badge, description")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(40);
      if (data) products = data;
    }

    // Verificar si hay una API Key de Gemini configurada
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (geminiApiKey) {
      try {
        const systemInstruction = buildSystemPrompt(products, currentProduct);
        const contents = messages.map((m: ChatMessage) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (geminiError) {
        console.warn("Fallo temporal en Gemini API, pasando al motor local:", geminiError);
      }
    }

    // Motor de IA Experta Local (Ultra Rápido, 0 latencia, siempre disponible sin límites de cuota)
    const reply = generateLocalAIResponse(lastUserMessage, products, currentProduct);
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Error en /api/support-chat:", err);
    return NextResponse.json(
      {
        reply:
          "¡Hola! Bienvenido a NERKLEY. Puedes realizar tus compras con envío asegurado a toda Colombia y pagar de forma 100% blindada a través de Wompi (Nequi, Bancolombia, PSE o Tarjetas). ¿Qué producto te gustaría conocer hoy?",
      },
      { status: 200 }
    );
  }
}
