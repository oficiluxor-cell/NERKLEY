import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nerkley-m4t2.vercel.app";

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NERKLEY | Luxury Online Store Oficial Colombia",
    template: "%s | NERKLEY",
  },
  description:
    "Tienda Oficial NERKLEY en Colombia. Perfumería exclusiva de autor y diseñador (100% auténticos con Batch Code verificable), calzado, moda selecta y joyería de lujo con envío asegurado nacional y pago protegido por Wompi Bancolombia.",
  keywords: [
    "NERKLEY",
    "Nerkley",
    "Nerkley Store",
    "nerkley colombia",
    "tienda nerkley",
    "perfumes nerkley",
    "nerkley online store",
    "perfumes originales colombia",
    "perfumes lattafa colombia",
    "jean paul gaultier colombia",
    "bond no 9 colombia",
    "parfums de marly colombia",
    "afnan 9pm colombia",
    "perfumeria de autor colombia",
    "concept store bogota medellin",
  ],
  authors: [{ name: "NERKLEY" }],
  creator: "NERKLEY",
  publisher: "NERKLEY",
  applicationName: "NERKLEY",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NERKLEY",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NERKLEY | Luxury Online Store Oficial Colombia",
    description:
      "Concept Store de Alta Gama en Colombia: perfumería de autor, moda selecta, calzado y accesorios exclusivos con entrega garantizada nacional.",
    url: SITE_URL,
    siteName: "NERKLEY",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "NERKLEY Luxury Online Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NERKLEY | Luxury Online Store Oficial Colombia",
    description:
      "Perfumería de autor, calzado de diseñador y piezas de colección en Colombia con envío asegurado.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google0a6c2d5544fba8e1",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Datos estructurados Schema.org para Google (Knowledge Graph & Búsqueda de Marca)
  const schemaOrganization = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "NERKLEY",
        alternateName: [
          "Nerkley",
          "Nerkley Store",
          "Nerkley Colombia",
          "NERKLEY Luxury Store",
          "Boutique Nerkley",
        ],
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon-512.png`,
          width: 512,
          height: 512,
        },
        description:
          "Concept Store oficial de alta gama en Colombia. Perfumería de autor y diseñador, streetwear exclusivo, calzado y joyería de lujo.",
        areaServed: {
          "@type": "Country",
          name: "Colombia",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "NERKLEY",
        alternateName: "Nerkley Store",
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: "es-CO",
      },
      {
        "@type": "OnlineStore",
        "@id": `${SITE_URL}/#store`,
        name: "NERKLEY Online Store",
        url: SITE_URL,
        currenciesAccepted: "COP",
        paymentAccepted: "Nequi, Bancolombia, PSE, Tarjeta de Crédito, Wompi",
        priceRange: "$$$$",
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "CO",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 5,
          returnMethod: "https://schema.org/ReturnByMail",
        },
      },
    ],
  };

  return (
    <html lang="es">
      <head>
        {/* Inyección de JSON-LD Schema.org para posicionamiento #1 en Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrganization) }}
        />
      </head>
      <body className={inter.className}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
