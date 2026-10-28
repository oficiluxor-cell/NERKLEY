import React from "react";
import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-amber-400 selection:text-black">
      {/* Cabecera */}
      <header className="border-b border-white/10 bg-[#0e0e13]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#111115] border border-amber-400/30 flex items-center justify-center p-1 group-hover:scale-105 transition-all">
              <img src="/logo.svg" alt="NERKLEY" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-lg font-serif font-bold tracking-[0.25em] uppercase block leading-none">
                NERKLEY
              </span>
              <span className="text-[9px] uppercase tracking-widest text-amber-400 font-semibold">
                Políticas Oficiales
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            &larr; Volver a la Tienda
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-neutral-300 text-xs sm:text-sm leading-relaxed">
        <div className="border-b border-white/10 pb-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold block mb-2">
            Transparencia & Seguridad Jurídica
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-light uppercase tracking-wider text-white">
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="text-neutral-500 text-xs mt-2 font-mono">
            Última actualización: 27 de Octubre de 2026 • Conforme a la Ley 1581 de 2012 de Colombia
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            1. Identificación del Responsable del Tratamiento
          </h2>
          <p>
            <strong>NERKLEY LUXURY STORE</strong>, con operación comercial en la República de Colombia, es el responsable del tratamiento de los datos personales recolectados a través de su sitio web oficial y aplicación móvil para Android.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            2. Datos que Recolectamos
          </h2>
          <p>
            Para procesar tus pedidos, despachos y compras en línea de manera segura, solicitamos únicamente la información necesaria:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Nombres y apellidos completos</li>
            <li>Número de documento de identidad (cédula de ciudadanía o extranjería)</li>
            <li>Número de teléfono de contacto (móvil / WhatsApp para novedades de entrega)</li>
            <li>Correo electrónico (para envío de confirmación de pedido y comprobante de pago)</li>
            <li>Dirección física de entrega, ciudad y departamento en Colombia</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            3. Finalidad del Tratamiento de Datos
          </h2>
          <p>
            Los datos personales suministrados por el comprador se utilizarán exclusivamente para:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Procesar, preparar, embalar y remitir los pedidos a través de empresas transportadoras autorizadas (Interrapidísimo, Servientrega, Coordinadora, Envía).</li>
            <li>Gestionar el procesamiento y validación de pagos con la pasarela bancaria oficial de Wompi (Grupo Bancolombia).</li>
            <li>Enviar notificaciones sobre el estado de la orden, número de guía oficial y tiempos estimados de arribo.</li>
            <li>Brindar atención de servicio al cliente, garantías y cambios de producto.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            4. Seguridad de la Información y Pasarelas de Pago
          </h2>
          <p>
            En <strong>NERKLEY</strong> nunca almacenamos ni tenemos acceso a números de tarjetas de crédito, códigos de seguridad CVV o contraseñas bancarias de nuestros clientes. Todas las transacciones monetarias se procesan a través de la pasarela certificada <strong>Wompi (Grupo Bancolombia)</strong> bajo estándares internacionales de seguridad PCI-DSS y cifrado bancario SHA-256.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            5. Derechos de los Titulares (Habeas Data)
          </h2>
          <p>
            De conformidad con el artículo 8 de la Ley 1581 de 2012, el titular de los datos personales tiene derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos de nuestras bases de datos en cualquier momento.
          </p>
          <p>
            Para ejercer estos derechos, el usuario puede comunicarse directamente a través del asistente de soporte 24/7 integrado en la aplicación o mediante el botón de Mis Pedidos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            6. Modificaciones a la Política
          </h2>
          <p>
            NERKLEY se reserva el derecho de actualizar la presente política de privacidad en cualquier momento. Cualquier modificación será publicada de manera inmediata y visible en esta misma sección.
          </p>
        </section>

        <div className="pt-8 border-t border-white/10 flex justify-between items-center text-neutral-500 text-xs">
          <span>&copy; 2026 NERKLEY CONCEPTS. Todos los derechos reservados.</span>
          <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider">
            Regresar a la Boutique &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
