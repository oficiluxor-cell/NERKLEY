import { COLOMBIA_REGIONS } from "@/data/colombiaData";

export { COLOMBIA_REGIONS };

export const STANDARD_SHIPPING_COST = 14000; // Tarifa estándar base: $14.000 COP

export interface ShippingQuote {
  rate: number;
  deliveryTime: string;
  zoneLabel: string;
  isSpecialZone: boolean;
}

// Zona Local Prioritaria (Medellín y Conurbación Metropolitana del Valle de Aburrá)
const LOCAL_CITIES = new Set([
  "medellín", "medellin", "envigado", "itagüí", "itagui", "bello", "sabaneta", 
  "caldas", "la estrella", "copacabana", "girardota", "barbosa"
]);

// Ciudades Capitales y Ejes Logísticos Principales (Tarifa: $14.000 COP)
const CAPITAL_CITIES = new Set([
  "bogotá d.c.", "bogota", "bogota d.c.", "cali", "barranquilla", 
  "bucaramanga", "pereira", "manizales", "armenia", "ibagué", "ibague", "cartagena", 
  "santa marta", "cúcuta", "cucuta", "valledupar", "montería", "monteria", "pasto", 
  "neiva", "villavicencio", "popayán", "popayan", "tunja", "sincelejo"
]);

// Áreas Metropolitanas e Intermedias (Tarifa Estándar: $15.000 COP)
const METRO_CITIES = new Set([
  "rionegro", "soacha", "chía", "chia", "zipaquirá", "zipaquira", "facatativá", "facatativa", 
  "soledad", "malambo", "palmira", "yumbo", "buga", "tuluá", "tulua", "floridablanca", 
  "girón", "giron", "piedecuesta", "dosquebradas", "duitama", "sogamoso", "cartago", 
  "jamundí", "jamundi", "mosquera", "funza", "madrid"
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
      zoneLabel: "Destino Especial / Reexpedición",
      isSpecialZone: true,
    };
  }

  // 2. Zona Local Prioritaria (Medellín y Conurbación Metropolitana)
  if (LOCAL_CITIES.has(normCity)) {
    return {
      rate: 10000,
      deliveryTime: "1 a 2 días hábiles",
      zoneLabel: "Entrega Prioritaria",
      isSpecialZone: false,
    };
  }

  // 3. Ciudades Capitales y Principales
  if (CAPITAL_CITIES.has(normCity) || normDept === "bogotá d.c.") {
    return {
      rate: 14000,
      deliveryTime: "2 a 4 días hábiles",
      zoneLabel: "Ciudad Principal",
      isSpecialZone: false,
    };
  }

  // 4. Áreas Metropolitanas y Municipios Conurbados
  if (METRO_CITIES.has(normCity) || normDept === "antioquia") {
    return {
      rate: 15000,
      deliveryTime: "2 a 4 días hábiles",
      zoneLabel: "Área Metropolitana",
      isSpecialZone: false,
    };
  }

  // 5. Municipios Nacionales
  return {
    rate: 16000,
    deliveryTime: "3 a 5 días hábiles",
    zoneLabel: "Nacional Asegurado",
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
