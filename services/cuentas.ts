// services/cuentas.ts
// Helpers for updating the running balance (saldo_actual) on the cuentas table.
// saldo_actual is E2EE — we receive the plaintext delta and the current encrypted
// value is derived from AppDataContext (already decrypted in memory).

import { supabase } from "@/lib/supabase"
import { encryptData } from "@/lib/crypto"

/** Overwrites saldo_actual for a single account (encrypts the value). */
export async function saveSaldoActual(cuentaId: string, nuevoSaldo: number): Promise<void> {
  const cifrado = await encryptData(nuevoSaldo)
  await supabase
    .from("cuentas")
    .update({ saldo_actual: cifrado })
    .eq("id", cuentaId)
}

export type DeltaCuenta = {
  cuentaId: string
  /** Positive = balance grows, negative = balance shrinks. */
  delta: number
  saldoActual: number   // current plaintext balance from context
}

/** Applies a delta to one or more accounts and persists the result. */
export async function aplicarDeltaSaldo(deltas: DeltaCuenta[]): Promise<Record<string, number>> {
  const nuevos: Record<string, number> = {}
  await Promise.all(
    deltas.map(async ({ cuentaId, delta, saldoActual }) => {
      const nuevo = Math.round((saldoActual + delta) * 100) / 100
      nuevos[cuentaId] = nuevo
      await saveSaldoActual(cuentaId, nuevo)
    })
  )
  return nuevos
}
