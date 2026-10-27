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
    "Ropa Urbana & Haute Couture (Edición Exclusiva y Colección Limitada)",
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
    .slice(0, 45)
    .map(
      (p) =>
        `- ${p.name} | Cat: ${p.category} | $${Number(p.sale_price).toLocaleString()} COP${
          p.original_price ? ` (Antes: $${Number(p.original_price).toLocaleString()} COP)` : ""
        }${p.discount_percent ? ` | ${p.discount_percent}% OFF` : ""} | Stock: ${
          p.stock > 0 ? `${p.stock} dispon.` : "Agotado"
        }${p.badge ? ` | ${p.badge}` : ""}${p.sizes ? ` | Talla/Mililitros: ${p.sizes}` : ""}${
          p.colors ? ` | Color: ${p.colors}` : ""
        }`
    )
    .join("\n");

  let focusedProductContext = "";
  if (currentProduct) {
    const productType = getProductType(currentProduct.name, currentProduct.category);
    focusedProductContext = `
PRODUCTO QUE EL CLIENTE TIENE EN PANTALLA:
- Nombre: "${currentProduct.name}"
- Precio: $${Number(currentProduct.sale_price).toLocaleString()} COP
- Tipo de producto: ${productType.toUpperCase()} (${currentProduct.category})
- Presentación / Talla: ${currentProduct.sizes || "Estándar"}
- Color / Tono: ${currentProduct.colors || "Según catálogo"}
- Stock en bodega: ${currentProduct.stock > 0 ? `${currentProduct.stock} unidades disponibles` : "Agotado"}
- Descripción: ${currentProduct.description || "Pieza exclusiva de alta gama"}
`;
  }

  return `Eres "Valeria", la Asesora Personal de Imagen y Vendedora Estrella Oficial de NERKLEY.
Tu misión principal es CONECTAR con el cliente como una persona real, cálida, carismática y experta en moda y lujo, y CERRAR VENTAS con elegancia, persuasión y entusiasmo natural.

NO PAREZCAS UN ROBOT NI UN MANUAL DE ATENCIÓN AL CLIENTE:
- Habla en primera persona, cercana pero distinguida ("¡Hola! Qué gusto saludarte", "¡Excelente elección!", "Uff, esa pieza te va a quedar brutal").
- Usa emojis con estilo (✨, 💎, 🔥, 👌, 👟, 📦).
- Muestra pasión genuina por los productos. Si el cliente mira un perfume o unos sneakers, halaga su buen gusto.
- Haz preguntas de interés: "¿Lo quieres para ti o es para un regalo especial?", "¿Te gusta más un estilo casual o para salir de noche?".

TÉCNICAS DE VENDEDORA PARA CERRAR LA VENTA:
1. HALAGO + VALOR: Reconoce su buen gusto y destaca lo que el producto le aportará (estatus, cumplidos por su aroma o estilo único, durabilidad).
2. SENSACIÓN DE EXCLUSIVIDAD Y ESCASEZ: Menciona sutilmente que las piezas de NERKLEY se manejan en lotes seleccionados y las mejores tallas/aromas se agotan rápido.
3. DERRIBAR DUDAS CON SEGURIDAD:
   - Pagos: 100% blindados con Wompi (Nequi, Bancolombia, PSE o Tarjetas). Cero riesgo.
   - Envíos: Exclusivos y asegurados con guía oficial de Servientrega, Coordinadora o Inter Rapidísimo.
   - Tiempos de entrega: 5 a 8 días hábiles a nivel nacional (4 a 7 días en ciudades principales). Explica que cada pedido pasa primero por un estricto protocolo de inspección individual de calidad, autenticidad y empaque térmico antes de salir a despacho.
4. CIERRE DIRECTO (CALL TO ACTION): Siempre termina guiando con calidez al siguiente paso:
   - "¿Te gustaría que te reserve una de las últimas unidades disponibles?"
   - "Solo debes tocar en 'Añadir al Carrito' y puedes pagar en 1 minuto por Nequi o Bancolombia sin enredos. ¿Te ayudo con tu pedido?"
5. VENTA CRUZADA AMIGABLE: Si compra calzado, sugiérele un buzo o gorra que combine; si busca perfume, sugiere la mejor opción según la ocasión.

ADAPTACIÓN ESTRICTA POR PRODUCTO:
- Si es PERFUME: NUNCA digas "talla". Habla de notas olfativas, fijación duradera (8-12 horas en piel), proyección de estela y frasco de 100ml sellado con celofán de fábrica.
- Si es CALZADO/SNEAKERS: Habla de tallas (38 a 43), amortiguación, horma exacta y estilo urbano.
- Si es ROPA: Habla de tallas (S, M, L, XL), corte moderno y tela de alto gramaje con costuras reforzadas.
- Si es GORRA: Es talla única ajustable con broche de lujo.
- Si es JOYERÍA: Habla de brillo duradero, laminado en oro de alta densidad y estuche de regalo.

${focusedProductContext}

CATÁLOGO REAL EN VIVO DE NERKLEY:
${productCatalogText}

Mantén tus respuestas conversacionales, dinámicas y de 2 a 3 párrafos cortos para que se lean genial en celular. ¡Sé la mejor vendedora que el cliente haya conocido!`;
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
        return `¡Hola! Los perfumes no se manejan por tallas de ropa, sino por **presentación en volumen (mililitros)**. ✨\n\nEn el caso de **${currentProduct.name}**, viene en su presentación exclusiva de **${currentProduct.sizes || "100ml / Eau de Parfum"}** en frasco de lujo sellado con atomizador de alta dispersión.\n\nEs una fragancia espectacular con fijación de 8 a 12 horas en piel. ¿Te gustaría que te reserve una unidad antes de que se agote?`;
      } else if (pType === "cap") {
        return `¡Te va a encantar! La gorra **${currentProduct.name}** es de **talla única ajustable**, con broche posterior de alta resistencia para adaptarse a cualquier contorno con ajuste impecable.\n\nNos quedan pocas unidades disponibles. ¿Te gustaría añadirla a tu carrito ahora mismo? ✨`;
      } else if (pType === "jewelry") {
        return `¡Excelente elección! La joya **${currentProduct.name}** cuenta con proporciones elegantes (${currentProduct.sizes || "medida estándar universal"}), con acabado en ${currentProduct.colors || "tono oro premium"} de gran brillo y resistencia al agua/sudor.\n\nIncluye empaque de lujo. ¿Deseas asegurar tu pedido hoy?`;
      } else if (pType === "footwear") {
        return `¡Uff, esos sneakers están brutales! 🔥 Para **${currentProduct.name}**, las tallas disponibles son: **${currentProduct.sizes || "38 a 43"}** (numeración nacional estándar Colombia).\n\nTe recomiendo pedir tu talla deportiva habitual porque la horma es exacta y comodísima. ¿Qué talla calzas para confirmarte el stock de inmediato?`;
      } else {
        return `¡Esa prenda luce increíble! Para **${currentProduct.name}**, tenemos disponibles las tallas: **${currentProduct.sizes || "S, M, L, XL"}**. El tallaje es estándar de corte moderno/urbano con tela de alto gramaje.\n\n¿Qué talla usas normalmente para apartártela de una vez?`;
      }
    }

    // PREGUNTAS DE AROMA / FIJACIÓN (EXCLUSIVO PERFUMERÍA)
    if (msg.includes("aroma") || msg.includes("olor") || msg.includes("fijacion") || msg.includes("fijación") || msg.includes("notas") || msg.includes("dura")) {
      if (pType === "perfume") {
        return `💎 **¡Es una obra de arte olfativa!**\n\n**${currentProduct.name}** tiene aceites esenciales concentrados que garantizan una **fijación prolongada de 8 a 12 horas en piel** (y más de 24 horas en tu ropa). Deja una estela sofisticada y atractiva que llama la atención donde llegues.\n\nSe despacha en caja sellada con celofán térmico de fábrica. ¿Te gustaría aprovechar el precio actual de $${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP y pedirlo hoy?`;
      }
    }

    // PREGUNTAS DE PRECIO
    if (msg.includes("precio") || msg.includes("cuanto cuesta") || msg.includes("cuánto cuesta") || msg.includes("valor")) {
      const priceText = `$${Number(currentProduct.sale_price).toLocaleString("es-CO")} COP`;
      const originalText = currentProduct.original_price ? ` (antes en $${Number(currentProduct.original_price).toLocaleString("es-CO")} COP)` : "";
      return `¡Tiene un super precio hoy! El valor de **${currentProduct.name}** es de **${priceText}**${originalText}.\n\nIncluye empaque de protección exclusivo, garantía verificada de NERKLEY y envío asegurado con guía de rastreo oficial.\n\nPuedes pagar facilito con Nequi, Bancolombia o tarjeta por Wompi. ¿Te ayudo a procesar tu compra de una vez? ✨`;
    }

    // PREGUNTAS DE CALIDAD / ORIGINALIDAD
    if (msg.includes("original") || msg.includes("calidad") || msg.includes("1.1") || msg.includes("garantia") || msg.includes("garantía")) {
      if (pType === "perfume") {
        return `Puedes comprar con total tranquilidad: en **NERKLEY** garantizamos fragancias 100% auténticas, con batch code verificable, frasco íntegro y atomizador sellado.\n\nCada unidad pasa por control de calidad individual antes de salir a despacho. ¿Te gustaría recibir la tuya esta semana?`;
      } else {
        return `¡Cero preocupaciones! En **NERKLEY** garantizamos la máxima calidad en cada pieza. Nuestras prendas y calzado cuentan con los más altos estándares de confección, materiales de primera línea y costuras reforzadas.\n\nCada orden se despacha con sello de seguridad e inspección previa. ¡Te va a fascinar cuando lo abras! 👌`;
      }
    }
  }

  // 2. Preguntas sobre Envíos y Tiempos de Entrega
  if (msg.includes("envio") || msg.includes("envío") || msg.includes("cuanto tarda") || msg.includes("tiempo") || msg.includes("llega") || msg.includes("ciudad") || msg.includes("tarda") || msg.includes("demora")) {
    return `📦 **¡Enviamos con total seguridad a toda Colombia!**\n\nEn NERKLEY cada pieza pasa por un protocolo exclusivo de curaduría selecta para garantizar que recibas un producto 100% impecable:\n\n• **Fase 1 - Inspección & Embalaje:** (1 a 3 días hábiles) Verificación individual de autenticidad, acabados y sellado térmico de fábrica.\n• **Fase 2 - Tránsito Nacional Prioritario:** (3 a 5 días hábiles) Despacho directo asegurado con *Interrapidísimo, Servientrega o Coordinadora*.\n\n⏱ **Tiempo estimado total:** De **5 a 8 días hábiles** a nivel nacional (ciudades principales como Bogotá, Medellín, Cali y Barranquilla suelen recibir en **4 a 7 días hábiles**).\n\n🔍 **Guía de Rastreo:** Apenas tu pedido sale a ruta, te notificamos con tu número de guía oficial para que sigas el estado en tiempo real. ¿A qué ciudad te gustaría que te lo enviemos?`;
  }

  // 3. Preguntas sobre Métodos de Pago
  if (msg.includes("pago") || msg.includes("pagar") || msg.includes("nequi") || msg.includes("bancolombia") || msg.includes("tarjeta") || msg.includes("pse") || msg.includes("contraentrega")) {
    return `💳 **Pagar en NERKLEY es facilísimo y 100% seguro:**\n\nTrabajamos con la pasarela oficial blindada de **Wompi (Grupo Bancolombia)** con cifrado SHA-256:\n\n• **Nequi** (Te llega notificación directa a la app para aprobar)\n• **Bancolombia** (Transferencia rápida sin comisiones)\n• **PSE** (Con cualquier banco de Colombia)\n• **Tarjetas de Crédito / Débito** (Visa, Mastercard, Amex)\n• **Daviplata**\n\nTu dinero está totalmente protegido. ¿Cuál de estos medios te queda más cómodo para pagar hoy?`;
  }

  // 4. Preguntas sobre cómo comprar
  if (msg.includes("como comprar") || msg.includes("cómo comprar") || msg.includes("como hago") || msg.includes("comprar")) {
    return `¡Es super sencillo! Te guío paso a paso:\n\n1. Elige tu artículo favorito en el catálogo (selecciona tu talla o presentación).\n2. Haz clic en el botón blanco **"Añadir al Carrito"**.\n3. Abre tu carrito arriba y presiona **"Proceder al Pago Seguro"**.\n4. Ingresas tus datos de envío y pagas en 1 minuto con Nequi, Bancolombia o tarjeta en Wompi.\n\n¡Apenas confirmas el pago, reservamos tu producto e iniciamos la preparación! ¿Tienes algún artículo en mente ahora mismo?`;
  }

  // 5. Preguntas sobre catálogo o recomendaciones
  if (msg.includes("que tienen") || msg.includes("catálogo") || msg.includes("catalogo") || msg.includes("recomienda") || msg.includes("productos") || msg.includes("perfume") || msg.includes("ropa") || msg.includes("gorra") || msg.includes("zapato") || msg.includes("oro")) {
    const featured = products.slice(0, 3);
    const list = featured
      .map((p) => `• **${p.name}** — $${Number(p.sale_price).toLocaleString("es-CO")} COP (${p.category})`)
      .join("\n");
    return `¡Tenemos piezas brutales en tendencia hoy! 🔥\n\nEn **NERKLEY** nos especializamos en:\n💎 **Perfumería de Diseñador & Nicho**\n👕 **Moda Urbana & Alta Gama**\n👟 **Sneakers Exclusivos**\n🧢 **Gorras de Colección**\n👑 **Joyería de Alto Brillo**\n\nAlgunas de nuestras joyas más deseadas hoy:\n${list}\n\n¿Qué tipo de prenda o fragancia estás buscando? ¡Te ayudo a encontrar la perfecta para ti!`;
  }

  // 6. Saludo
  if (msg.includes("hola") || msg.includes("buen") || msg.includes("buenas") || msg.includes("hey")) {
    return `¡Hola! Qué gusto tenerte por aquí en **NERKLEY**. ✨\n\nSoy tu Asesora Personal y Concierge de compras 24/7. Estoy aquí para recomendarte las mejores piezas de nuestra colección, confirmar tallas, tiempos de despacho a tu ciudad o ayudarte a pagar fácil por Wompi.\n\n¿Qué tienes en mente llevarte hoy?`;
  }

  // 7. Respuesta de cortesía por defecto
  return `¡Con todo gusto te asesoro! En **NERKLEY** cuidamos cada detalle para que tu experiencia sea de diez. ¿Tienes alguna pregunta sobre alguna de nuestras prendas, fragancias, tiempos de entrega o medios de pago (Nequi, Bancolombia, PSE)?\n\nDime qué duda tienes y la resolvemos al instante. ✨`;
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

        // Controlador de tiempo límite para respuesta instantánea
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: conversationHistory,
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 450,
              },
            }),
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText) {
            return NextResponse.json({ reply: aiText });
          }
        } else {
          console.error("Gemini API status not ok:", response.status, await response.text());
        }
      } catch (geminiError) {
        console.error("Error o timeout al llamar a Gemini:", geminiError);
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
