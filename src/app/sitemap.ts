import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nerkley-m4t2.vercel.app";

  // Páginas estáticas principales
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/video-ad`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at, created_at")
      .eq("is_active", true);

    if (products && products.length > 0) {
      const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${baseUrl}/product/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(p.created_at || Date.now()),
        changeFrequency: "weekly",
        priority: 0.9,
      }));

      return [...staticRoutes, ...productRoutes];
    }
  } catch (err) {
    console.error("Error al generar sitemap dinámico de productos:", err);
  }

  return staticRoutes;
}
