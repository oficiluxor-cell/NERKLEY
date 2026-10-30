/**
 * Manejo y jerarquía de Categorías y Subcategorías (Tipos de Producto) en NERKLEY
 */

export interface ParsedCategory {
  mainCategory: string;
  subcategory: string;
}

/**
 * Sugerencias comerciales frecuentes por categoría para facilitar la selección en el Admin
 */
export const SUGGESTED_SUBCATEGORIES: Record<string, string[]> = {
  Ropa: [
    "Suéter / Camiseta",
    "Gorras",
    "Zapatos / Calzado",
    "Hoodies / Buzos",
    "Pantalones / Shorts",
    "Conjuntos / Sets",
  ],
  Perfume: [
    "Árabes Exclusivos",
    "Diseñador",
    "Nicho & Autor",
    "Decants / Muestras",
    "Extractos de Parfum",
  ],
  Perfumes: [
    "Árabes Exclusivos",
    "Diseñador",
    "Nicho & Autor",
    "Decants / Muestras",
    "Extractos de Parfum",
  ],
  Zapatos: [
    "Sneakers Urbanos",
    "Zapatos de Cuero",
    "Deportivos / Running",
    "Botas & Botines",
  ],
  Calzado: [
    "Sneakers Urbanos",
    "Zapatos de Cuero",
    "Deportivos / Running",
    "Botas & Botines",
  ],
  Sneakers: [
    "High Top",
    "Retro Classics",
    "Edición Especial",
    "Urbanos",
  ],
  Relojes: [
    "Automáticos Suizos",
    "Cronógrafos",
    "Lujo / Dorado",
    "Deportivos",
  ],
  Reloj: [
    "Automáticos Suizos",
    "Cronógrafos",
    "Lujo / Dorado",
    "Deportivos",
  ],
  Oro: [
    "Cadenas & Collares",
    "Pulseras & Manillas",
    "Anillos",
    "Dijes Especiales",
  ],
  Joyería: [
    "Cadenas & Collares",
    "Pulseras & Manillas",
    "Anillos",
    "Dijes Especiales",
  ],
};

/**
 * Separa la categoría principal y la subcategoría desde el string almacenado
 * Soporta formatos: "Ropa // Gorras", "Ropa > Gorras", o "Ropa"
 */
export function parseCategory(fullCategory?: string | null): ParsedCategory {
  if (!fullCategory) {
    return { mainCategory: "General", subcategory: "" };
  }

  const raw = fullCategory.trim();

  if (raw.includes("//")) {
    const parts = raw.split("//").map((s) => s.trim());
    return {
      mainCategory: formatCategoryName(parts[0] || "General"),
      subcategory: formatSubcategoryName(parts[1] || ""),
    };
  }

  if (raw.includes(">")) {
    const parts = raw.split(">").map((s) => s.trim());
    return {
      mainCategory: formatCategoryName(parts[0] || "General"),
      subcategory: formatSubcategoryName(parts[1] || ""),
    };
  }

  return {
    mainCategory: formatCategoryName(raw),
    subcategory: "",
  };
}

/**
 * Normaliza y capitaliza nombres de categorías
 */
export function formatCategoryName(name: string): string {
  const clean = name.trim();
  if (!clean) return "General";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normaliza nombres de subcategorías
 */
export function formatSubcategoryName(name: string): string {
  const clean = name.trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Empaqueta la categoría principal y subcategoría para persistencia en Supabase
 * Ejemplo: buildFullCategory("Ropa", "Gorras") => "Ropa // Gorras"
 */
export function buildFullCategory(mainCategory: string, subcategory?: string | null): string {
  const main = formatCategoryName(mainCategory);
  const sub = formatSubcategoryName(subcategory || "");
  if (!sub) return main;
  return `${main} // ${sub}`;
}

/**
 * Infiere o extrae la subcategoría de un producto
 * Si ya tiene subcategoría explícita ("Ropa // Gorras"), la retorna.
 * Si no, analiza inteligentemente el nombre del producto para productos ya existentes en base de datos.
 */
export function getProductSubcategory(product: {
  name?: string | null;
  category?: string | null;
  description?: string | null;
}): string {
  if (!product) return "";

  const parsed = parseCategory(product.category);
  if (parsed.subcategory) {
    return parsed.subcategory;
  }

  const name = (product.name || "").toLowerCase();
  const mainCat = parsed.mainCategory.toLowerCase();

  // Inferencia para categoría Ropa
  if (mainCat.includes("ropa") || mainCat.includes("moda") || mainCat.includes("streetwear")) {
    if (/\b(gorra|gorras|cap|caps|snapback|fitted)\b/i.test(name)) return "Gorras";
    if (/\b(sueter|suéter|camiseta|camisetas|tshirt|playera|polo)\b/i.test(name)) return "Suéter / Camiseta";
    if (/\b(zapato|zapatos|sneaker|sneakers|tenis|calzado)\b/i.test(name)) return "Zapatos / Calzado";
    if (/\b(hoodie|hoodies|buzo|buzos|chaqueta|chaquetas)\b/i.test(name)) return "Hoodies / Buzos";
    if (/\b(pantalon|pantalones|short|shorts|bermuda|jogger)\b/i.test(name)) return "Pantalones / Shorts";
    if (/\b(conjunto|conjuntos|set)\b/i.test(name)) return "Conjuntos";
  }

  // Inferencia para Perfumes
  if (mainCat.includes("perfum") || mainCat.includes("fraganc")) {
    if (/\b(lattafa|khamrah|yara|asad|afnan|armaf|al haramain|oriental|oud)\b/i.test(name)) return "Árabes Exclusivos";
    if (/\b(creed|parfums de marly|xerjoff|baccarat|tom ford|nicho)\b/i.test(name)) return "Nicho & Autor";
    if (/\b(sauvage|dior|versace|eros|jean paul|gaultier|armani|carolina herrera|one million|paco rabanne)\b/i.test(name)) return "Diseñador";
    if (/\b(decant|decants|muestra|tester)\b/i.test(name)) return "Decants / Muestras";
  }

  // Inferencia para Zapatos / Sneakers
  if (mainCat.includes("zapato") || mainCat.includes("sneaker") || mainCat.includes("calzado")) {
    if (/\b(jordan|nike|dunk|travis|adidas|forum|yeezy|retro)\b/i.test(name)) return "Sneakers Urbanos";
    if (/\b(cuero|formal|mocasines|oxford)\b/i.test(name)) return "Zapatos de Cuero";
    if (/\b(running|deportivo|sport)\b/i.test(name)) return "Deportivos";
  }

  // Inferencia para Relojes
  if (mainCat.includes("reloj")) {
    if (/\b(automatico|automático|suizo|ulysse|rolex)\b/i.test(name)) return "Automáticos Suizos";
    if (/\b(cronografo|cronógrafo|sport|tachymeter)\b/i.test(name)) return "Cronógrafos";
    if (/\b(oro|dorado|lujo|joya)\b/i.test(name)) return "Lujo / Dorado";
  }

  // Inferencia para Joyería / Oro
  if (mainCat.includes("oro") || mainCat.includes("joya")) {
    if (/\b(cadena|collar|eslabon|tejida)\b/i.test(name)) return "Cadenas & Collares";
    if (/\b(pulsera|manilla|esclava)\b/i.test(name)) return "Pulseras & Manillas";
    if (/\b(anillo|sello)\b/i.test(name)) return "Anillos";
  }

  return "";
}

/**
 * Comprueba si un producto coincide con el filtro de subcategoría
 */
export function matchesSubcategory(
  product: { name?: string | null; category?: string | null; description?: string | null },
  selectedSubcategory?: string | null
): boolean {
  if (!selectedSubcategory || selectedSubcategory === "Todas" || selectedSubcategory === "Todos") {
    return true;
  }
  const sub = getProductSubcategory(product);
  if (!sub) return false;
  return sub.toLowerCase().trim() === selectedSubcategory.toLowerCase().trim();
}
