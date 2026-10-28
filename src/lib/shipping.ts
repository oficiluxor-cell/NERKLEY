export const SHIPPING_RATES = {
  national: 15000, // Envío Nacional (Otras Ciudades de Colombia)
  local: 9500,     // Envío Local / Misma Ciudad
};

export type ShippingType = "national" | "local";

/**
 * Verifica si un producto tiene activada la promoción de Envío Gratis
 */
export function hasFreeShipping(product: { badge?: string | null } | null | undefined): boolean {
  if (!product || !product.badge) return false;
  const b = product.badge.toLowerCase();
  return b.includes("envio gratis") || b.includes("envío gratis") || b.includes("free shipping");
}

/**
 * Extrae el badge visual limpio (removiendo la etiqueta interna de Envío Gratis si está presente)
 */
export function extractDisplayBadge(badge?: string | null): string {
  if (!badge) return "";
  return badge
    .replace(/•?\s*env[ií]o gratis\s*•?/gi, "")
    .replace(/\[env[ií]o gratis\]/gi, "")
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
 * Calcula la matemática completa y transparente de la compra:
 * - Precio original acumulado
 * - Ahorro por descuento en producto
 * - Subtotal
 * - Costo de envío ($0 si tiene promo)
 * - Ahorro en costo de envío
 * - Total final a pagar
 * - Ahorro global del comprador
 */
export function calculateOrderMath(params: {
  salePrice: number;
  originalPrice?: number | null;
  quantity: number;
  shippingType: ShippingType;
  isFreeShipping: boolean;
}) {
  const { salePrice, originalPrice, quantity, shippingType, isFreeShipping } = params;

  const standardShippingCost = SHIPPING_RATES[shippingType] || SHIPPING_RATES.national;
  const shippingCost = isFreeShipping ? 0 : standardShippingCost;
  const shippingSavings = isFreeShipping ? standardShippingCost : 0;

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
    totalOriginalPrice,
    totalSalePrice,
    productDiscountSavings,
    totalToPay,
    totalSavings,
  };
}
