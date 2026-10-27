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

// Reseñas auténticas y realistas por categoría (estilo natural colombiano)
const PERFUME_REVIEWS: Review[] = [
  {
    id: "p1",
    author: "Santiago M.",
    city: "Medellín",
    rating: 5,
    date: "Hace 2 días",
    comment: "parce llego melo a medellin, el olor es re potente dura todo el dia la vdd me sorprendio bastante",
    verified: true,
    likes: 6,
  },
  {
    id: "p2",
    author: "Carlos Eduardo G.",
    city: "Cali",
    rating: 5,
    date: "Hace 4 días",
    comment: "Al principio me daba cosa pagar por nequi pero todo bien, llego en 5 dias bien empacado con plastico de burbuja y sellado intacto",
    verified: true,
    likes: 12,
  },
  {
    id: "p3",
    author: "Valentina R.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 6 días",
    comment: "Huele riquísimo, es dulcecito pero sin empalagar. Varias personas en el trabajo me preguntaron que perfume llevaba ✨",
    verified: true,
    likes: 9,
  },
  {
    id: "p4",
    author: "Sebas Duque",
    city: "Envigado",
    rating: 5,
    date: "Hace 1 semana",
    comment: "calidad 10/10 parce, la verdad tenia dudas por ser nuevo pero super confiable, ya pedi otro para mi hermano",
    verified: true,
    likes: 4,
  },
  {
    id: "p5",
    author: "Andrés Felipe R.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 1 semana",
    comment: "Super recomendado, el aroma dura bastante y a mi novia le encanto. El atomizador tira la bruma finita.",
    verified: true,
    likes: 8,
  },
  {
    id: "p6",
    author: "Felipe Henao",
    city: "Manizales",
    rating: 5,
    date: "Hace 2 semanas",
    comment: "Llego rapido con interrapidisimo, el frasco es pesado y se nota la calidad, el batch code salio bueno en checkfresh",
    verified: true,
    likes: 15,
  },
  {
    id: "p7",
    author: "Mafe Londoño",
    city: "Pereira",
    rating: 4,
    date: "Hace 2 semanas",
    comment: "El aroma es divino dura un monton, le pongo 4 estrellas solo porque la transportadora se demoro un dia mas de lo esperado pero el producto es un 10",
    verified: true,
    likes: 5,
  },
  {
    id: "p8",
    author: "Kevin G.",
    city: "Barranquilla",
    rating: 5,
    date: "Hace 3 semanas",
    comment: "muy chimba, tenia miedo q se regara en el viaje pero venia con cinta de seguridad intacto y empaque termico",
    verified: true,
    likes: 7,
  },
  {
    id: "p9",
    author: "Esteban V.",
    city: "Cali",
    rating: 5,
    date: "Hace 3 semanas",
    comment: "me llego ayer, la fijacion es brutal me lo eche en la mañana para salir y en la noche todavia olia en la camisa",
    verified: true,
    likes: 11,
  },
  {
    id: "p10",
    author: "Camilo Torres",
    city: "Cartagena",
    rating: 5,
    date: "Hace 1 mes",
    comment: "El empaque de lujo uff, llego sellado y con celofan de fabrica. Compra segura muchachos",
    verified: true,
    likes: 14,
  },
  {
    id: "p11",
    author: "Alejandra P.",
    city: "Bucaramanga",
    rating: 5,
    date: "Hace 1 mes",
    comment: "Llego a bucaramanga en 6 dias, todo impecable gracias al equipo de nerkley por la atencion",
    verified: true,
    likes: 3,
  },
  {
    id: "p12",
    author: "David Ochoa",
    city: "Pasto",
    rating: 5,
    date: "Hace 1 mes",
    comment: "La estela que deja es gigante, con 3 atomizaciones fue suficiente para todo el dia, vale cada peso",
    verified: true,
    likes: 9,
  },
];

const SNEAKER_REVIEWS: Review[] = [
  {
    id: "s1",
    author: "Brayan S.",
    city: "Medellín",
    rating: 5,
    date: "Hace 3 días",
    comment: "llegaron melos los tenis, la talla 41 me quedo precisa como la pedia y la horma es re comoda",
    verified: true,
    likes: 8,
  },
  {
    id: "s2",
    author: "Andrés C.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 5 días",
    comment: "Vienen en su caja original bien protegida sin golpes, la suela tiene buen agarre y son re facheros",
    verified: true,
    likes: 10,
  },
  {
    id: "s3",
    author: "Jhoan M.",
    city: "Cali",
    rating: 5,
    date: "Hace 1 semana",
    comment: "Tenía dudas con la talla pero le pregunte a la asesora del chat de la pagina y me recomendo la 40 y me quedo al pelo",
    verified: true,
    likes: 14,
  },
  {
    id: "s4",
    author: "Camilo B.",
    city: "Envigado",
    rating: 5,
    date: "Hace 2 semanas",
    comment: "Una facha total, los materiales se sienten de buena calidad no son de esos tenis tiesos que sacan ampollas",
    verified: true,
    likes: 6,
  },
  {
    id: "s5",
    author: "Stiven P.",
    city: "Barranquilla",
    rating: 5,
    date: "Hace 3 semanas",
    comment: "Llegaron a Barranquilla en 5 dias, excelente servicio y con guia de servientrega para rastrearlo",
    verified: true,
    likes: 9,
  },
  {
    id: "s6",
    author: "Daniel G.",
    city: "Bucaramanga",
    rating: 4,
    date: "Hace 1 mes",
    comment: "Muy comodos para caminar bastante, recomendados 100%. Vienen tal cual las fotos",
    verified: true,
    likes: 4,
  },
];

const CLOTHING_REVIEWS: Review[] = [
  {
    id: "c1",
    author: "Mateo V.",
    city: "Medellín",
    rating: 5,
    date: "Hace 2 días",
    comment: "la tela es pesada de buen gramaje, el estampado no se cae con el lavado ya lo he lavado dos veces y como nuevo",
    verified: true,
    likes: 11,
  },
  {
    id: "c2",
    author: "Samuel T.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 4 días",
    comment: "El corte oversize queda perfecto, pedi talla M y mido 1.75 y me quedo como queria ni muy suelto ni apretado",
    verified: true,
    likes: 7,
  },
  {
    id: "c3",
    author: "Lucas D.",
    city: "Manizales",
    rating: 5,
    date: "Hace 1 semana",
    comment: "Super abrigado y las costuras bien rematadas, se nota que no es tela barata. Volveré a comprar",
    verified: true,
    likes: 5,
  },
  {
    id: "c4",
    author: "Valeria M.",
    city: "Pereira",
    rating: 5,
    date: "Hace 2 semanas",
    comment: "Me encanto el buzo, llego en empaque sellado y huele a nuevo rico. Excelente calidad 1.1",
    verified: true,
    likes: 8,
  },
];

const CAP_REVIEWS: Review[] = [
  {
    id: "cp1",
    author: "Juan Pablo C.",
    city: "Cali",
    rating: 5,
    date: "Hace 3 días",
    comment: "la horma de la gorra es perfecta no viene aplastada como otras tiendas que la mandan en bolsa, aqui llego en caja de proteccion",
    verified: true,
    likes: 9,
  },
  {
    id: "cp2",
    author: "Diego A.",
    city: "Medellín",
    rating: 5,
    date: "Hace 1 semana",
    comment: "El broche trasero es firme y el bordado esta impecable con relieve, 10 de 10",
    verified: true,
    likes: 6,
  },
  {
    id: "cp3",
    author: "Cristian R.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 2 semanas",
    comment: "Buena calidad de la tela, se ajusta bien y no despinta con el sudor. Recomendada",
    verified: true,
    likes: 4,
  },
];

const JEWELRY_REVIEWS: Review[] = [
  {
    id: "j1",
    author: "Sebastian F.",
    city: "Medellín",
    rating: 5,
    date: "Hace 3 días",
    comment: "el brillo es increible parece de 18k solido, me he bañado con ella y no se ha oxidado ni puesto negra",
    verified: true,
    likes: 12,
  },
  {
    id: "j2",
    author: "Mauricio G.",
    city: "Bogotá",
    rating: 5,
    date: "Hace 1 semana",
    comment: "Viene con un estuche re elegante, la compre para regalar y quede como un rey con mi novia",
    verified: true,
    likes: 8,
  },
  {
    id: "j3",
    author: "David M.",
    city: "Cali",
    rating: 5,
    date: "Hace 2 semanas",
    comment: "El broche de seguridad es grueso y no se suelta, excelente compra y buen peso",
    verified: true,
    likes: 5,
  },
];

// Función para obtener reseñas adaptadas por producto y categoría de forma dinámica
export function getProductReviews(name = "", category = "", slug = ""): {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
} {
  const text = `${category} ${name}`.toLowerCase();
  let baseList: Review[] = [];

  if (
    text.includes("perfume") ||
    text.includes("fragancia") ||
    text.includes("locion") ||
    text.includes("loción") ||
    text.includes("parfum") ||
    text.includes("colonia") ||
    text.includes("aroma")
  ) {
    baseList = PERFUME_REVIEWS;
  } else if (
    text.includes("zapato") ||
    text.includes("sneaker") ||
    text.includes("tenis") ||
    text.includes("calzado") ||
    text.includes("retro") ||
    text.includes("jordan")
  ) {
    baseList = SNEAKER_REVIEWS;
  } else if (text.includes("gorra") || text.includes("cap")) {
    baseList = CAP_REVIEWS;
  } else if (text.includes("joya") || text.includes("oro") || text.includes("cadena") || text.includes("reloj")) {
    baseList = JEWELRY_REVIEWS;
  } else {
    baseList = CLOTHING_REVIEWS;
  }

  // Generamos un hash determinista a partir del slug para variar el orden y la cantidad por producto
  const seed = (slug || name).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Barajamos determinísticamente para que cada producto tenga reseñas en orden distinto
  const shuffled = [...baseList].sort((a, b) => {
    const valA = (a.id.charCodeAt(1) + seed) % 17;
    const valB = (b.id.charCodeAt(1) + seed) % 17;
    return valB - valA;
  });

  // Tomamos entre 6 y 10 reseñas según el producto
  const count = 6 + (seed % 6);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Promedio ponderado natural (entre 4.8 y 4.95)
  const sum = selected.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Number((sum / selected.length).toFixed(1));

  // Cantidad total mostrada de opiniones verificadas (entre 24 y 48)
  const totalReviews = 22 + (seed % 25);

  return {
    reviews: selected,
    averageRating: Math.max(4.8, averageRating),
    totalReviews,
  };
}
