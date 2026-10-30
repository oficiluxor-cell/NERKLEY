export const STANDARD_SHIPPING_COST = 15000; // Tarifa estándar base: $15.000 COP

export interface ShippingQuote {
  rate: number;
  deliveryTime: string;
  zoneLabel: string;
  isSpecialZone: boolean;
}

/**
 * Diccionario oficial de Departamentos y Municipios más frecuentes de Colombia
 */
export const COLOMBIA_REGIONS: Record<string, string[]> = {
  "Bogotá D.C.": ["Bogotá D.C."],
  "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "Rionegro", "Apartadó", "Turbo", "Caucasia", "Caldas", "La Estrella", "Copacabana", "Marinilla", "Guarne", "Otro Municipio..."],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Buga", "Cartago", "Jamundí", "Yumbo", "Candelaria", "Pradera", "Florida", "Otro Municipio..."],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Baranoa", "Puerto Colombia", "Galapa", "Otro Municipio..."],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro", "Lebrija", "Otro Municipio..."],
  "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar", "Otro Municipio..."],
  "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá", "Madrid", "Mosquera", "Funza", "Girardot", "Cajicá", "Sopó", "Cota", "Otro Municipio..."],
  "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia", "Otro Municipio..."],
  "Caldas": ["Manizales", "Villamaría", "Chinchiná", "La Dorada", "Riosucio", "Otro Municipio..."],
  "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Montenegro", "Quimbaya", "Circasia", "Otro Municipio..."],
  "Tolima": ["Ibagué", "Espinal", "Melgar", "Chaparral", "Mariquita", "Líbano", "Otro Municipio..."],
  "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre", "Otro Municipio..."],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Villa del Rosario", "Los Patios", "Pamplona", "Tibú", "Otro Municipio..."],
  "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "Plato", "El Banco", "Otro Municipio..."],
  "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López", "Cumaral", "Otro Municipio..."],
  "Cesar": ["Valledupar", "Aguachica", "Codazzi", "Bosconia", "Curumaní", "Otro Municipio..."],
  "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún", "Montelíbano", "Planeta Rica", "Otro Municipio..."],
  "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres", "La Unión", "Sandoná", "Otro Municipio..."],
  "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía", "Piendamó", "Otro Municipio..."],
  "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa", "Puerto Boyacá", "Moniquirá", "Otro Municipio..."],
  "Sucre": ["Sincelejo", "Corozal", "San Marcos", "Sampués", "Tolú", "Otro Municipio..."],
  "La Guajira": ["Riohacha", "Maicao", "Uribia", "San Juan del Cesar", "Fonseca", "Otro Municipio..."],
  "Casanare": ["Yopal", "Aguazul", "Villanueva", "Tauramena", "Paz de Ariporo", "Otro Municipio..."],
  "Caquetá": ["Florencia", "San Vicente del Caguán", "Cartagena del Chairá", "Otro Municipio..."],
  "Putumayo": ["Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez", "Sibundoy", "Otro Municipio..."],
  "Arauca": ["Arauca", "Tame", "Saravena", "Arauquita", "Fortul", "Otro Municipio..."],
  "Chocó": ["Quibdó", "Istmina", "Tadó", "Condoto", "Bahía Solano", "Nuquí", "Otro Municipio..."],
  "Guaviare": ["San José del Guaviare", "El Retorno", "Calamar", "Otro Municipio..."],
  "San Andrés y Providencia": ["San Andrés", "Providencia"],
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Guainía": ["Inírida", "Barrancominas"],
  "Vaupés": ["Mitú", "Carurú"],
  "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"],
};

// Ciudades Capitales y Ejes Logísticos Principales (Tarifa Base Reducida: $14.000 COP)
const CAPITAL_CITIES = new Set([
  "bogotá d.c.", "bogota", "bogota d.c.", "medellín", "medellin", "cali", "barranquilla", 
  "bucaramanga", "pereira", "manizales", "armenia", "ibagué", "ibague", "cartagena", 
  "santa marta", "cúcuta", "cucuta", "valledupar", "montería", "monteria", "pasto", 
  "neiva", "villavicencio", "popayán", "popayan", "tunja", "sincelejo"
]);

// Áreas Metropolitanas e Intermedias (Tarifa Estándar: $15.000 COP)
const METRO_CITIES = new Set([
  "bello", "itagüí", "itagui", "envigado", "sabaneta", "rionegro", "soacha", "chía", "chia", 
  "zipaquirá", "zipaquira", "facatativá", "facatativa", "soledad", "malambo", "palmira", 
  "yumbo", "buga", "tuluá", "tulua", "floridablanca", "girón", "giron", "piedecuesta", 
  "dosquebradas", "duitama", "sogamoso", "cartago", "jamundí", "jamundi", "mosquera", "funza", "madrid"
]);

// Departamentos y Destinos Especiales / Reexpedición Aérea ($25.000 COP)
const SPECIAL_DEPARTMENTS = new Set([
  "amazonas", "san andrés y providencia", "san andres y providencia", "chocó", "choco", 
  "guainía", "guainia", "vaupés", "vaupes", "vichada", "arauca", "guaviare", "putumayo"
]);

/**
 * Calcula automáticamente la cotización y tiempo de entrega según el destino en Colombia
 */
export function getShippingQuote(department?: string, city?: string): ShippingQuote {
  const normDept = (department || "").trim().toLowerCase();
  const normCity = (city || "").trim().toLowerCase();

  // 1. Zonas Especiales / Reexpedición Aérea o Fluvial
  if (SPECIAL_DEPARTMENTS.has(normDept) || normCity === "tumaco") {
    return {
      rate: 25000,
      deliveryTime: "4 a 7 días hábiles",
      zoneLabel: "Zona Especial / Reexpedición",
      isSpecialZone: true,
    };
  }

  // 2. Ciudades Principales / Capitales
  if (CAPITAL_CITIES.has(normCity) || normDept === "bogotá d.c.") {
    return {
      rate: 14000,
      deliveryTime: "2 a 4 días hábiles",
      zoneLabel: "Ciudad Principal / Capital",
      isSpecialZone: false,
    };
  }

  // 3. Áreas Metropolitanas y Municipios Conurbados
  if (METRO_CITIES.has(normCity)) {
    return {
      rate: 15000,
      deliveryTime: "2 a 4 días hábiles",
      zoneLabel: "Área Metropolitana / Eje Central",
      isSpecialZone: false,
    };
  }

  // 4. Municipios Nacionales Estándar
  return {
    rate: 17000,
    deliveryTime: "3 a 5 días hábiles",
    zoneLabel: "Municipio Nacional",
    isSpecialZone: false,
  };
}

/**
 * Verifica si un producto tiene activada la promoción de Envío Gratis
 */
export function hasFreeShipping(product: { badge?: string | null } | null | undefined): boolean {
  if (!product || !product.badge) return false;
  const b = product.badge.toLowerCase();
  return b.includes("envio gratis") || b.includes("envío gratis") || b.includes("free shipping");
}

/**
 * Extrae el badge visual limpio (removiendo etiquetas internas técnicas como Envío Gratis o Combo para evitar duplicados visuales)
 */
export function extractDisplayBadge(badge?: string | null): string {
  if (!badge) return "";
  return badge
    .replace(/•?\s*env[ií]o gratis\s*•?/gi, "")
    .replace(/\[env[ií]o gratis\]/gi, "")
    .replace(/•?\s*combo\s*•?/gi, "")
    .replace(/\[combo\]/gi, "")
    .replace(/•?\s*unidad\s*•?/gi, "")
    .replace(/\[unidad\]/gi, "")
    .replace(/^•\s*|\s*•$/g, "")
    .trim();
}

/**
 * Combina el badge de texto personalizado con la etiqueta de Envío Gratis para persistir en la base de datos
 */
export function buildProductBadge(customBadge: string, isFreeShipping: boolean): string {
  const clean = extractDisplayBadge(customBadge);
  if (!isFreeShipping) return clean;
  if (!clean) return "Envío Gratis";
  return `${clean} • Envío Gratis`;
}

/**
 * Calcula la matemática completa y transparente de la compra con tarifa automática según ciudad
 */
export function calculateOrderMath(params: {
  salePrice: number;
  originalPrice?: number | null;
  quantity: number;
  isFreeShipping: boolean;
  department?: string;
  city?: string;
}) {
  const { salePrice, originalPrice, quantity, isFreeShipping, department, city } = params;

  const quote = getShippingQuote(department, city);
  const standardShippingCost = quote.rate;
  const shippingCost = isFreeShipping ? 0 : quote.rate;
  const shippingSavings = isFreeShipping ? quote.rate : 0;

  const basePricePerUnit = originalPrice && originalPrice > salePrice ? originalPrice : salePrice;
  const totalOriginalPrice = basePricePerUnit * quantity;
  const totalSalePrice = salePrice * quantity;
  const productDiscountSavings = Math.max(0, totalOriginalPrice - totalSalePrice);

  const totalToPay = totalSalePrice + shippingCost;
  const totalSavings = productDiscountSavings + shippingSavings;

  return {
    standardShippingCost,
    shippingCost,
    shippingSavings,
    deliveryTime: quote.deliveryTime,
    zoneLabel: quote.zoneLabel,
    isSpecialZone: quote.isSpecialZone,
    totalOriginalPrice,
    totalSalePrice,
    productDiscountSavings,
    totalToPay,
    totalSavings,
  };
}
