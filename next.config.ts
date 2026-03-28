import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            // Evita que la app se cargue en iframes (clickjacking)
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Evita que el navegador "adivine" el tipo de contenido
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // No enviar la URL completa como Referer a terceros
            // Importante para que el reset_token no aparezca en logs externos
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Restringe el acceso a APIs de hardware sensibles
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // Content Security Policy:
            // - default-src 'self': solo recursos del propio dominio
            // - script-src: permite scripts propios + inline (Next.js los necesita) + cdnjs para recharts
            // - connect-src: permite llamadas a Supabase y Resend
            // - style-src: permite estilos propios e inline (Tailwind los necesita)
            // - img-src: permite imágenes propias y data URIs
            // Ajusta los dominios de connect-src si cambias de proveedor
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval necesario para Next.js dev; en prod puedes quitarlo
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://api.resend.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;