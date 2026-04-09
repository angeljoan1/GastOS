// __tests__/utils.test.ts
// Tests de lógica pura sin dependencias de UI ni Supabase

import { describe, it, expect } from "vitest"

// ── mesesDePeriod ─────────────────────────────────────────────────────────────
// Copiamos la función aquí para testearla de forma aislada.
// Si en el futuro se extrae a lib/utils.ts, importar desde allí.
function mesesDePeriod(period?: string | null): number {
  switch (period) {
    case "bimonthly":  return 2
    case "quarterly":  return 3
    case "semiannual": return 6
    case "annual":     return 12
    default:           return 1
  }
}

describe("mesesDePeriod", () => {
  it("devuelve 1 para monthly", () => expect(mesesDePeriod("monthly")).toBe(1))
  it("devuelve 1 para undefined", () => expect(mesesDePeriod(undefined)).toBe(1))
  it("devuelve 1 para null", () => expect(mesesDePeriod(null)).toBe(1))
  it("devuelve 2 para bimonthly", () => expect(mesesDePeriod("bimonthly")).toBe(2))
  it("devuelve 3 para quarterly", () => expect(mesesDePeriod("quarterly")).toBe(3))
  it("devuelve 6 para semiannual", () => expect(mesesDePeriod("semiannual")).toBe(6))
  it("devuelve 12 para annual", () => expect(mesesDePeriod("annual")).toBe(12))
  it("devuelve 1 para valor desconocido", () => expect(mesesDePeriod("weekly")).toBe(1))
})

// ── calcularSaldoCuenta ───────────────────────────────────────────────────────
type Movimiento = {
  tipo?: string
  cantidad: number
  cuenta_id?: string | null
  cuenta_destino_id?: string | null
}

type Cuenta = {
  id: string
  saldo_inicial: number
}

function calcularSaldoCuenta(cuenta: Cuenta, movimientos: Movimiento[]): number {
  return movimientos.reduce((acc, m) => {
    if (m.tipo === "transferencia") {
      if (m.cuenta_id === cuenta.id) return acc - m.cantidad
      if (m.cuenta_destino_id === cuenta.id) return acc + m.cantidad
      return acc
    }
    if (m.cuenta_id !== cuenta.id) return acc
    return m.tipo === "ingreso" ? acc + m.cantidad : acc - m.cantidad
  }, cuenta.saldo_inicial)
}

describe("calcularSaldoCuenta", () => {
  const cuenta = { id: "c1", saldo_inicial: 1000 }

  it("saldo inicial sin movimientos", () => {
    expect(calcularSaldoCuenta(cuenta, [])).toBe(1000)
  })

  it("resta un gasto", () => {
    const movs: Movimiento[] = [{ tipo: "gasto", cantidad: 200, cuenta_id: "c1" }]
    expect(calcularSaldoCuenta(cuenta, movs)).toBe(800)
  })

  it("suma un ingreso", () => {
    const movs: Movimiento[] = [{ tipo: "ingreso", cantidad: 500, cuenta_id: "c1" }]
    expect(calcularSaldoCuenta(cuenta, movs)).toBe(1500)
  })

  it("resta en origen y suma en destino para transferencia", () => {
    const cuentaDest = { id: "c2", saldo_inicial: 0 }
    const movs: Movimiento[] = [{ tipo: "transferencia", cantidad: 300, cuenta_id: "c1", cuenta_destino_id: "c2" }]
    expect(calcularSaldoCuenta(cuenta, movs)).toBe(700)
    expect(calcularSaldoCuenta(cuentaDest, movs)).toBe(300)
  })

  it("ignora movimientos de otras cuentas", () => {
    const movs: Movimiento[] = [{ tipo: "gasto", cantidad: 100, cuenta_id: "c99" }]
    expect(calcularSaldoCuenta(cuenta, movs)).toBe(1000)
  })

  it("acumula múltiples movimientos", () => {
    const movs: Movimiento[] = [
      { tipo: "ingreso", cantidad: 2000, cuenta_id: "c1" },
      { tipo: "gasto",   cantidad: 500,  cuenta_id: "c1" },
      { tipo: "gasto",   cantidad: 250,  cuenta_id: "c1" },
    ]
    expect(calcularSaldoCuenta(cuenta, movs)).toBe(2250)
  })
})

// ── Filtro de pendientes recurrentes ─────────────────────────────────────────
describe("lógica de vencimiento recurrente", () => {
  it("detecta suscripción vencida del mes anterior", () => {
    const now = new Date()
    // Usamos día 1 del mes anterior: el vencimiento será día 1 de este mes,
    // que siempre es <= hoy (estamos al menos en día 1)
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12, 0, 0)

    const meses = mesesDePeriod("monthly")
    const vencimiento = new Date(
      mesAnterior.getFullYear(),
      mesAnterior.getMonth() + meses,
      mesAnterior.getDate(),
      12, 0, 0, 0
    )
    expect(vencimiento <= now).toBe(true)
  })

  it("no detecta como vencida una suscripción del mes actual", () => {
    const now = new Date()
    const estesMes = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0)

    const meses = mesesDePeriod("monthly")
    const vencimiento = new Date(
      estesMes.getFullYear(),
      estesMes.getMonth() + meses,
      estesMes.getDate(),
      12, 0, 0, 0
    )
    expect(vencimiento <= now).toBe(false)
  })
})