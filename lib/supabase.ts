// lib/supabase.ts
// ─── Singleton de Supabase ────────────────────────────────────────────────────
// IMPORTANTE: Este es el ÚNICO lugar donde se crea el cliente de Supabase.
// Todos los componentes deben importar desde aquí.
// reset-password/page.tsx tenía su propia instancia — BUG #7 corregido.
 
import { createClient } from "@supabase/supabase-js"
 
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)