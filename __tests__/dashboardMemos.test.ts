// __tests__/dashboardMemos.test.ts
// Tests para la lógica de cálculo del dashboard (funciones puras extraídas)

import { describe, it, expect } from "vitest"
import type { Movimiento, Cuenta } from "@/types"

// ── Helpers locales ───────────────────────────────────────────────────────────
function makeMovimiento(overrides: Partial<Movimiento> & { cantidad: number }): Movimiento {
  return {
    id: "m1",
    tipo: "gasto",
    categoria: "alimentacion",
    nota: null,
    cuenta_id: null,
    cuenta_destino_id: null,
    is_recurring: false,
    recur_period: null,
    created_at: new Date(2025, 3, 10).toISOString(), // April 10 2025
    ...overrides,
  }
}

// ── Función: calcularTopCategorias ────────────────────────────────────────────
// Replica la lógica de useDashboardMemos: agrupa gastos por categoría y devuelve top 5
function calcularTopCategorias(
  movimientos: Movimiento[],
  categorias: { id: string; label: string }[],
): { name: string; value: number }[] {
  const totals = movimientos
    .filter(m => (m.tipo ?? "gasto") === "gasto")
    .reduce((acc, m) => {
      const catById = categorias.find(c => c.id === m.categoria)
      const catByLabel = categorias.find(c => c.label.toLowerCase() === m.categoria?.toLowerCase())
      const key = catById?.id ?? catByLabel?.id ?? m.categoria
      acc[key] = (acc[key] || 0) + m.cantidad
      return acc
    }, {} as Record<string, number>)

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

describe("calcularTopCategorias", () => {
  const cats = [
    { id: "c1", label: "Alimentación" },
    { id: "c2", label: "Transporte" },
    { id: "c3", label: "Ocio" },
  ]

  it("devuelve lista vacía sin gastos", () => {
    expect(calcularTopCategorias([], cats)).toEqual([])
  })

  it("excluye ingresos del ranking", () => {
    const movs = [
      makeMovimiento({ tipo: "ingreso", categoria: "c1", cantidad: 1000 }),
      makeMovimiento({ tipo: "gasto", categoria: "c2", cantidad: 50 }),
    ]
    const result = calcularTopCategorias(movs, cats)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("c2")
  })

  it("agrega múltiples gastos de la misma categoría", () => {
    const movs = [
      makeMovimiento({ categoria: "c1", cantidad: 30 }),
      makeMovimiento({ categoria: "c1", cantidad: 20 }),
      makeMovimiento({ categoria: "c2", cantidad: 100 }),
    ]
    const result = calcularTopCategorias(movs, cats)
    expect(result[0]).toEqual({ name: "c2", value: 100 })
    expect(result[1]).toEqual({ name: "c1", value: 50 })
  })

  it("limita a 5 categorías", () => {
    const moreCats = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, label: `Cat ${i}` }))
    const movs = moreCats.map((c, i) =>
      makeMovimiento({ categoria: c.id, cantidad: (i + 1) * 10 })
    )
    expect(calcularTopCategorias(movs, moreCats)).toHaveLength(5)
  })

  it("ordena de mayor a menor", () => {
    const movs = [
      makeMovimiento({ categoria: "c3", cantidad: 10 }),
      makeMovimiento({ categoria: "c1", cantidad: 300 }),
      makeMovimiento({ categoria: "c2", cantidad: 150 }),
    ]
    const result = calcularTopCategorias(movs, cats)
    expect(result[0].name).toBe("c1")
    expect(result[1].name).toBe("c2")
    expect(result[2].name).toBe("c3")
  })

  it("redondea a 2 decimales", () => {
    const movs = [
      makeMovimiento({ categoria: "c1", cantidad: 10.001 }),
      makeMovimiento({ categoria: "c1", cantidad: 20.004 }),
    ]
    const result = calcularTopCategorias(movs, cats)
    expect(result[0].value).toBe(30.01)
  })
})

// ── Función: calcularTopIngresos ──────────────────────────────────────────────
function calcularTopIngresos(
  movimientos: Movimiento[],
  categorias: { id: string; label: string }[],
): { name: string; value: number }[] {
  const totals = movimientos
    .filter(m => m.tipo === "ingreso")
    .reduce((acc, m) => {
      const catById = categorias.find(c => c.id === m.categoria)
      const catByLabel = categorias.find(c => c.label.toLowerCase() === m.categoria?.toLowerCase())
      const key = catById?.id ?? catByLabel?.id ?? m.categoria
      acc[key] = (acc[key] || 0) + m.cantidad
      return acc
    }, {} as Record<string, number>)

  return Object.entries(totals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

describe("calcularTopIngresos", () => {
  const cats = [{ id: "salario", label: "Salario" }, { id: "freelance", label: "Freelance" }]

  it("devuelve lista vacía sin ingresos", () => {
    const movs = [makeMovimiento({ tipo: "gasto", categoria: "salario", cantidad: 100 })]
    expect(calcularTopIngresos(movs, cats)).toEqual([])
  })

  it("agrega ingresos de la misma categoría", () => {
    const movs = [
      makeMovimiento({ tipo: "ingreso", categoria: "salario", cantidad: 1200 }),
      makeMovimiento({ tipo: "ingreso", categoria: "salario", cantidad: 800 }),
      makeMovimiento({ tipo: "ingreso", categoria: "freelance", cantidad: 500 }),
    ]
    const result = calcularTopIngresos(movs, cats)
    expect(result[0]).toEqual({ name: "salario", value: 2000 })
    expect(result[1]).toEqual({ name: "freelance", value: 500 })
  })
})

// ── Función: calcularRatioAhorro ──────────────────────────────────────────────
function calcularRatioAhorro(totalIngresos: number, totalGastos: number): number | null {
  if (totalIngresos <= 0) return null
  return Math.round(((totalIngresos - totalGastos) / totalIngresos) * 100)
}

describe("calcularRatioAhorro", () => {
  it("devuelve null cuando no hay ingresos", () => {
    expect(calcularRatioAhorro(0, 100)).toBeNull()
  })

  it("devuelve 50 cuando se ahorra la mitad", () => {
    expect(calcularRatioAhorro(1000, 500)).toBe(50)
  })

  it("devuelve 0 cuando gastos = ingresos", () => {
    expect(calcularRatioAhorro(1000, 1000)).toBe(0)
  })

  it("devuelve negativo cuando se gasta más de lo que se ingresa", () => {
    expect(calcularRatioAhorro(1000, 1500)).toBe(-50)
  })

  it("devuelve 100 cuando no hay gastos", () => {
    expect(calcularRatioAhorro(1000, 0)).toBe(100)
  })
})

// ── Función: proyeccion ───────────────────────────────────────────────────────
function calcularProyeccion(totalGastos: number, diaActual: number, diasEnMes: number) {
  const gastoDiario = diaActual > 0 ? totalGastos / diaActual : 0
  const gastoProyectado = Math.round(gastoDiario * diasEnMes * 100) / 100
  return { gastoDiario, gastoProyectado }
}

describe("calcularProyeccion", () => {
  it("proyecta correctamente a fin de mes", () => {
    const { gastoProyectado } = calcularProyeccion(300, 10, 30)
    expect(gastoProyectado).toBe(900)
  })

  it("devuelve 0 cuando diaActual es 0", () => {
    const { gastoDiario } = calcularProyeccion(0, 0, 30)
    expect(gastoDiario).toBe(0)
  })
})
