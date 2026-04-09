# GastOS

Aplicación PWA de gestión financiera personal. Diseñada como herramienta de uso diario y como proyecto de portafolio técnico.

**Demo en producción:** https://gast-os-psi.vercel.app

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Base de datos / Auth | Supabase (PostgreSQL + RLS) |
| Cifrado | Web Crypto API (AES-GCM + PBKDF2) |
| Gráficos | Recharts |
| i18n | next-intl (ES / EN / CA) |
| Despliegue | Vercel |

---

## Funcionalidades

- Registro de gastos, ingresos y transferencias entre cuentas
- Cifrado de extremo a extremo (E2EE): cantidades, notas y nombres de cuenta nunca se almacenan en claro en el servidor
- PIN de acceso derivado con PBKDF2-SHA256 (300.000 iteraciones) + salt aleatorio por usuario
- Desbloqueo biométrico (WebAuthn) como alternativa al PIN
- Dashboard personalizable con 18 widgets: mapa de calor, proyección de mes, ratio de ahorro, racha sin gastos, presupuestos por categoría...
- Historial paginado con búsqueda en memoria (necesaria porque las notas están cifradas en BD)
- Categorías y cuentas personalizables por usuario
- Importación y exportación CSV
- Pagos recurrentes con recordatorio mensual (soporte para periodos: mensual, bimestral, trimestral, semestral, anual)
- Soporte PWA: instalable en móvil, funciona como app nativa

---

## Decisiones técnicas destacadas

**Por qué E2EE con Web Crypto en lugar de CryptoJS**

CryptoJS usa Math.random() para generar IVs, lo que no es criptográficamente seguro. Web Crypto API es nativa del navegador, usa AES-GCM (cifrado autenticado que detecta manipulación del ciphertext) y genera IVs con crypto.getRandomValues(). El PIN nunca sale del dispositivo: solo se usa para derivar la CryptoKey en memoria.

**Por qué búsqueda en memoria en el Historial**

Las notas están cifradas en la base de datos. Supabase no puede hacer LIKE sobre texto cifrado. La solución es descargar los movimientos, descifrarlos en el cliente y filtrar en memoria. El tradeoff es aceptable para un volumen de datos personal.

**Por qué App Router y no Pages Router**

Next.js 15+ optimiza el bundle de cliente con Server Components. Aunque la app usa "use client" en la mayoría de componentes por la naturaleza interactiva de una PWA financiera, la arquitectura está preparada para migrar la carga inicial de datos a Server Components cuando Supabase SSR lo permita sin romper el flujo de autenticación con PIN.

---

## Arquitectura
app/
page.tsx              # Orquestador: auth, PIN, carga de datos, estado global
layout.tsx            # Providers: IntlProvider, viewport PWA
components/
auth/
AuthScreen.tsx      # Login / registro / recuperación de contraseña
PinPadScreen.tsx    # Creación y verificación del PIN + biometría
tabs/
IngresoTab.tsx      # Formulario de registro (gasto / ingreso / transferencia)
HistorialTab.tsx    # Listado paginado con filtros y búsqueda
DashboardTab.tsx    # 18 widgets de análisis financiero
modals/
SettingsModal.tsx   # Categorías, presupuestos, objetivos, idioma, seguridad
CuentasModal.tsx    # Gestión de cuentas / carteras
EditMovimientoModal.tsx
ImportCSVModal.tsx
ui/
BottomSheet.tsx     # Sheet nativo reutilizable
EncryptionBadge.tsx # Indicador visual E2EE
lib/
supabase.ts           # Singleton del cliente Supabase
crypto.ts             # Capa E2EE: deriveKeyFromPin, encryptData, decryptData
icons.ts              # Mapa de iconos Lucide por nombre
types/
index.ts              # Fuente única de verdad de tipos TypeScript
messages/
es.json / en.json / ca.json

---

## Instalación local

```bash
git clone https://github.com/angeljoan1/GastOS
cd GastOS
npm install
```

Crea `.env.local`:
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave
RESEND_API_KEY=tu_clave_resend

```bash
npm run dev
```

---

## Esquema de base de datos (Supabase)

Tablas principales: `movimientos`, `categorias`, `cuentas`, `presupuestos`, `objetivos`, `user_vault`, `app_config`

Todas las tablas tienen Row Level Security (RLS) activado. Los usuarios solo pueden leer y escribir sus propios datos.