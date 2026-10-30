import { ProductPresentationType, matchesPresentationFilter } from "@/lib/presentation";
import { parseCategory, matchesSubcategory } from "@/lib/categories";

export interface SmartSearchableProduct {
  id: string;
  name: string;
  slug: string;
  sale_price: number;
  original_price?: number;
  discount_percent?: number;
  category: string;
  images?: string;
  description?: string;
  sizes?: string;
  colors?: string;
  stock?: number;
  badge?: string;
}

/**
 * Normaliza una cadena removiendo acentos, signos de puntuación extra y convirtiendo a minúsculas
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lematizador básico de plurales en español e inglés
 */
export function stemWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("is") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

/**
 * Distancia de Levenshtein para tolerancia a errores ortográficos / typos
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Coincidencia difusa de palabras
 */
export function isWordMatch(queryWord: string, targetWord: string): boolean {
  if (!queryWord || !targetWord) return false;
  if (queryWord === targetWord) return true;
  if (targetWord.startsWith(queryWord)) return true;
  if (queryWord.startsWith(targetWord) && targetWord.length >= 4) return true;

  const stemQ = stemWord(queryWord);
  const stemT = stemWord(targetWord);
  if (stemQ === stemT) return true;
  if (stemT.startsWith(stemQ) && stemQ.length >= 3) return true;

  const minLen = Math.min(queryWord.length, targetWord.length);
  if (minLen < 4) return false;

  const dist = levenshteinDistance(queryWord, targetWord);
  if (minLen >= 6 && dist <= 2) return true;
  if (minLen >= 4 && dist <= 1) return true;

  return false;
}

/**
 * Diccionario semántico de sinónimos, marcas, términos de uso común e intenciones de compra
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Relojes & Alta relojería
  relog: ["reloj", "relojes", "relojeria", "watch", "cronografo", "pulso", "suizo", "ulysse", "nardin", "rolex", "tiempo"],
  reloj: ["relojes", "relojeria", "watch", "watches", "cronografo", "pulso", "suizo", "hora", "manecillas", "tiempo"],
  relojes: ["reloj", "relojeria", "watch", "watches", "cronografo", "pulso", "suizo", "hora", "tiempo"],
  watch: ["reloj", "relojes", "cronografo"],
  watches: ["reloj", "relojes"],
  hora: ["reloj", "relojes", "cronometro"],
  cronografo: ["reloj", "relojes", "cronometro", "suizo"],
  pulso: ["reloj", "relojes", "pulsera", "joya"],
  suizo: ["reloj", "relojes", "ulysse", "nardin", "automatico"],
  ulise: ["ulysse", "nardin", "reloj"],
  ulises: ["ulysse", "nardin", "reloj"],
  nardin: ["ulysse", "nardin", "reloj"],
  rolex: ["reloj", "relojes", "lujo"],

  // Perfumería, fragancias y notas
  locion: ["perfume", "fragancia", "colonia", "aroma", "parfum", "olor"],
  lociones: ["perfume", "perfumes", "fragancia", "fragancias", "colonia", "aroma"],
  colonia: ["perfume", "fragancia", "locion", "aroma"],
  colonias: ["perfume", "perfumes", "fragancia", "locion"],
  aroma: ["perfume", "fragancia", "locion", "olor"],
  aromas: ["perfume", "fragancia", "locion"],
  olor: ["perfume", "fragancia", "aroma"],
  fragancia: ["perfume", "locion", "colonia", "aroma", "parfum"],
  fragancias: ["perfume", "perfumes", "locion", "lociones"],
  perfume: ["locion", "fragancia", "colonia", "parfum", "extracto"],
  perfumes: ["locion", "lociones", "fragancia", "fragancias"],
  parfum: ["perfume", "extracto", "elixir"],
  elixir: ["perfume", "intenso", "parfum"],
  jampol: ["jean", "paul", "gaultier", "male", "elixir"],
  versase: ["versace", "eros"],
  bersase: ["versace", "eros"],
  sauvash: ["sauvage", "dior"],
  salvaje: ["sauvage", "dior"],
  letafa: ["lattafa", "khamrah", "yara", "asad"],
  latata: ["lattafa"],
  armany: ["armani", "acqua"],
  asaro: ["azzaro", "wanted"],
  tomfor: ["tom", "ford"],

  // Calzado y Sneakers
  zapato: ["tenis", "zapatillas", "sneakers", "calzado", "pisos"],
  zapatos: ["tenis", "zapatillas", "sneakers", "calzado", "pisos"],
  tenis: ["sneakers", "zapatos", "calzado", "zapatillas", "pisos"],
  zapatilla: ["tenis", "sneakers", "zapatos", "calzado"],
  zapatillas: ["tenis", "sneakers", "zapatos", "calzado"],
  sneaker: ["tenis", "zapatos", "calzado", "zapatillas"],
  sneakers: ["tenis", "zapatos", "calzado", "zapatillas"],
  calzado: ["tenis", "zapatos", "sneakers"],

  // Joyería & Accesorios
  joya: ["joyeria", "oro", "cadena", "collar", "pulsera", "anillo", "laminado"],
  joyas: ["joyeria", "oro", "cadenas", "collares", "pulseras", "anillos", "laminado"],
  joyeria: ["joya", "joyas", "oro", "plata", "diamante", "laminado"],
  oro: ["dorado", "joya", "joyeria", "cadena", "laminado", "18k"],
  dorado: ["oro", "joya"],
  cadena: ["joya", "collar", "oro", "laminado"],
  cadenas: ["joyas", "collares", "oro"],
  anillo: ["joya", "joyeria", "oro", "plata"],
  anillos: ["joyas", "oro", "plata"],
  pulsera: ["joya", "pulso", "oro", "plata"],
  pulseras: ["joyas", "oro", "plata"],

  // Ropa & Streetwear
  ropa: ["camiseta", "hoodie", "chaqueta", "buzo", "pantalon", "streetwear", "oversize"],
  camiseta: ["ropa", "tshirt", "camisetas", "playera"],
  camisetas: ["ropa", "camiseta", "streetwear"],
  hoodie: ["buzo", "chaqueta", "sudadera", "ropa"],
  hoodies: ["buzos", "chaquetas", "ropa"],
  buzo: ["hoodie", "chaqueta", "ropa"],
  buzos: ["hoodies", "ropa"],
  chaqueta: ["hoodie", "buzo", "ropa"],
  gorra: ["gorras", "cap", "caps", "snapback"],
  gorras: ["gorra", "cap", "caps"],

  // Ofertas & Descuentos
  barato: ["descuento", "oferta", "rebaja", "promo"],
  descuento: ["oferta", "rebaja", "promo", "barato"],
  oferta: ["descuento", "rebaja", "promo", "barato"],
  rebaja: ["descuento", "oferta", "promo"],
  promo: ["descuento", "oferta", "rebaja"],

  // Combos, Unidades & Modalidades
  combo: ["combos", "duo", "duos", "kit", "kits", "pack", "packs", "set", "promocion", "ahorro"],
  combos: ["combo", "duo", "kit", "pack", "promocion", "ahorro"],
  duo: ["combo", "combos", "kit", "pareja"],
  kit: ["combo", "combos", "set", "pack"],
  pack: ["combo", "combos", "kit", "set"],
  set: ["combo", "kit", "pack"],
  unidad: ["unidades", "individual", "sencillo", "unitario"],
  unidades: ["unidad", "individual"]
};

/**
 * Validador de categoría inteligente:
 * Soporta coincidencia exacta, normalizada, singular/plural y prefijo
 */
export function matchesCategoryFilter(
  productCategory: string | undefined | null,
  selectedCategory: string
): boolean {
  if (!selectedCategory || selectedCategory === "Todas") return true;
  if (!productCategory) return false;

  const { mainCategory } = parseCategory(productCategory);
  const pCat = normalizeText(mainCategory);
  const sCat = normalizeText(selectedCategory);

  if (pCat === sCat) return true;

  const stemP = stemWord(pCat);
  const stemS = stemWord(sCat);
  if (stemP === stemS) return true;

  if (pCat.startsWith(sCat) || sCat.startsWith(pCat)) return true;

  return false;
}

/**
 * Calcula un puntaje de relevancia (Score) para un producto dada una consulta de búsqueda
 * Si no coincide con todos los términos requeridos, retorna 0
 */
export function scoreProduct(product: SmartSearchableProduct, query: string): number {
  const normQuery = normalizeText(query);
  if (!normQuery) return 1;

  const queryTokens = normQuery.split(" ").filter(Boolean);
  if (queryTokens.length === 0) return 1;

  const normName = normalizeText(product.name || "");
  const normCategory = normalizeText(product.category || "");
  const normDesc = normalizeText(product.description || "");
  const normBadge = normalizeText(product.badge || "");
  const normColors = normalizeText(product.colors || "");
  const normSizes = normalizeText(product.sizes || "");

  const nameWords = normName.split(" ").filter(Boolean);
  const catWords = normCategory.split(" ").filter(Boolean);
  const descWords = normDesc.split(" ").filter(Boolean);
  const badgeWords = normBadge.split(" ").filter(Boolean);
  const colorWords = normColors.split(" ").filter(Boolean);
  const sizeWords = normSizes.split(" ").filter(Boolean);

  let totalScore = 0;
  let allTokensMatched = true;

  for (const qToken of queryTokens) {
    let tokenScore = 0;

    // 1. Coincidencias directas por subcadena
    if (normName.includes(qToken)) tokenScore += 50;
    if (normCategory.includes(qToken)) tokenScore += 45;
    if (normBadge.includes(qToken)) tokenScore += 25;
    if (normColors.includes(qToken)) tokenScore += 20;
    if (normDesc.includes(qToken)) tokenScore += 15;
    if (normSizes.includes(qToken)) tokenScore += 10;

    // 2. Coincidencias a nivel de palabra con tolerancia ortográfica (Fuzzy / Levenshtein / Stems)
    if (tokenScore === 0) {
      for (const w of nameWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 40;
          break;
        }
      }
    }

    if (tokenScore === 0) {
      for (const w of catWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 35;
          break;
        }
      }
    }

    if (tokenScore === 0) {
      for (const w of descWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 15;
          break;
        }
      }
    }

    if (tokenScore === 0) {
      for (const w of badgeWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 15;
          break;
        }
      }
    }

    if (tokenScore === 0) {
      for (const w of colorWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 15;
          break;
        }
      }
    }

    if (tokenScore === 0) {
      for (const w of sizeWords) {
        if (isWordMatch(qToken, w)) {
          tokenScore += 10;
          break;
        }
      }
    }

    // 3. Expansión semántica por sinónimos e intenciones
    if (tokenScore === 0) {
      const synList = SYNONYM_MAP[qToken] || [];
      for (const syn of synList) {
        if (
          normName.includes(syn) ||
          normCategory.includes(syn) ||
          normDesc.includes(syn) ||
          normBadge.includes(syn) ||
          normColors.includes(syn)
        ) {
          tokenScore += 25;
          break;
        }
      }
    }

    // 4. Búsqueda de ofertas / descuentos
    if (
      tokenScore === 0 &&
      (qToken === "descuento" || qToken === "oferta" || qToken === "rebaja" || qToken === "barato")
    ) {
      if ((product.discount_percent && product.discount_percent > 0) || (product.original_price && product.original_price > product.sale_price)) {
        tokenScore += 30;
      }
    }

    if (tokenScore === 0) {
      allTokensMatched = false;
      break;
    }

    totalScore += tokenScore;
  }

  return allTokensMatched ? totalScore : 0;
}

/**
 * Filtra y ordena los productos integrando categoría, modalidad de presentación (unidad/combo),
 * motor inteligente de búsqueda y orden seleccionado
 */
export function filterAndSortProducts<T extends SmartSearchableProduct>(
  products: T[],
  selectedCategory: string,
  searchQuery: string,
  sortBy: string,
  presentationFilter: ProductPresentationType = "todos",
  selectedSubcategory: string = "Todas"
): T[] {
  const isSearching = searchQuery.trim().length > 0;

  // Filtrar y calcular scores de búsqueda
  const scoredItems = products
    .filter((p) => matchesCategoryFilter(p.category, selectedCategory))
    .filter((p) => matchesPresentationFilter(p, presentationFilter))
    .filter((p) => matchesSubcategory(p, selectedSubcategory))
    .map((p) => ({
      product: p,
      score: isSearching ? scoreProduct(p, searchQuery) : 1
    }))
    .filter((item) => item.score > 0);

  // Ordenamiento
  scoredItems.sort((a, b) => {
    // Si el usuario eligió un orden explícito de precio o nombre o descuento
    if (sortBy === "price-asc") {
      const priceA = Number(a.product.sale_price) || 0;
      const priceB = Number(b.product.sale_price) || 0;
      return priceA - priceB;
    }
    if (sortBy === "price-desc") {
      const priceA = Number(a.product.sale_price) || 0;
      const priceB = Number(b.product.sale_price) || 0;
      return priceB - priceA;
    }
    if (sortBy === "discount") {
      const discA = Number(a.product.discount_percent) || 0;
      const discB = Number(b.product.discount_percent) || 0;
      return discB - discA;
    }
    if (sortBy === "name-asc") {
      return (a.product.name || "").localeCompare(b.product.name || "", "es", { sensitivity: "base" });
    }

    // Si está buscando activamente y sortBy es "featured", priorizar por puntaje de relevancia
    if (isSearching && a.score !== b.score) {
      return b.score - a.score;
    }

    return 0;
  });

  return scoredItems.map((item) => item.product);
}
