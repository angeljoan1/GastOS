// app/manifest.ts
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #25: El mismo archivo icon.png se declaraba tres veces con tamaños
//          inconsistentes (192×2 y 512), y dos entradas tenían el mismo
//          purpose="any". Android e iOS usaban el icono escalado con pérdida.
//
//          FIX: declaramos tres entradas semánticamente distintas:
//            1. 192×192 any        → icono estándar para pantallas normales
//            2. 512×512 any        → icono HD para splash screen y instalación
//               (si tienes un icon-512.png aparte, úsalo aquí; si no, icon.png)
//            3. 192×192 maskable   → icono adaptable para fondos de Android
//
//          Si solo tienes un archivo de icono, no pasa nada — el navegador
//          escala el de 512 para el uso de 192 mejor que al revés.
//          Lo ideal es tener icon-192.png e icon-512.png separados.

import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "GastOS - Tu dinero, bajo control",
    short_name:       "GastOS",
    description:      "Registro personal y seguro para el control diario de tus finanzas.",
    start_url:        "/",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#09090b",
    theme_color:      "#09090b",
    lang:             "es",
    id:               "/",
    scope:            "/",
    icons: [
      {
        // Icono estándar para uso general (launcher, notificaciones)
        src:     "/icon.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        // Icono de alta resolución para splash screen e instalación PWA
        // Si tienes un icon-512.png de mayor resolución, cámbialo aquí
        src:     "/icon.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
      {
        // Icono maskable: Android lo recorta con máscara circular/redondeada.
        // El contenido importante debe estar en el 80% central del icono.
        src:     "/icon.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
  }
}