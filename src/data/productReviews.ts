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

// Generador pseudoaleatorio determinista para que cada producto tenga su propio universo único de reseñas
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

function cleanProductName(name: string): string {
  const cleaned = name
    .replace(/(perfume|locion|loción|eau de parfum|edp|edt|extracto|de|para|hombre|mujer|original|coleccion|edicion)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ");
  return words.slice(0, 3).join(" ") || name;
}

export function getProductReviews(name = "", category = "", slug = ""): {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
} {
  const seedStr = `${slug || "item"}-${name || "prod"}-nerkley-reviews`;
  const prng = createPRNG(seedStr);
  const cleanName = cleanProductName(name);
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

  // Plantillas orgánicas de comentarios colombianos para PERFUMES
  const perfumeTemplates = [
    (city: string) => `parce la vdd me sorprendio, este ${cleanName} huele melo y el aroma dura todo el dia`,
    (city: string) => `al principio tenia dudas por pagar en nequi pero todo firme, llego en 5 dias a ${city} bien empacado con plastico de burbuja`,
    (city: string) => `Llego rapido con interrapidisimo, el frasco pesa y se nota la calidad del atomizador`,
    (city: string) => `Huele riquísimo, es de esos perfumes que llaman la atencion sin empalagar. Me han preguntado varios que perfume llevo puesto ✨`,
    (city: string) => `calidad 10/10 parce, la fijacion me dura facil mas de 8 horas en piel y en la ropa hasta el dia siguiente`,
    (city: string) => `muy chimba, tenia miedo q se regara en el envio pero venia con cinta de seguridad y celofan sellado intacto`,
    (city: string) => `me llego ayer a ${city}, la proyeccion es una locura con 3 atomizaciones es suficiente para salir`,
    (city: string) => `El empaque de lujo uff, sellado con celofan de fabrica. Recomendado 100% vale la pena`,
    (city: string) => `Excelente compra, llego con guia de servientrega en 6 dias y el aroma de ${cleanName} es una joya`,
    (city: string) => `Segunda vez que compro en nerkley y todo diez puntos, el servicio al cliente por chat re atentos`,
    (city: string) => `se lo regale a mi novio y le fascino, el aroma es elegante y dura un monton`,
    (city: string) => `huele delicioso y dura bastante, ya le dije a mi primo pa pedir el otro frasco`,
    (city: string) => `la fijacion es brutal, me lo eche en la mañana para la oficina y en la tarde todavia se sentia clarito`,
    (city: string) => `Llego en perfecto estado a ${city}, tenia desconfianza por ser tienda nueva pero super cumplidos`,
    (city: string) => `la botella es pesada y se nota la calidad, el olor queda impregnado en todo lado 10/10`,
    (city: string) => `me llego a ${city} en 4 dias, la verdad tenia dudas pero el batch code salio bueno en checkfresh y la fijacion excelente`,
    (city: string) => `Aroma super sofisticado, no huele a alcohol como los baratos. Se nota la concentracion de aceites 👌`,
    (city: string) => `Lo compre por recomendacion de la asesora del chat y le pego al gusto mio, dulcecito amaderado brutal`,
    (city: string) => `buena estela y duracion, en mi piel facil 9 horas. El envio fue rapido con interrapidisimo`,
    (city: string) => `muy buen perfume la vdd, venia con su caja original sellada y empaque termico de proteccion`,
  ];

  // Plantillas para SNEAKERS / CALZADO
  const sneakerTemplates = [
    (city: string) => `llegaron melos los ${cleanName}, la talla me quedo precisa como la pedia`,
    (city: string) => `vienen en su caja bien protegida sin abolladuras, la suela tiene buen agarre y son comodisimos`,
    (city: string) => `tenia dudas con la talla pero le pregunte a la asesora en el chat y me recomendo mi talla normal y me quedo al pelo`,
    (city: string) => `una facha total puestos, los materiales se sienten de buena calidad no son de esos tiesos`,
    (city: string) => `llegaron a ${city} en 5 dias con guia de servientrega, muy contento con la compra`,
    (city: string) => `re comodos para caminar bastante y el diseño es identico al original, 10/10`,
    (city: string) => `amortiguan una chimba, me los puse el fin de semana y cero cansancio`,
    (city: string) => `la caja vino impecable con su papel protector, envio seguro y rapido a ${city}`,
  ];

  // Plantillas para GORRAS
  const capTemplates = [
    (city: string) => `la horma de la gorra es perfecta, la enviaron en caja dura asi que no vino aplastada`,
    (city: string) => `el broche trasero es firme y el bordado de ${cleanName} tiene relieve bien definido, 10 de 10`,
    (city: string) => `buena tela y no destiñe con el sudor ni el sol, me quedo al pelo`,
    (city: string) => `llego a ${city} en 4 dias con interrapidisimo, muy bacana la gorra`,
    (city: string) => `excelente acabado en visera y costuras, vale la pena`,
  ];

  // Plantillas para JOYERÍA
  const jewelryTemplates = [
    (city: string) => `el brillo es increible parece oro solido, me he bañado con ella y no se oxida ni pone negra`,
    (city: string) => `viene con un estuche re elegante, la compre para regalar y quede como un rey`,
    (city: string) => `el broche de seguridad es grueso y no se abre solo, excelente peso y calidad`,
    (city: string) => `llego a ${city} super bien empacada, brilla bastante con la luz natural`,
    (city: string) => `segunda pieza que compro en nerkley y la calidad es indiscutible`,
  ];

  // Plantillas para ROPA / HOODIES
  const clothingTemplates = [
    (city: string) => `la tela de ${cleanName} es pesada de buen gramaje, el estampado no se cae con el lavado`,
    (city: string) => `el corte oversize queda perfecto, pedi mi talla habitual y me quedo como queria`,
    (city: string) => `super abrigado y las costuras bien rematadas, se nota que no es tela barata`,
    (city: string) => `llego en empaque sellado a ${city}, el color es igualito a las fotos de la pagina`,
    (city: string) => `muy comoda para salir de noche, la tela no saca motas`,
  ];

  // Seleccionar la lista de plantillas correspondiente
  let templatePool = clothingTemplates;
  if (isPerfume) templatePool = perfumeTemplates;
  else if (isFootwear) templatePool = sneakerTemplates;
  else if (isCap) templatePool = capTemplates;
  else if (isJewelry) templatePool = jewelryTemplates;

  // Número dinámico de reseñas por producto: entre 7 y 10
  const reviewCount = 7 + Math.floor(prng() * 4);
  const reviews: Review[] = [];

  const usedNames = new Set<string>();
  const usedTemplateIdx = new Set<number>();

  for (let i = 0; i < reviewCount; i++) {
    // Generar autor único sin repetir en este producto
    let author = "";
    let attempts = 0;
    while (!author || (usedNames.has(author) && attempts < 30)) {
      const fn = FIRST_NAMES[Math.floor(prng() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(prng() * LAST_NAMES.length)];
      author = `${fn} ${ln}`;
      attempts++;
    }
    usedNames.add(author);

    // Ciudad y fecha variada
    const city = CITIES[Math.floor(prng() * CITIES.length)];
    const date = DATES[Math.floor(prng() * DATES.length)];

    // Calificación orgánica: 90% de 5 estrellas, 10% de 4 estrellas
    const isFiveStar = prng() > 0.12;
    const rating = isFiveStar ? 5 : 4;

    // Likes creíbles entre 2 y 16
    const likes = 2 + Math.floor(prng() * 15);

    // Seleccionar plantilla no repetida
    let tIdx = Math.floor(prng() * templatePool.length);
    let tAttempts = 0;
    while (usedTemplateIdx.has(tIdx) && tAttempts < 25) {
      tIdx = (tIdx + 1) % templatePool.length;
      tAttempts++;
    }
    usedTemplateIdx.add(tIdx);

    const comment = templatePool[tIdx](city);

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

  // Cálculo de promedio dinámico por producto (ej. 4.9 o 4.8)
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const rawAvg = sum / reviews.length;
  const averageRating = Number(rawAvg.toFixed(1));

  // Número total de opiniones mostrado en estadísticas (entre 26 y 48)
  const seedNum = (slug || name).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const totalReviews = 25 + (seedNum % 24);

  return {
    reviews,
    averageRating: Math.max(4.8, Math.min(5.0, averageRating)),
    totalReviews,
  };
}
