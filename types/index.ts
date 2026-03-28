// types/index.ts
// ─── Fuente Única de Verdad para todos los tipos de GastOS ───
//
// CONVENCIÓN DE ENCRIPTACIÓN:
//   Los campos marcados con [E2EE] se almacenan cifrados en Supabase.
//   En memoria (estado React) siempre viajan en claro.
//   La capa de cifrado/descifrado vive exclusivamente en:
//     - lib/crypto.ts  (funciones)
//     - page.tsx       (descifrado al cargar desde BD)
//     - modales/tabs   (cifrado al escribir en BD)

export type TipoMovimiento = 'gasto' | 'ingreso' | 'transferencia'
export type TipoCategoria  = 'gasto' | 'ingreso' | 'ambos'
export type TipoCuenta     = 'banco' | 'efectivo' | 'tarjeta' | 'inversion' | 'otro'

// ─── Categoría ───────────────────────────────────────────────
export interface Categoria {
  id:         string
  user_id:    string
  label:      string        // en claro (no se cifra)
  icono:      string
  tipo:       TipoCategoria
  orden:      number
  created_at: string
}

// ─── Presupuesto mensual por categoría ───────────────────────
export interface Presupuesto {
  id:           string
  user_id:      string
  categoria_id: string
  cantidad:     number      // [E2EE] cifrado en BD, en claro en memoria
  created_at:   string
}

// ─── Cuenta / Cartera ────────────────────────────────────────
// nombre y saldo_inicial se cifran en BD [E2EE]
// En memoria siempre están en claro (page.tsx los descifra al cargar)
export interface Cuenta {
  id:            string
  user_id:       string
  nombre:        string     // [E2EE] cifrado en BD, en claro en memoria
  tipo:          TipoCuenta
  icono:         string
  color:         string
  saldo_inicial: number     // [E2EE] cifrado en BD, en claro en memoria
  created_at:    string
}

// ─── Movimiento ──────────────────────────────────────────────
// cantidad y nota se cifran en BD [E2EE]
// En memoria siempre están en claro
export interface Movimiento {
  id:                 string
  created_at:         string
  cantidad:           number        // [E2EE] cifrado en BD, en claro en memoria
  categoria:          string
  nota?:              string | null // [E2EE] cifrado en BD, en claro en memoria
  is_recurring?:      boolean
  recur_period?:      'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | null
  tipo?:              TipoMovimiento
  cuenta_id?:         string | null
  cuenta_destino_id?: string | null
}

// ─── Saldo calculado (UI only, no persiste en DB) ────────────
export interface SaldoCuenta {
  cuenta:       Cuenta
  saldo_actual: number
}

// ─── Objetivo de ahorro ──────────────────────────────────────
// cantidad se cifra en BD [E2EE]
// En memoria siempre está en claro
export interface Objetivo {
  id:         string
  user_id:    string
  tipo:       string        // 'ahorro_mensual' por ahora
  cantidad:   number        // [E2EE] cifrado en BD, en claro en memoria
  created_at: string
  updated_at: string
}