import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Inicializar cliente Supabase con Service Role para permisos totales de Storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const BUCKET_NAME = "product-images";

// Helper para asegurar que el bucket exista y sea público
async function ensureBucketExists() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (!listError && buckets) {
      const exists = buckets.some((b) => b.name === BUCKET_NAME);
      if (exists) return true;
    }

    // Si no existe, crearlo como público
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });

    if (createError && !createError.message.includes("already exists")) {
      console.warn("No se pudo crear bucket:", createError.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("Error verificando bucket:", err?.message);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo de imagen" }, { status: 400 });
    }

    await ensureBucketExists();

    // Generar nombre de archivo único y limpio
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const fileName = `nerkley-${Date.now()}-${randomSuffix}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type || `image/${cleanExt}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error al subir a Supabase Storage:", uploadError);
      return NextResponse.json(
        { error: `Error en Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (err: any) {
    console.error("Error en POST /api/upload-image:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno procesando la imagen" },
      { status: 500 }
    );
  }
}
