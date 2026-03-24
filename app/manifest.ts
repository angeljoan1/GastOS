import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GastOS - Tu dinero, bajo control',
    short_name: 'GastOS',
    description: 'Registro personal y seguro para el control diario de tus finanzas.',
    start_url: '/',
    display: 'standalone', // <-- Imprescindible para que no parezca una web
    orientation: 'portrait', // Bloquea la app en vertical para que se vea mejor
    background_color: '#000000', // El negro ultra oscuro del fondo de la app
    theme_color: '#10b981', // Tu verde neón esmeralda
    lang: 'es',
    id: '/', // Ayuda a Android a identificar la app de forma única
    scope: '/', // Define qué URLs pertenecen a la app
    icons: [
      {
        src: '/icon.png', // Tu logo verde neón que Vercel ya conoce
        sizes: '192x192', // Tamaño estándar para Android
        type: 'image/png',
        purpose: 'any', // Uso normal del icono
      },
      {
        src: '/icon.png', // Re-usamos el mismo icono de alta resolución
        sizes: '512x512', // Tamaño grande para pantallas HD y Splash Screen
        type: 'image/png',
        purpose: 'any',
      },
      // ¡ESTE ES EL TRUCO PARA ANDROID!
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable', // <-- LE DICE A ANDROID: "NO ME PONGAS BORDE BLANCO, YO YA SÉ GESTIONAR MIS BORDES"
      },
    ],
  }
}