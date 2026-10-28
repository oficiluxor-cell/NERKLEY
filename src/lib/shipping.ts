export const STANDARD_SHIPPING_COST = 15000; // Tarifa fija estándar de envío: $15.000 COP

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
 * Calcula la matemática completa y transparente de la compra con tarifa fija de $15.000 COP
 */
export function calculateOrderMath(params: {
  salePrice: number;
  originalPrice?: number | null;
  quantity: number;
  isFreeShipping: boolean;
}) {
  const { salePrice, originalPrice, quantity, isFreeShipping } = params;

  const standardShippingCost = STANDARD_SHIPPING_COST;
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
