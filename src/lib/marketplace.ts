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
