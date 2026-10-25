import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NERKLEY Official Store',
  description: 'Elegancia Vanguardista',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* Script oficial de Wompi cargado de forma inmediata */}
        <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" />
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  )
}