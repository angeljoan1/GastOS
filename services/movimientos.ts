// services/movimientos.ts
// Thin query-builder layer for movimientos.
// Encryption/decryption stays in the components — this layer only builds and
// executes the Supabase queries, keeping table names and filter patterns in one place.

import { supabase } from "@/lib/supabase"
import type { Movimiento, TipoMovimiento } from "@/types"

const TABLE = "movimientos" as const

export interface FetchMovimientosOptions {
  userId: string
  page?: number          // 0-based, 20 per page; omit for all
  categoria?: string
  tipo?: TipoMovimiento | "todos"
}

/** Returns raw rows (cantidad/nota still encrypted). */
export async function fetchMovimientosRaw(opts: FetchMovimientosOptions) {
  const { userId, page, categoria, tipo } = opts

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (categoria) q = q.eq("categoria", categoria)
  if (tipo === "gasto") q = q.or("tipo.eq.gasto,tipo.is.null")
  else if (tipo === "ingreso") q = q.eq("tipo", "ingreso")
  else if (tipo === "transferencia") q = q.eq("tipo", "transferencia")

  if (page !== undefined) {
    const from = page * 20
    q = q.range(from, from + 19)
  }

  return q
}

export interface InsertMovimientoPayload {
  userId: string
  cantidad: string        // already encrypted
  categoria: string
  nota: string | null     // already encrypted or null
  tipo: TipoMovimiento
  cuentaId: string | null
  cuentaDestinoId?: string | null
  fecha: string           // ISO string
  isRecurring: boolean
  recurPeriod?: Movimiento["recur_period"]
}

export async function insertMovimiento(p: InsertMovimientoPayload) {
  return supabase
    .from(TABLE)
    .insert({
      user_id: p.userId,
      cantidad: p.cantidad,
      categoria: p.categoria,
      nota: p.nota,
      tipo: p.tipo,
      cuenta_id: p.cuentaId,
      ...(p.cuentaDestinoId !== undefined ? { cuenta_destino_id: p.cuentaDestinoId } : {}),
      created_at: p.fecha,
      is_recurring: p.isRecurring,
      ...(p.isRecurring && p.recurPeriod ? { recur_period: p.recurPeriod } : {}),
    })
    .select("id")
}

export async function updateMovimiento(
  id: string,
  patch: {
    cantidad: string
    nota: string | null
    categoria: string
    created_at: string
    cuenta_id: string | null
  },
) {
  return supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
}

export async function deleteMovimiento(id: string) {
  return supabase.from(TABLE).delete().eq("id", id)
}

export async function fetchRecurrentes(userId: string) {
  return supabase
    .from(TABLE)
    .select("*")
    .eq("is_recurring", true)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function markRecurrenteUsed(id: string) {
  return supabase
    .from(TABLE)
    .update({ is_recurring: false })
    .eq("id", id)
}
