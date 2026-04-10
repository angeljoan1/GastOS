import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { calcularSaldoCuenta } from "@/lib/calculations"
import type { Movimiento, Cuenta, Categoria, Presupuesto, Objetivo, SaldoCuenta } from "@/types"

export function useDashboardMemos({
  movimientos,
  selectedDate,
  cuentas,
  categorias,
  presupuestos,
  objetivos,
  locale,
}: {
  movimientos: { recientes: Movimiento[]; paraSaldo: Movimiento[] }
  selectedDate: Date
  cuentas: Cuenta[]
  categorias: Categoria[]
  presupuestos: Presupuesto[]
  objetivos: Objetivo[]
  locale: string
}) {
  const t = useTranslations()
  const sm = selectedDate.getMonth()
  const sy = selectedDate.getFullYear()

  return useMemo(() => {
    const hoy = new Date()
    const { recientes, paraSaldo } = movimientos
    const monthMovs = recientes.filter(m => {
      const d = new Date(m.created_at)
      const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return localD.getUTCMonth() === sm && localD.getUTCFullYear() === sy
    })
    const monthGastos = monthMovs.filter(m => (m.tipo ?? "gasto") === "gasto")
    const monthIngresos = monthMovs.filter(m => m.tipo === "ingreso")
    const totalGastos = monthGastos.reduce((a, m) => a + m.cantidad, 0)
    const totalIngresos = monthIngresos.reduce((a, m) => a + m.cantidad, 0)
    const balanceNeto = totalIngresos - totalGastos

    const saldos: SaldoCuenta[] = cuentas.map(c => ({
      cuenta: c,
      saldo_actual: calcularSaldoCuenta(c, paraSaldo),
    }))
    const patrimonioTotal = saldos.reduce((a, s) => a + s.saldo_actual, 0)

    const categoryTotals = monthGastos.reduce((acc, m) => {
      const catById = categorias.find(c => c.id === m.categoria)
      const catByLabel = categorias.find(c => c.label.toLowerCase() === m.categoria?.toLowerCase())
      const key = catById?.id ?? catByLabel?.id ?? m.categoria
      acc[key] = (acc[key] || 0) + m.cantidad
      return acc
    }, {} as Record<string, number>)

    const pieData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)

    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(sy, sm - (11 - i), 1)
      const movs = recientes.filter(m => {
        const md = new Date(m.created_at)
        const localMd = new Date(md.getTime() - md.getTimezoneOffset() * 60000)
        return localMd.getUTCMonth() === d.getMonth() && localMd.getUTCFullYear() === d.getFullYear()
      })
      const label = d.toLocaleDateString(locale, { month: "short" })
      const g = Math.round(movs.filter(m => (m.tipo ?? "gasto") === "gasto").reduce((a, m) => a + m.cantidad, 0) * 100) / 100
      const ing = Math.round(movs.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.cantidad, 0) * 100) / 100
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        gastos: g,
        ingresos: ing,
        balance: Math.round((ing - g) * 100) / 100,
      }
    })

    const last6Months = last12Months.slice(6)
    const topCategorias = pieData.slice(0, 5)
    const maxTopVal = topCategorias[0]?.value ?? 1
    const diasEnMes = new Date(sy, sm + 1, 0).getDate()
    const esMesActual = sm === hoy.getMonth() && sy === hoy.getFullYear()
    const diaActual = esMesActual ? hoy.getDate() : diasEnMes
    const diasRestantes = diasEnMes - diaActual
    const gastoDiario = diaActual > 0 ? totalGastos / diaActual : 0
    const gastoProyectado = Math.round(gastoDiario * diasEnMes * 100) / 100
    const ahorroProyectado = Math.round((totalIngresos - gastoProyectado) * 100) / 100
    const pctMes = Math.round((diaActual / diasEnMes) * 100)

    const mesAntDate = new Date(sy, sm - 1, 1)
    const mesAntMovs = recientes.filter(m => {
      const d = new Date(m.created_at)
      const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return localD.getUTCMonth() === mesAntDate.getMonth() && localD.getUTCFullYear() === mesAntDate.getFullYear()
    })
    const totalGastosMesAnt = mesAntMovs.filter(m => (m.tipo ?? "gasto") === "gasto").reduce((a, m) => a + m.cantidad, 0)
    const diasMesAnt = new Date(sy, sm, 0).getDate()
    const mediaDiariaAnt = diasMesAnt > 0 ? totalGastosMesAnt / diasMesAnt : 0
    const diffMedia = gastoDiario - mediaDiariaAnt
    const diffPct = mediaDiariaAnt > 0 ? Math.round((diffMedia / mediaDiariaAnt) * 100) : 0

    const ratioAhorro = totalIngresos > 0
      ? Math.round(((totalIngresos - totalGastos) / totalIngresos) * 100)
      : null
    const ratioColor = ratioAhorro === null ? "text-zinc-500"
      : ratioAhorro >= 20 ? "text-emerald-400"
      : ratioAhorro >= 5 ? "text-yellow-400"
      : "text-red-400"

    const gastoPorDia: Record<number, number> = {}
    monthGastos.forEach(m => {
      const d = new Date(m.created_at)
      const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      const dia = localD.getUTCDate()
      gastoPorDia[dia] = (gastoPorDia[dia] ?? 0) + m.cantidad
    })
    const maxGastoDia = Math.max(...Object.values(gastoPorDia), 0.01)

    const primerDiaSemana = new Date(sy, sm, 1).getDay()
    const offsetLunes = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1
    const diasGrid: (number | null)[] = [
      ...Array.from({ length: offsetLunes }, () => null),
      ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
    ]

    const objetivoAhorro = objetivos.find(o => o.tipo === "ahorro_mensual")
    const pctObjetivo = objetivoAhorro
      ? Math.min(Math.round((balanceNeto / objetivoAhorro.cantidad) * 100), 100)
      : null

    const gastoPrevMes = totalGastosMesAnt
    const ingPrevMes = mesAntMovs.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.cantidad, 0)
    const diffGastoMes = totalGastos - gastoPrevMes
    const diffIngMes = totalIngresos - ingPrevMes

    const diaMasCaro = Object.entries(gastoPorDia).sort(([, a], [, b]) => b - a)[0]

    const NOMBRES_DIA = t("dashboard.nombresDia").split(",")
    const gastoPorDiaSemana: Record<number, number> = {}
    monthGastos.forEach(m => {
      const d = new Date(m.created_at)
      const localD = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      const dow = localD.getUTCDay()
      gastoPorDiaSemana[dow] = (gastoPorDiaSemana[dow] ?? 0) + m.cantidad
    })
    const maxGastoDow = Math.max(...Object.values(gastoPorDiaSemana), 0.01)
    const dowData = [1, 2, 3, 4, 5, 6, 0].map(dow => ({
      dia: NOMBRES_DIA[dow],
      gasto: Math.round((gastoPorDiaSemana[dow] ?? 0) * 100) / 100,
    }))

    const distribucionPct = totalIngresos > 0
      ? Math.round((totalGastos / totalIngresos) * 100)
      : null

    const rachaMaxDias = esMesActual ? hoy.getDate() : diasEnMes
    let rachaDias = 0
    let rachaTopCat = ""
    if (topCategorias.length > 0) {
      rachaTopCat = topCategorias[0].name
      for (let d = rachaMaxDias; d >= 1; d--) {
        if (gastoPorDia[d] === undefined) rachaDias++
        else break
      }
    }

    const presupuestosConGasto = presupuestos
      .map(p => {
        const gastado = categoryTotals[p.categoria_id] ?? 0
        const pct = Math.min((gastado / p.cantidad) * 100, 100)
        const cat = categorias.find(c => c.id === p.categoria_id)
        return { ...p, gastado, pct, cat }
      })
      .filter(p => p.cat)

    const monthLabel = selectedDate.toLocaleDateString(locale, { month: "long", year: "numeric" })
    const DIAS_SEMANA = t("dashboard.diasSemana").split(",")

    return {
      monthMovs, monthGastos, monthIngresos,
      totalGastos, totalIngresos, balanceNeto,
      saldos, patrimonioTotal,
      categoryTotals, pieData, topCategorias, maxTopVal,
      last12Months, last6Months,
      diasEnMes, esMesActual, diaActual, diasRestantes,
      gastoDiario, gastoProyectado, ahorroProyectado, pctMes,
      mesAntMovs, totalGastosMesAnt, mediaDiariaAnt, diffMedia, diffPct,
      ratioAhorro, ratioColor,
      gastoPorDia, maxGastoDia, primerDiaSemana, offsetLunes, diasGrid,
      objetivoAhorro, pctObjetivo,
      gastoPrevMes, ingPrevMes, diffGastoMes, diffIngMes,
      diaMasCaro, gastoPorDiaSemana, maxGastoDow, dowData,
      distribucionPct, rachaDias, rachaTopCat,
      presupuestosConGasto,
      monthLabel, DIAS_SEMANA, NOMBRES_DIA,
    }
  }, [movimientos, sm, sy, cuentas, categorias, presupuestos, objetivos, locale, t])
}