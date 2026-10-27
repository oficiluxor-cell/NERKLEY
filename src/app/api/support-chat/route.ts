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

function getProductType(name = "", category = ""): "perfume" | "footwear" | "clothing" | "cap" | "jewelry" | "general" {
  const text = `${category} ${name}`.toLowerCase();
  if (
    text.includes("perfume") ||
    text.includes("fragancia") ||
    text.includes("locion") ||
    text.includes("loción") ||
    text.includes("parfum") ||
    text.includes("colonia") ||
    text.includes("aroma") ||
    text.includes("eau de") ||
    text.includes("elixir")
  ) {
    return "perfume";
  }
  if (
    text.includes("zapato") ||
    text.includes("sneaker") ||
    text.includes("tenis") ||
    text.includes("calzado") ||
    text.includes("retro") ||
    text.includes("jordan") ||
    text.includes("dunk") ||
    text.includes("bota")
  ) {
    return "footwear";
  }
  if (text.includes("gorra") || text.includes("cap") || text.includes("beanie") || text.includes("sombrero")) {
    return "cap";
  }
  if (
    text.includes("joya") ||
    text.includes("oro") ||
    text.includes("cadena") ||
    text.includes("reloj") ||
    text.includes("pulsera") ||
    text.includes("anillo") ||
    text.includes("dije")
  ) {
    return "jewelry";
  }
  if (
    text.includes("ropa") ||
    text.includes("camisa") ||
    text.includes("camiseta") ||
    text.includes("hoodie") ||
    text.includes("buzo") ||
    text.includes("pantalon") ||
    text.includes("pantalón") ||
    text.includes("short") ||
    text.includes("chaqueta")
  ) {
    return "clothing";
  }
  return "general";
}

function buildSystemPrompt(products: any[], currentProduct?: any) {
  const productCatalogText = products
    .slice(0, 40)
    .map(
      (p) =>
        `- ${p.name} | Categoría: ${p.category} | Precio: $${Number(p.sale_price).toLocaleString()} COP${
          p.original_price ? ` (Antes: $${Number(p.original_price).toLocaleString()} COP)` : ""
        }${p.discount_percent ? ` | Descuento: ${p.discount_percent}%` : ""} | Stock: ${
          p.stock > 0 ? `${p.stock} unidades disponibles` : "Agotado"
        }${p.badge ? ` | Insignia: ${p.badge}` : ""}${p.sizes ? ` | Especificación/Tallas/Presentación: ${p.sizes}` : ""}${
          p.colors ? ` | Color/Tono: ${p.colors}` : ""
        }`
    )
    .join("\n");

  let focusedProductContext = "";
  if (currentProduct) {
    const productType = getProductType(currentProduct.name, currentProduct.category);
    focusedProductContext = `
EL CLIENTE ESTÁ VIENDO ACTUALMENTE ESTE PRODUCTO:
- Nombre: "${currentProduct.name}"
- Precio: $${Number(currentProduct.sale_price).toLocaleString()} COP
- Categoría detectada: ${currentProduct.category} (Tipo: ${productType.toUpperCase()})
- Presentación / Talla / Medida: ${currentProduct.sizes || "Estándar"}
- Color / Acabado: ${currentProduct.colors || "Según catálogo"}
- Stock: ${currentProduct.stock > 0 ? `${currentProduct.stock} unidades disponibles` : "Agotado"}
- Descripción: ${currentProduct.description || "Pieza exclusiva de colección NERKLEY"}

ADAPTACIÓN ESTRICTA AL CONTEXTO DE PRODUCTO:
- Si es PERFUME: NUNCA menciones "tallas" ni "tela". Los perfumes se manejan por volumen en mililitros (${currentProduct.sizes || "100ml / Eau de Parfum"}), notas olfativas, fijación en piel (8 a 12 horas), atomizador y originalidad. Si preguntan por talla en un perfume, aclara cordialmente que viene en mililitros y habla de su fijación.
- Si es CALZADO / SNEAKERS: Habla de tallas de zapatos (${currentProduct.sizes || "38 a 43"}), comodidad de horma y amortiguación.
- Si es ROPA: Habla de tallas de confección (${currentProduct.sizes || "S, M, L, XL"}), corte urbano y tela de alto gramaje.
- Si es GORRA: Explica que es talla única ajustable con broche premium posterior.
- Si es JOYERÍA: Habla de brillo, laminado en oro / kilates, medidas proporcionales y cuidados.
`;
  }

  return `Eres "NERKLEY AI", el Asesor y Concierge de Lujo Oficial de la tienda NERKLEY.
Tu rol es brindar atención al cliente 24/7, resolver todas las dudas de compra, recomendar productos del catálogo, dar detalles sobre envíos, pagos y productos, y cerrar ventas para que el cliente no tenga que esperar atención humana.

TONO Y PERSONALIDAD:
- Sofisticado, educado, persuasivo, seguro y muy servicial.
- Hablas con elegancia moderna (estilo boutique de alta gama).
- Tratas al cliente con respeto ("Tú" cercano pero distinguido).
- Responde de forma clara, directa y atractiva, usando viñetas cuando sea útil.

CONOCIMIENTO DE LA TIENDA:
- Tienda: ${NERKLEY_KNOWLEDGE.storeName} (${NERKLEY_KNOWLEDGE.concept})
- Medios de pago: ${NERKLEY_KNOWLEDGE.payments.methods} a través de la pasarela segura oficial de Wompi.
- Envíos y Tiempos: ${NERKLEY_KNOWLEDGE.shipping.coverage} Tiempos: ${NERKLEY_KNOWLEDGE.shipping.time} Transportadoras: ${NERKLEY_KNOWLEDGE.shipping.carriers}.
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

// Motor de Inteligencia Asistente Local con fallback inteligente contextual
function generateLocalAIResponse(userMessage: string, products: any[], currentProduct?: any): string {
  const msg = userMessage.toLowerCase().trim();

  // 1. Preguntas sobre el producto específico que está viendo
  if (currentProduct) {
    const pType = getProductType(currentProduct.name, currentProduct.category);

    // PREGUNTAS DE TALLA O MEDIDA (ADAPTADAS ESTRICTAMENTE POR CATEGORÍA)
    if (msg.includes("talla") || msg.includes("medida") || msg.includes("tamano") || msg.includes("tamaño") || msg.includes("horma") || msg.includes("ml")) {
      if (pType === "perfume") {
        return `Los perfumes no se manejan por tallas de ropa, sino por **presentación en volumen (mililitros)**. ✨\n\nEn el caso de **${currentProduct.name}**, viene en su presentación exclusiva de **${currentProduct.sizes || "100ml / Eau de Parfum"}** en frasco de lujo sellado con atomizador de alta dispersión.\n\n¿Deseas conocer sobre sus notas olfativas o fijación en piel?`;
      } else if (pType === "cap") {
        return `La gorra **${currentProduct.name}** es de **talla única ajustable**, confeccionada con broche posterior de alta resistencia para adaptarse a cualquier contorno con total comodidad y ajuste perfecto.`;
      } else if (pType === "jewelry") {
        return `Para la joya **${currentProduct.name}**, cuenta con medidas proporcionales de diseño de lujo (${currentProduct.sizes || "medida estándar universal"}), con acabado en ${currentProduct.colors || "tono oro premium"} de gran durabilidad.`;
      } else if (pType === "footwear") {
        return `Para los sneakers **${currentProduct.name}**, las tallas disponibles son: **${currentProduct.sizes || "38 a 43"}** (numeración nacional Colombia). Te recomendamos pedir tu talla habitual deportiva ya que la horma es estándar y muy cómoda. ✨`;
      } else {
        return `Para **${currentProduct.name}**, tenemos disponibles las tallas: **${currentProduct.sizes || "S, M, L, XL"}**. El tallaje es estándar de corte moderno/urbano. Puedes seleccionar tu talla favorita y añadirla a tu carrito.`;
      }
    }

    // PREGUNTAS DE AROMA / FIJACIÓN (EXCLUSIVO PERFUMERÍA)
    if (msg.includes("aroma") || msg.includes("olor") || msg.includes("fijacion") || msg.includes("fijación") || msg.includes("notas") || msg.includes("dura")) {
      if (pType === "perfume") {
        return `💎 **Notas y Fijación de ${currentProduct.name}:**\n\nEsta fragancia cuenta con aceites esenciales concentrados que garantizan una **fijación prolongada de 8 a 12 horas en piel** (y más de 24 horas en prendas). Sus notas proyectan un perfil elegante, distintivo y de gran presencia.\n\nSe despacha en empaque térmico con celofán sellado de fábrica.`;
      }
    }

    // PREGUNTAS DE PRECIO
    if (msg.includes("precio") || msg.includes("cuanto cuesta") || msg.includes("cuánto cuesta") || msg.includes("valor")) {
      const priceText = `$${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP`;
      const originalText = currentProduct.original_price ? ` (antes en $${Number(currentProduct.original_price).toLocaleString("es-CO")} COP)` : "";
      return `El valor actual de **${currentProduct.name}** es de **${priceText}**${originalText}.\n\nIncluye empaque de protección exclusivo, garantía verificada de NERKLEY y envío asegurado con guía de rastreo. ¿Deseas que te ayude a completar tu pedido?`;
    }

    // PREGUNTAS DE CALIDAD / ORIGINALIDAD
    if (msg.includes("original") || msg.includes("calidad") || msg.includes("1.1") || msg.includes("garantia") || msg.includes("garantía")) {
      if (pType === "perfume") {
        return `En **NERKLEY** garantizamos fragancias 100% auténticas, con batch code verificable, frasco íntegro y atomizador sellado.\n\nCada unidad pasa por control físico antes de embalarse en caja con protección térmica para el despacho.`;
      } else {
        return `En **NERKLEY** garantizamos la máxima calidad en cada pieza. Nuestras prendas y calzado cuentan con confección 1.1 Top, materiales de alta durabilidad y detalles idénticos a los estándares internacionales.\n\nCada orden se despacha con sello de seguridad e inspección previa.`;
      }
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
    return `Comprar en **NERKLEY** es muy rápido y seguro:\n\n1. Elige tu artículo favorito en nuestro catálogo.\n2. Haz clic en **"Agregar al Carrito"**.\n3. Abre tu carrito y presiona **"Proceder al Pago Seguro"**.\n4. Llena tus datos de envío y elige tu medio de pago favorito (Nequi, Bancolombia, PSE o Tarjetas) en la pasarela oficial de Wompi.\n\n¡Inmediatamente confirmemos tu pago, nuestro equipo iniciará la preparación de tu orden! ✨`;
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
    return `¡Hola! Bienvenido a **NERKLEY**. ✨\n\nSoy tu Asesor Virtual de Inteligencia Artificial disponible 24/7. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre productos, disponibilidad, métodos de pago con Wompi o tiempos de entrega a tu ciudad.`;
  }

  // 7. Respuesta de cortesía por defecto
  return `Con gusto te asisto en **NERKLEY**. ¿Tienes alguna duda sobre nuestras prendas, fragancias, envíos a tu ciudad o medios de pago (Nequi, Bancolombia, PSE)?\n\nPuedes preguntarme con toda confianza y te orientaré de inmediato.`;
}

export async function POST(req: Request) {
  try {
    const { messages, currentProduct } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes inválidos." }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    let products: any[] = [];

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, sale_price, original_price, discount_percent, category, stock, sizes, colors, badge, description")
          .eq("is_active", true)
          .limit(50);
        if (data) products = data;
      } catch (err) {
        console.error("Error al obtener catálogo Supabase:", err);
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const systemPrompt = buildSystemPrompt(products, currentProduct);
        const conversationHistory = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: conversationHistory,
              generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 380,
              },
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText) {
            return NextResponse.json({ reply: aiText });
          }
        }
      } catch (geminiError) {
        console.error("Error al llamar a Gemini:", geminiError);
      }
    }

    const localReply = generateLocalAIResponse(lastUserMessage, products, currentProduct);
    return NextResponse.json({ reply: localReply });
  } catch (error: any) {
    console.error("Error en support-chat API:", error);
    return NextResponse.json(
      { error: "Error al procesar consulta." },
      { status: 500 }
    );
  }
}
