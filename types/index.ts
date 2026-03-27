// types/index.ts
// ─── Fuente Única de Verdad para todos los tipos de GastOS ───

export type TipoMovimiento = 'gasto' | 'ingreso' | 'transferencia'
export type TipoCategoria  = 'gasto' | 'ingreso' | 'ambos'
export type TipoCuenta     = 'banco' | 'efectivo' | 'tarjeta' | 'inversion' | 'otro'

// ─── Categoría ───────────────────────────────────────────────
export interface Categoria {
  id:         string
  user_id:    string
  label:      string
  icono:      string
  tipo:       TipoCategoria
  orden:      number
  created_at: string
}

// ─── Presupuesto mensual por categoría ───────────────────────
// Opcional — el usuario puede o no asignar un límite a cada categoría de gasto.
export interface Presupuesto {
  id:           string
  user_id:      string
  categoria_id: string
  cantidad:     number
  created_at:   string
}

// ─── Cuenta / Cartera ────────────────────────────────────────
export interface Cuenta {
  id:            string
  user_id:       string
  nombre:        string
  tipo:          TipoCuenta
  icono:         string
  color:         string
  saldo_inicial: number
  created_at:    string
}

// ─── Movimiento ──────────────────────────────────────────────
export interface Movimiento {
  id:                 string
  created_at:         string
  cantidad:           number
  categoria:          string
  nota?:              string | null
  is_recurring?:      boolean
  tipo?:              TipoMovimiento
  cuenta_id?:         string | null
  cuenta_destino_id?: string | null
}

// ─── Saldo calculado (UI only, no persiste en DB) ────────────
export interface SaldoCuenta {
  cuenta:       Cuenta
  saldo_actual: number
}