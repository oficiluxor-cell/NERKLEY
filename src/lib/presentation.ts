/**
 * Manejo de Modalidad / Presentación de Productos en NERKLEY (Unidad vs Combo)
 */

export type ProductPresentationType = "todos" | "unidad" | "combo";

export interface PresentationCheckable {
  name?: string | null;
  badge?: string | null;
  category?: string | null;
  description?: string | null;
}

/**
 * Determina de forma inteligente y retrocompatible si un producto es un Combo o una Unidad Individual.
 * Inspecciona badges explícitos, etiquetas en el nombre y palabras clave comerciales.
 */
export function getProductPresentation(product?: PresentationCheckable | null): "unidad" | "combo" {
  if (!product) return "unidad";

  const badge = (product.badge || "").toLowerCase();
  const name = (product.name || "").toLowerCase();

  // 1. Etiqueta explícita en badge
  if (badge.includes("[combo]") || badge.includes("combo") || badge.includes("dúo") || badge.includes("duo") || badge.includes("kit")) {
    return "combo";
  }

  // 2. Si el badge dice explícitamente [unidad]
  if (badge.includes("[unidad]")) {
    return "unidad";
  }

  // 3. Detección en el nombre del producto (ej: "Combo 2 Perfumes", "Dúo Sauvage", "Kit Viajero", "Pack x2")
  const comboNameRegex = /\b(combo|combos|d[uú]o|d[uú]os|kit|kits|pack|packs|set|2x1|3x1|paga 1 lleva 2)\b/i;
  if (comboNameRegex.test(name)) {
    return "combo";
  }

  // Por defecto, todo producto es una unidad individual
  return "unidad";
}

/**
 * Retorna true si el producto es un Combo / Dúo / Kit
 */
export function isProductCombo(product?: PresentationCheckable | null): boolean {
  return getProductPresentation(product) === "combo";
}

/**
 * Limpia el badge para mostrar solo el texto visual personalizado del comerciante
 * Remueve etiquetas técnicas de combo, unidad y envío gratis
 */
export function cleanCustomBadgeText(badge?: string | null): string {
  if (!badge) return "";
  return badge
    .replace(/\[combo\]/gi, "")
    .replace(/\[unidad\]/gi, "")
    .replace(/•?\s*env[ií]o gratis\s*•?/gi, "")
    .replace(/\[env[ií]o gratis\]/gi, "")
    .replace(/•?\s*combo\s*•?/gi, "")
    .replace(/^•+|•+$/g, "")
    .trim();
}

/**
 * Construye el string de badge completo y ordenado para guardar en la base de datos Supabase
 */
export function buildPresentationBadge(
  customBadge: string,
  presentation: "unidad" | "combo",
  isFreeShipping: boolean
): string {
  const clean = cleanCustomBadgeText(customBadge);
  const parts: string[] = [];

  // Si es combo, agregamos la marca Combo para persistencia y presentación
  if (presentation === "combo") {
    parts.push("Combo");
  }

  if (clean) {
    parts.push(clean);
  }

  if (isFreeShipping) {
    parts.push("Envío Gratis");
  }

  return parts.join(" • ");
}

/**
 * Valida si un producto coincide con el filtro de presentación seleccionado ("todos", "unidad", "combo")
 */
export function matchesPresentationFilter(
  product: PresentationCheckable,
  filter: ProductPresentationType
): boolean {
  if (filter === "todos") return true;
  const pres = getProductPresentation(product);
  return pres === filter;
}
