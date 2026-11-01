import { supabase } from "@/lib/supabase";

export interface Seller {
  id: string;
  created_at: string;
  store_name: string;
  slug: string;
  owner_name: string;
  owner_document: string;
  phone: string;
  email: string;
  password?: string;
  city: string;
  department: string;
  category: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  commission_rate: number; // Porcentaje de comisión para NERKLEY (ej. 12.0)
  status: "pending" | "verified" | "paused" | "rejected";
  is_verified: boolean;
  verified_at?: string | null;
  rating: number;
  total_sales_count: number;
  logo_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  video_url?: string | null;
  stories?: SellerStory[];
}

export interface SellerStory {
  id: string;
  seller_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  product_id?: string;
  product_name?: string;
  product_price?: number;
  product_slug?: string;
}

export interface SellerWallet {
  id: string;
  seller_id: string;
  balance_pending: number;   // Fondos en garantía / en camino (bloqueados)
  balance_available: number; // Fondos liberados disponibles para retirar
  balance_withdrawn: number; // Fondos totales ya transferidos
  total_earned: number;      // Ganancias netas históricas del vendedor
  total_commission_paid: number; // Ganancias obtenidas por NERKLEY
  updated_at: string;
}

export interface SellerPayout {
  id: string;
  created_at: string;
  seller_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: "pending" | "completed" | "rejected";
  proof_image_url?: string | null;
  notes?: string | null;
  paid_at?: string | null;
}

export interface SellerRegistrationInput {
  store_name: string;
  owner_name: string;
  owner_document: string;
  phone: string;
  email: string;
  password?: string;
  city: string;
  department: string;
  category: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  bio?: string;
}

/**
 * Calcula la división financiera entre la plataforma y el vendedor
 */
export function calculateOrderCommission(totalPrice: number, commissionRate: number = 12) {
  const safeRate = Math.max(0, Math.min(100, commissionRate));
  const platformFee = Math.round((totalPrice * safeRate) / 100);
  const sellerNet = totalPrice - platformFee;
  return {
    platformFee, // Dinero limpio que gana NERKLEY
    sellerNet,   // Dinero que le corresponde al vendedor (retenido hasta entrega)
    commissionRate: safeRate,
  };
}

/**
 * Registra una nueva solicitud de boutique / vendedor
 */
export async function registerNewSeller(data: SellerRegistrationInput): Promise<{ success: boolean; error?: string; seller?: Seller }> {
  try {
    const slug = data.store_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newSellerData = {
      store_name: data.store_name.trim(),
      slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
      owner_name: data.owner_name.trim(),
      owner_document: data.owner_document.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password || "seller123",
      city: data.city.trim(),
      department: data.department.trim(),
      category: data.category || "Variado",
      bank_name: data.bank_name.trim(),
      account_number: data.account_number.trim(),
      account_type: data.account_type || "Ahorros",
      commission_rate: 12.0, // Comisión base: 12%
      status: "pending",     // Siempre entra en revisión para que el dueño lo verifique
      is_verified: false,
      rating: 5.0,
      total_sales_count: 0,
      bio: data.bio || "",
    };

    const { data: inserted, error } = await supabase
      .from("sellers")
      .insert([newSellerData])
      .select()
      .single();

    if (error) {
      console.warn("Error Supabase al registrar vendedor, usando almacenamiento seguro local:", error.message);
      if (typeof window !== "undefined") {
        const localSellers = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
        const fallbackSeller = { ...newSellerData, id: `seller_${Date.now()}`, created_at: new Date().toISOString() };
        localSellers.push(fallbackSeller);
        localStorage.setItem("NERKLEY_local_sellers", JSON.stringify(localSellers));
        localStorage.setItem("NERKLEY_seller_session", JSON.stringify(fallbackSeller));
        return { success: true, seller: fallbackSeller as unknown as Seller };
      }
      return { success: false, error: error.message };
    }

    // Inicializar billetera del vendedor
    if (inserted?.id) {
      try {
        await supabase.from("seller_wallets").insert([
          {
            seller_id: inserted.id,
            balance_pending: 0,
            balance_available: 0,
            balance_withdrawn: 0,
            total_earned: 0,
            total_commission_paid: 0,
          },
        ]);
      } catch (wErr) {
        console.warn("Wallet creation error:", wErr);
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("NERKLEY_seller_session", JSON.stringify(inserted));
    }

    return { success: true, seller: inserted as Seller };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al procesar el registro" };
  }
}

/**
 * Iniciar sesión de vendedor
 */
export async function loginSeller(email: string, password?: string): Promise<{ success: boolean; error?: string; seller?: Seller }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Buscar en Supabase
    const { data, error } = await supabase
      .from("sellers")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (!error && data) {
      if (password && data.password && data.password !== password) {
        return { success: false, error: "Contraseña incorrecta. Por favor verifica tus datos." };
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("NERKLEY_seller_session", JSON.stringify(data));
      }
      return { success: true, seller: data as Seller };
    }

    // 2. Fallback a almacenamiento local si no está en la nube aún
    if (typeof window !== "undefined") {
      const localSellers: Seller[] = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
      const found = localSellers.find((s) => s.email.toLowerCase() === cleanEmail);
      if (found) {
        if (password && found.password && found.password !== password) {
          return { success: false, error: "Contraseña incorrecta." };
        }
        localStorage.setItem("NERKLEY_seller_session", JSON.stringify(found));
        return { success: true, seller: found };
      }
    }

    return { success: false, error: "No encontramos ninguna boutique con este correo electrónico." };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al iniciar sesión" };
  }
}

/**
 * Obtener la sesión actual del vendedor y sincronizar con la nube
 */
export async function getFreshSellerSession(): Promise<Seller | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("NERKLEY_seller_session");
  if (!raw) return null;

  try {
    const cached: Seller = JSON.parse(raw);
    if (!cached || (!cached.id && !cached.email)) return null;

    // Verificar en Supabase para obtener el estado más reciente (ej. si fue aprobado recientemente por el admin)
    const isUuid = cached.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cached.id);
    let query = supabase.from("sellers").select("*");
    
    if (isUuid) {
      query = query.eq("id", cached.id);
    } else if (cached.email) {
      query = query.eq("email", cached.email.toLowerCase().trim());
    } else {
      return cached;
    }

    const { data } = await query.maybeSingle();

    if (data) {
      localStorage.setItem("NERKLEY_seller_session", JSON.stringify(data));
      return data as Seller;
    }

    // Fallback a local sellers si el admin lo aprobó localmente
    const localSellers: Seller[] = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
    const localFound = localSellers.find((s) => (cached.id && s.id === cached.id) || (cached.email && s.email.toLowerCase() === cached.email.toLowerCase()));
    if (localFound) {
      localStorage.setItem("NERKLEY_seller_session", JSON.stringify(localFound));
      return localFound;
    }

    return cached;
  } catch (err) {
    console.warn("Error leyendo sesión del vendedor:", err);
    try {
      return JSON.parse(raw) as Seller;
    } catch {
      return null;
    }
  }
}

/**
 * Cerrar sesión del vendedor
 */
export function logoutSeller() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("NERKLEY_seller_session");
  }
}

/**
 * Obtener perfil de boutique por su slug, ID o nombre (Optimizado para carga instantánea)
 */
export async function getSellerBySlug(slugOrId: string): Promise<Seller | null> {
  const decoded = decodeURIComponent(slugOrId).trim().toLowerCase();
  const slugified = decoded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // 1. Verificación instantánea en memoria / sesión local (0 ms para el usuario dueño)
  if (typeof window !== "undefined") {
    try {
      const currentSessionRaw = localStorage.getItem("NERKLEY_seller_session");
      if (currentSessionRaw) {
        const sess: Seller = JSON.parse(currentSessionRaw);
        const sSlug = (sess.slug || "").toLowerCase();
        const sNameSlug = (sess.store_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const sNameDecoded = (sess.store_name || "").toLowerCase().trim();
        if (
          sess.id === slugOrId ||
          sSlug === decoded ||
          sSlug === slugified ||
          sNameSlug === slugified ||
          sNameDecoded === decoded
        ) {
          const stories = await getSellerStories(sess.id);
          return { ...sess, stories };
        }
      }

      const localSellers: Seller[] = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
      const matchLocal = localSellers.find((s) => {
        const sSlug = (s.slug || "").toLowerCase();
        const sNameSlug = (s.store_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const sNameDecoded = (s.store_name || "").toLowerCase().trim();
        return (
          s.id === slugOrId ||
          sSlug === decoded ||
          sSlug === slugified ||
          sNameSlug === slugified ||
          sNameDecoded === decoded
        );
      });

      if (matchLocal) {
        const stories = await getSellerStories(matchLocal.id);
        return { ...matchLocal, stories };
      }
    } catch {}
  }

  try {
    // 2. Consulta rápida en Supabase
    const { data: sellers } = await supabase.from("sellers").select("*");
    if (sellers && sellers.length > 0) {
      const match = sellers.find((s: Seller) => {
        const sSlug = (s.slug || "").toLowerCase();
        const sNameSlug = (s.store_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const sNameDecoded = (s.store_name || "").toLowerCase().trim();
        return (
          s.id === slugOrId ||
          sSlug === decoded ||
          sSlug === slugified ||
          sNameSlug === slugified ||
          sNameDecoded === decoded
        );
      });
      if (match) {
        const stories = await getSellerStories(match.id);
        return { ...match, stories };
      }
    }

    return null;
  } catch (err) {
    console.warn("Error obteniendo vendedor por slug:", err);
    return null;
  }
}

/**
 * Obtener todos los vendedores verificados (para descubrimiento y buscador)
 */
export async function getAllVerifiedSellers(): Promise<Seller[]> {
  try {
    const { data } = await supabase
      .from("sellers")
      .select("*")
      .eq("status", "verified")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) return data as Seller[];

    // Fallback a localStorage
    if (typeof window !== "undefined") {
      const localSellers: Seller[] = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
      return localSellers.filter((s) => s.status === "verified" || s.is_verified);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtener productos de un vendedor
 */
export async function getSellerProducts(sellerId: string, storeName?: string): Promise<any[]> {
  try {
    let query = supabase.from("products").select("*").eq("is_active", true);

    if (storeName) {
      query = query.or(`seller_id.eq.${sellerId},seller_name.eq.${storeName}`);
    } else {
      query = query.eq("seller_id", sellerId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) return data;

    // Fallback local
    if (typeof window !== "undefined") {
      const localProducts = JSON.parse(localStorage.getItem("NERKLEY_local_products") || "[]");
      return localProducts.filter(
        (p: any) => p.seller_id === sellerId || (storeName && p.seller_name?.toLowerCase() === storeName.toLowerCase())
      );
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Obtener historias (Stories) de una boutique
 */
export async function getSellerStories(sellerId: string): Promise<SellerStory[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`NERKLEY_stories_${sellerId}`);
    if (raw) {
      return JSON.parse(raw) as SellerStory[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Guardar una nueva historia para la boutique
 */
export async function saveSellerStory(
  sellerId: string,
  storyData: {
    image_url: string;
    caption?: string;
    product_id?: string;
    product_name?: string;
    product_price?: number;
    product_slug?: string;
  }
): Promise<SellerStory[]> {
  const newStory: SellerStory = {
    id: `story_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    seller_id: sellerId,
    image_url: storyData.image_url,
    caption: storyData.caption || "",
    created_at: new Date().toISOString(),
    product_id: storyData.product_id,
    product_name: storyData.product_name,
    product_price: storyData.product_price,
    product_slug: storyData.product_slug,
  };

  if (typeof window !== "undefined") {
    const existing = await getSellerStories(sellerId);
    const updated = [newStory, ...existing];
    localStorage.setItem(`NERKLEY_stories_${sellerId}`, JSON.stringify(updated));
    return updated;
  }

  return [newStory];
}

/**
 * Eliminar una historia de la boutique
 */
export async function deleteSellerStory(sellerId: string, storyId: string): Promise<SellerStory[]> {
  if (typeof window !== "undefined") {
    const existing = await getSellerStories(sellerId);
    const updated = existing.filter((s) => s.id !== storyId);
    localStorage.setItem(`NERKLEY_stories_${sellerId}`, JSON.stringify(updated));
    return updated;
  }
  return [];
}

/**
 * Actualizar datos de perfil de la boutique (Logo, Portada, Bio, etc.)
 */
export async function updateSellerProfile(sellerId: string, updates: Partial<Seller>): Promise<{ success: boolean; error?: string; seller?: Seller }> {
  try {
    // 1. Supabase
    const { data, error } = await supabase
      .from("sellers")
      .update(updates)
      .eq("id", sellerId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase update error (profile):", error.message);
    }

    // 2. Local session update
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("NERKLEY_seller_session");
      if (raw) {
        const cached: Seller = JSON.parse(raw);
        if (cached.id === sellerId) {
          const updated = { ...cached, ...updates };
          localStorage.setItem("NERKLEY_seller_session", JSON.stringify(updated));
        }
      }

      const localSellers: Seller[] = JSON.parse(localStorage.getItem("NERKLEY_local_sellers") || "[]");
      const idx = localSellers.findIndex((s) => s.id === sellerId);
      if (idx !== -1) {
        localSellers[idx] = { ...localSellers[idx], ...updates };
        localStorage.setItem("NERKLEY_local_sellers", JSON.stringify(localSellers));
      }
    }

    return { success: true, seller: (data || updates) as unknown as Seller };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Comprime una imagen seleccionada desde la galería o cámara del dispositivo
 * a un Data URL JPEG ultra optimizado (máx 1200px, ~150-250KB) en menos de 100ms.
 */
export async function compressImageFile(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer archivo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error al procesar imagen"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
