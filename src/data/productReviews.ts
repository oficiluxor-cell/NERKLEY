export interface Review {
  id: string;
  author: string;
  city?: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  likes?: number;
}

// PRNG determinista por producto para que cada artículo tenga su propia cantidad, notas y comentarios
function createPRNG(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function next() {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Mateo", "Santiago", "Sebastián", "Juan Camilo", "Andrés Felipe", "Daniel", "Kevin",
  "Brayan", "Julian", "Esteban", "Camilo", "Felipe", "David", "Alejandro", "Samuel",
  "Nicolás", "Valentina", "María José", "Daniela", "Camila", "Laura", "Mariana",
  "Sofía", "Alejandra", "Salomé", "Valeria", "Manuela", "Natalia", "Isabella", "Sara",
  "Jhoan", "Stiven", "Lucas", "Cristian", "Mauricio", "Diego", "Carlos", "Pablo", "Simón",
  "Gabriel", "Emmanuel", "Juan Pablo", "Tomás", "Martín", "Miguel Ángel", "Jorge", "Álvaro"
];

const LAST_NAMES = [
  "Henao", "M.", "Duque", "Restrepo", "Gómez", "Quintero", "Castaño", "Bedoya",
  "Osorio", "Cárdenas", "Mejía", "Vargas", "Torres", "Murillo", "Echeverri",
  "Arango", "Valencia", "Ospina", "Serna", "Uribe", "Agudelo", "Jaramillo",
  "Londoño", "Pérez", "Rojas", "Giraldo", "Morales", "Suárez", "Cardona", "Zapata",
  "Montoya", "Sierra", "Guzmán", "Patiño", "Herrera", "Guerrero", "Ortiz", "Muñoz"
];

const CITIES = [
  "Medellín", "Bogotá", "Cali", "Barranquilla", "Envigado", "Bucaramanga", "Pereira",
  "Manizales", "Cartagena", "Ibagué", "Pasto", "Santa Marta", "Itagüí", "Bello",
  "Floridablanca", "Dosquebradas", "Armenia", "Neiva", "Villavicencio", "Cúcuta",
  "Montería", "Palmira", "Popayán", "Valledupar", "Rionegro", "Sabaneta", "Chía"
];

const DATES = [
  "Ayer", "Hace 2 días", "Hace 3 días", "Hace 4 días", "Hace 5 días",
  "Hace 1 semana", "Hace 10 días", "Hace 2 semanas", "Hace 3 semanas", "El mes pasado"
];

// Comentarios espontáneos de compradores, variados en longitud y estilo auténtico (sin fórmulas rígidas)
const PERFUME_COMMENTS_VARIED: { text: (city: string) => string; rating: number }[] = [
  { text: (c) => "10 de 10 el perfume la fijacion dura resto", rating: 5 },
  { text: (c) => `ufff tremendo aroma me llego a ${c} en 4 dias todo melo`, rating: 5 },
  { text: (c) => "la verdad tenia dudas al principio pero llego bien empacado y sellado", rating: 5 },
  { text: (c) => "severa fijacion hermano facil 8 horas en piel", rating: 5 },
  { text: (c) => "el frasco es pesadito y el atomizador tira la bruma finita, muy contento", rating: 5 },
  { text: (c) => "en el trabajo me preguntaron varios que que perfume tenia puesto jajaja", rating: 5 },
  { text: (c) => "muy chimba el aroma la verdad vale totalmente la pena", rating: 5 },
  { text: (c) => `llego rapido con guia de servientrega a ${c} gracias`, rating: 5 },
  { text: (c) => "se lo regale a mi novio y le fascino, queda uno como un rey", rating: 5 },
  { text: (c) => "el batch code salio bueno coincide con la botella y la fijacion intacta", rating: 5 },
  { text: (c) => "en la ropa dura hasta el otro dia parce, recomendado", rating: 5 },
  { text: (c) => `llego intacto a ${c} cero derrames y buena atencion por el chat`, rating: 5 },
  { text: (c) => "muy buena compra huele delicioso", rating: 5 },
  { text: (c) => "mano que locura de perfume, proyecta durisimo", rating: 5 },
  { text: (c) => "super rapido el envio y todo 100% confiable", rating: 5 },
  { text: (c) => "10/10 recomendado", rating: 5 },
  { text: (c) => "el olor es brutal de verdad", rating: 5 },
  { text: (c) => "huele a millonario la verdad me encanto", rating: 5 },
  { text: (c) => "calidad pura, huele delicioso y dura todo el dia", rating: 5 },
  { text: (c) => `me llego hoy a ${c} bien protegido con plastico de burbuja`, rating: 5 },
  // Comentarios con 4 estrellas realistas
  { text: (c) => "huele muy rico solo que servientrega se demoro un dia mas pero de resto melo", rating: 4 },
  { text: (c) => "buena fijacion pense que proyectaba un poquito mas pero en piel dura sus 7 horas bien", rating: 4 },
  { text: (c) => "la caja llego un tris golpeada en una esquina por la transportadora pero la botella venia intacta y huele brutal", rating: 4 },
];

const SNEAKER_COMMENTS_VARIED: { text: (city: string) => string; rating: number }[] = [
  { text: (c) => "los tenis llegaron al pelo la talla me quedo precisa", rating: 5 },
  { text: (c) => `vienen en su caja bien cuidada y se ven brutales puestos, llegaron a ${c} en 4 dias`, rating: 5 },
  { text: (c) => "10/10 en comodidad y acabados", rating: 5 },
  { text: (c) => "tenia dudas con la talla pero pedi la habitual y me quedo exacta", rating: 5 },
  { text: (c) => "los materiales son de muy buena calidad no son tiesos", rating: 5 },
  { text: (c) => "todo en orden con el envio y la guia, satisfecho con la compra", rating: 5 },
  { text: (c) => "muy comodos para caminar, el diseño tal cual las fotos", rating: 4 },
  { text: (c) => "buena amortiguacion y acabados limpios", rating: 5 },
];

const CLOTHING_COMMENTS_VARIED: { text: (city: string) => string; rating: number }[] = [
  { text: (c) => "la tela es gruesa de buen gramaje, el corte queda perfecto", rating: 5 },
  { text: (c) => "me gusto mucho, el estampado se siente resistente y no se cae al lavar", rating: 5 },
  { text: (c) => `llego sellado a ${c}, pedi talla M y la caida de la prenda es excelente`, rating: 5 },
  { text: (c) => "calidad 10/10, las costuras vienen bien rematadas", rating: 5 },
  { text: (c) => "muy comodo y abrigado para el frio", rating: 5 },
  { text: (c) => "buena prenda, el color es idéntico a las fotos", rating: 4 },
];

const CAP_COMMENTS_VARIED: { text: (city: string) => string; rating: number }[] = [
  { text: (c) => "la horma es perfecta y no vino aplastada porque la mandaron en caja, 10 de 10", rating: 5 },
  { text: (c) => "el bordado viene en alto relieve bien definido y el broche ajusta firme", rating: 5 },
  { text: (c) => `buena gorra, me llego a ${c} en 4 dias sin novedad`, rating: 5 },
  { text: (c) => "la tela es de buena calidad y no pierde forma", rating: 5 },
  { text: (c) => "queda muy bien, buen ajuste", rating: 4 },
];

const JEWELRY_COMMENTS_VARIED: { text: (city: string) => string; rating: number }[] = [
  { text: (c) => "el brillo es impresionante y tiene buen peso, no se ha puesto negra", rating: 5 },
  { text: (c) => "viene con estuche elegante, ideal para regalo quedé muy bien", rating: 5 },
  { text: (c) => `llego a ${c} rapido y bien protegida, el broche es seguro y no se suelta`, rating: 5 },
  { text: (c) => "excelente acabado, brilla muy bonito con la luz", rating: 5 },
  { text: (c) => "buen peso y terminaciones prolijas", rating: 4 },
];

// Pool variado de cantidades totales para que NO todos los productos tengan la misma cantidad
const TOTAL_REVIEWS_POOL = [
  14, 21, 38, 47, 19, 56, 29, 63, 16, 42, 33, 51, 24, 68, 18, 36, 12, 27, 45, 59, 22, 31, 54
];

export function getProductReviews(name = "", category = "", slug = ""): {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
} {
  const seedStr = `${slug || "item"}-${name || "prod"}-nerkley-v3`;
  const prng = createPRNG(seedStr);
  const text = `${category} ${name}`.toLowerCase();

  const isPerfume =
    text.includes("perfume") ||
    text.includes("fragancia") ||
    text.includes("locion") ||
    text.includes("loción") ||
    text.includes("parfum") ||
    text.includes("colonia") ||
    text.includes("aroma") ||
    text.includes("rouge") ||
    text.includes("9pm") ||
    text.includes("club de nuit") ||
    text.includes("khamrah");

  const isFootwear =
    text.includes("zapato") ||
    text.includes("sneaker") ||
    text.includes("tenis") ||
    text.includes("calzado") ||
    text.includes("retro") ||
    text.includes("jordan") ||
    text.includes("dunk") ||
    text.includes("bota");

  const isCap = text.includes("gorra") || text.includes("cap");
  const isJewelry = text.includes("joya") || text.includes("oro") || text.includes("cadena") || text.includes("reloj");

  // Seleccionar banco según categoría
  let commentPool = CLOTHING_COMMENTS_VARIED;
  if (isPerfume) commentPool = PERFUME_COMMENTS_VARIED;
  else if (isFootwear) commentPool = SNEAKER_COMMENTS_VARIED;
  else if (isCap) commentPool = CAP_COMMENTS_VARIED;
  else if (isJewelry) commentPool = JEWELRY_COMMENTS_VARIED;

  // Cantidad total de reseñas: varía ampliamente de un producto a otro (ej: 14, 21, 38, 47, 63, etc.)
  const totalReviews = TOTAL_REVIEWS_POOL[Math.floor(prng() * TOTAL_REVIEWS_POOL.length)];

  // Cantidad de reseñas visibles en la cuadrícula (entre 4 y 12 dependiendo del producto)
  const visibleReviewCount = Math.max(4, Math.min(12, Math.floor(totalReviews / 5) + Math.floor(prng() * 3) + 2));

  const reviews: Review[] = [];
  const usedNames = new Set<string>();
  const usedComments = new Set<number>();

  for (let i = 0; i < visibleReviewCount; i++) {
    // Autor único
    let author = "";
    let attempts = 0;
    while (!author || (usedNames.has(author) && attempts < 30)) {
      const fn = FIRST_NAMES[Math.floor(prng() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(prng() * LAST_NAMES.length)];
      author = `${fn} ${ln}`;
      attempts++;
    }
    usedNames.add(author);

    const city = CITIES[Math.floor(prng() * CITIES.length)];
    const date = DATES[Math.floor(prng() * DATES.length)];
    const likes = 1 + Math.floor(prng() * 14);

    // Selección de comentario no repetido
    let cIdx = Math.floor(prng() * commentPool.length);
    let cAttempts = 0;
    while (usedComments.has(cIdx) && cAttempts < 30) {
      cIdx = (cIdx + 1) % commentPool.length;
      cAttempts++;
    }
    usedComments.add(cIdx);

    const item = commentPool[cIdx];
    const comment = item.text(city);
    const rating = item.rating;

    reviews.push({
      id: `rev-${slug}-${i}`,
      author,
      city,
      rating,
      date,
      comment,
      verified: true,
      likes,
    });
  }

  // Promedio ponderado real de este producto
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Number((sum / reviews.length).toFixed(1));

  return {
    reviews,
    averageRating: Math.max(4.7, Math.min(5.0, averageRating)),
    totalReviews,
  };
}
