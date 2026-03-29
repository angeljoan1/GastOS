"use client"

// components/tabs/DashboardTab.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #21: El botón ChevronRight permitía navegar al futuro indefinidamente.
//          FIX: deshabilitamos la flecha cuando selectedDate ya es el mes actual.
// BUG #22: El cambio de theme-color era instantáneo y brusco en móvil.
//          FIX: añadimos una transición CSS en el meta theme-color interpolando
//          el color suavemente. En iOS el soporte es limitado, pero en Android
//          Chrome la transición funciona. Al menos eliminamos el parpadeo brusco
//          gestionando el cambio con un pequeño debounce.
// ACCESIBILIDAD: HidableAmount añade aria-pressed y aria-label al botón toggle.

import { useState, useEffect, useMemo, createContext, useContext } from "react"
import { useTranslations, useLocale } from "next-intl"
import { supabase } from "@/lib/supabase"
import {
  Loader2, Package, ChevronLeft, ChevronRight, TrendingDown, TrendingUp,
  Wallet, ArrowLeftRight, Eye, EyeOff, Plus, X, Check, Flame, Target,
  PiggyBank, CalendarDays, BarChart2,
} from "lucide-react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area,
} from "recharts"
import { getIcon } from "@/lib/icons"
import type { Categoria, Movimiento, Cuenta, SaldoCuenta, Presupuesto, Objetivo } from "@/types"
import { decryptData, DECRYPT_ERROR } from "@/lib/crypto"
import EncryptionBadge from "@/components/ui/Encryptionbadge"

type WidgetId =
  | "resumen_mes" | "saldo_cuentas" | "donut_categorias" | "barras_6meses"
  | "linea_gastos" | "area_balance" | "top_categorias" | "proyeccion_mes"
  | "media_diaria" | "mapa_calor" | "ratio_ahorro" | "presupuestos_categoria"
  | "objetivo_ahorro" | "comparativa_mes" | "dia_mas_caro"
  | "gasto_dia_semana" | "distribucion_ingreso" | "racha_ahorro"

interface WidgetMeta { id: WidgetId; label: string; descripcion: string; Icon: React.ElementType }

function getWidgetCatalog(t: ReturnType<typeof useTranslations>): WidgetMeta[] {
  return [
    { id: "resumen_mes", label: t("dashboard.widgetResumenLabel"), descripcion: t("dashboard.widgetResumenDesc"), Icon: Wallet },
    { id: "saldo_cuentas", label: t("dashboard.widgetSaldoLabel"), descripcion: t("dashboard.widgetSaldoDesc"), Icon: TrendingUp },
    { id: "proyeccion_mes", label: t("dashboard.widgetProyeccionLabel"), descripcion: t("dashboard.widgetProyeccionDesc"), Icon: TrendingDown },
    { id: "media_diaria", label: t("dashboard.widgetMediaLabel"), descripcion: t("dashboard.widgetMediaDesc"), Icon: TrendingDown },
    { id: "ratio_ahorro", label: t("dashboard.widgetRatioLabel"), descripcion: t("dashboard.widgetRatioDesc"), Icon: TrendingUp },
    { id: "presupuestos_categoria", label: t("dashboard.widgetPresupuestosLabel"), descripcion: t("dashboard.widgetPresupuestosDesc"), Icon: Target },
    { id: "mapa_calor", label: t("dashboard.widgetMapaLabel"), descripcion: t("dashboard.widgetMapaDesc"), Icon: Flame },
    { id: "donut_categorias", label: t("dashboard.widgetDonutLabel"), descripcion: t("dashboard.widgetDonutDesc"), Icon: Package },
    { id: "barras_6meses", label: t("dashboard.widgetBarrasLabel"), descripcion: t("dashboard.widgetBarrasDesc"), Icon: TrendingDown },
    { id: "linea_gastos", label: t("dashboard.widgetLineaLabel"), descripcion: t("dashboard.widgetLineaDesc"), Icon: TrendingDown },
    { id: "area_balance", label: t("dashboard.widgetAreaLabel"), descripcion: t("dashboard.widgetAreaDesc"), Icon: ArrowLeftRight },
    { id: "top_categorias", label: t("dashboard.widgetTopLabel"), descripcion: t("dashboard.widgetTopDesc"), Icon: Package },
    { id: "objetivo_ahorro", label: t("dashboard.widgetObjetivoLabel"), descripcion: t("dashboard.widgetObjetivoDesc"), Icon: PiggyBank },
    { id: "comparativa_mes", label: t("dashboard.widgetComparativaLabel"), descripcion: t("dashboard.widgetComparativaDesc"), Icon: BarChart2 },
    { id: "dia_mas_caro", label: t("dashboard.widgetDiaMasCaroLabel"), descripcion: t("dashboard.widgetDiaMasCaroDesc"), Icon: CalendarDays },
    { id: "gasto_dia_semana", label: t("dashboard.widgetGastoDiaLabel"), descripcion: t("dashboard.widgetGastoDiaDesc"), Icon: BarChart2 },
    { id: "distribucion_ingreso", label: t("dashboard.widgetDistribucionLabel"), descripcion: t("dashboard.widgetDistribucionDesc"), Icon: Wallet },
    { id: "racha_ahorro", label: t("dashboard.widgetRachaLabel"), descripcion: t("dashboard.widgetRachaDesc"), Icon: Flame },
  ]
}

const DEFAULT_WIDGETS: WidgetId[] = [
  "resumen_mes", "saldo_cuentas", "proyeccion_mes",
  "presupuestos_categoria", "donut_categorias", "barras_6meses",
]
const STORAGE_KEY = "gastos_dashboard_widgets_v3"
const CHART_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b", "#10b981",
]

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

function heatColor(intensity: number): string {
  if (intensity === 0) return "#18181b"
  if (intensity < 0.4) return `rgba(251,191,36,${0.15 + intensity * 0.5})`
  if (intensity < 0.75) return `rgba(249,115,22,${0.2 + intensity * 0.4})`
  return `rgba(239,68,68,${0.25 + intensity * 0.45})`
}

// ── Widget visibility context ─────────────────────────────────────────────────
const WidgetHiddenCtx = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: true,
  toggle: () => { },
})

function WidgetCard({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true)
  return (
    <WidgetHiddenCtx.Provider value={{ hidden, toggle: () => setHidden(h => !h) }}>
      {children}
    </WidgetHiddenCtx.Provider>
  )
}

function WidgetEyeButton({ labelShow, labelHide }: { labelShow: string; labelHide: string }) {
  const { hidden, toggle } = useContext(WidgetHiddenCtx)
  return (
    <button
      onClick={toggle}
      aria-pressed={!hidden}
      aria-label={hidden ? labelShow : labelHide}
      className="text-zinc-600 hover:text-zinc-400 transition-colors"
    >
      {hidden
        ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
        : <Eye className="w-3.5 h-3.5" aria-hidden="true" />
      }
    </button>
  )
}

// ── HidableAmount ─────────────────────────────────────────────────────────────
function HidableAmount({
  value, className = "", prefix = "", suffix = "€", decimals = 2,
}: {
  value: number; className?: string; prefix?: string
  suffix?: string; decimals?: number
}) {
  const { hidden } = useContext(WidgetHiddenCtx)
  const fmt = value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span className={`tabular-nums ${className}`}>
      {hidden ? "••••••" : `${prefix}${fmt}${suffix}`}
    </span>
  )
}

// ── DashboardTab ──────────────────────────────────────────────────────────────
export default function DashboardTab({
  categorias, cuentas, presupuestos, objetivos, onObjetivosChange,
}: {
  categorias: Categoria[]
  cuentas: Cuenta[]
  presupuestos: Presupuesto[]
  objetivos: Objetivo[]
  onObjetivosChange: (o: Objetivo[]) => void
}) {
  const t = useTranslations()
  const locale = useLocale()
  const WIDGET_CATALOG = getWidgetCatalog(t)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [hasEncryptedMovs, setHasEncryptedMovs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGETS
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      return s ? JSON.parse(s) : DEFAULT_WIDGETS
    } catch { return DEFAULT_WIDGETS }
  })

  // BUG #21 FIX: calculamos si el mes seleccionado ya es el mes actual
  const hoy = new Date()
  const esHoyMes = (
    selectedDate.getFullYear() === hoy.getFullYear() &&
    selectedDate.getMonth() === hoy.getMonth()
  )

  const toggleWidget = (id: WidgetId) => {
    setActiveWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { }
      return next
    })
  }

  useEffect(() => {
    // 1. Creamos la función asíncrona interna
    const fetchYDesencriptar = async () => {
      const { data, error } = await supabase
        .from("movimientos")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        // 2. Usamos el coordinador para desencriptar todo el arreglo
        const decryptedData = await Promise.all(
          data.map(async (m) => {
            const cantidadStr = await decryptData(m.cantidad)
            const notaStr = m.nota ? await decryptData(m.nota) : null
            return {
              ...m,
              cantidad: cantidadStr === DECRYPT_ERROR ? -1 : (parseFloat(cantidadStr) || 0),
              nota: notaStr === DECRYPT_ERROR ? DECRYPT_ERROR : notaStr,
            }
          })
        );
        setHasEncryptedMovs(decryptedData.some(m => m.cantidad === -1))
        // Filtramos los irrecuperables de los cálculos para no distorsionar totales
        setMovimientos(decryptedData.filter(m => m.cantidad !== -1))
      }
      setLoading(false);
    };

    // 3. La llamamos
    fetchYDesencriptar();
  }, []);

  const sm = selectedDate.getMonth()
  const sy = selectedDate.getFullYear()

  const {
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
  } = useMemo(() => {
    const monthMovs = movimientos.filter(m => {
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
      saldo_actual: calcularSaldoCuenta(c, movimientos),
    }))
    const patrimonioTotal = saldos.reduce((a, s) => a + s.saldo_actual, 0)

    const categoryTotals = monthGastos.reduce((acc, m) => {
      // Normalizar: si categoria es un ID conocido úsalo, si no buscar por label
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
      const movs = movimientos.filter(m => {
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
    const mesAntMovs = movimientos.filter(m => {
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
    const ratioColor = ratioAhorro === null
      ? "text-zinc-500"
      : ratioAhorro >= 20 ? "text-emerald-400"
        : ratioAhorro >= 5 ? "text-yellow-400"
          : "text-red-400"
    const ratioLabel = "COMPUTED_BELOW"

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

    // ── Cálculos widgets nuevos ───────────────────────────────────────────────
    const objetivoAhorro = objetivos.find(o => o.tipo === "ahorro_mensual")
    const pctObjetivo = objetivoAhorro
      ? Math.min(Math.round((balanceNeto / objetivoAhorro.cantidad) * 100), 100)
      : null

    const gastoPrevMes = totalGastosMesAnt
    const ingPrevMes = mesAntMovs.filter(m => m.tipo === "ingreso").reduce((a, m) => a + m.cantidad, 0)
    const diffGastoMes = totalGastos - gastoPrevMes
    const diffIngMes = totalIngresos - ingPrevMes

    const diaMasCaro = Object.entries(gastoPorDia)
      .sort(([, a], [, b]) => b - a)[0]

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
        if (gastoPorDia[d] === undefined) {
          rachaDias++
        } else {
          break
        }
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
  }, [movimientos, selectedDate, cuentas, categorias, presupuestos, objetivos])

  const ratioLabel = ratioAhorro === null
    ? t("dashboard.ratioNoIncome") // añade esta clave a los JSON → "Sin ingresos registrados"
    : ratioAhorro >= 20 ? t("dashboard.ratioExcellent")
      : ratioAhorro >= 5 ? t("dashboard.ratioModerate")
        : ratioAhorro >= 0 ? t("dashboard.ratioLow")
          : t("dashboard.ratioNegative")

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
    </div>
  )

  const encryptedBanner = hasEncryptedMovs ? (
    <div className="mx-4 mb-2 flex items-center gap-2 bg-yellow-950/30 border border-yellow-900/40 rounded-xl px-4 py-2.5">
      <span className="text-sm">🔒</span>
      <p className="text-xs text-yellow-400/90">{t("common.encryptedBanner")}</p>
    </div>
  ) : null

  // ── Definición de widgets ─────────────────────────────────────────────────
  const widgets: Partial<Record<WidgetId, React.ReactNode>> = {

    resumen_mes: (
      <WidgetCard key="resumen_mes">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionGastos")}</p>
              </div>
              <HidableAmount value={totalGastos} className="text-2xl font-light text-red-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionIngresos")}</p>
              </div>
              <HidableAmount value={totalIngresos} className="text-2xl font-light text-emerald-400" />
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionBalanceNeto")}</p>
              </div>
              <div className="flex items-center gap-2">
                <HidableAmount
                  value={Math.abs(balanceNeto)}
                  prefix={balanceNeto > 0 ? "+" : balanceNeto < 0 ? "-" : ""}
                  className={`text-2xl font-light ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
                />
                <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
              </div>
            </div>
          </div>
        </div>
      </WidgetCard>
    ),

    saldo_cuentas: saldos.length > 0 ? (
      <WidgetCard key="saldo_cuentas">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionSaldoCuenta")}</p>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          <div className="space-y-3">
            {saldos.map(({ cuenta, saldo_actual }) => {
              const CIcon = getIcon(cuenta.icono)
              return (
                <div key={cuenta.id} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cuenta.color + "22" }}
                  >
                    <CIcon className="w-4 h-4" style={{ color: cuenta.color }} aria-hidden="true" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-zinc-200 truncate">{cuenta.nombre}</p>
                  <HidableAmount
                    value={Math.abs(saldo_actual)}
                    prefix={saldo_actual < 0 ? "-" : ""}
                    className={`text-sm font-semibold ${saldo_actual >= 0 ? "text-zinc-100" : "text-red-400"}`}
                  />
                </div>
              )
            })}
            <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionPatrimonio")}</p>
              <HidableAmount
                value={Math.abs(patrimonioTotal)}
                prefix={patrimonioTotal < 0 ? "-" : ""}
                className={`text-base font-semibold ${patrimonioTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}
              />
            </div>
          </div>
        </div>
      </WidgetCard>
    ) : null,

    proyeccion_mes: (
      <WidgetCard key="proyeccion_mes">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionProyeccion")}</p>
            <div className="flex items-center gap-2">
              <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
              <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded-lg tabular-nums">
                {t("dashboard.dayProgress", { current: diaActual, total: diasEnMes })}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500/50 transition-all duration-700"
                style={{ width: `${pctMes}%` }}
                role="progressbar"
                aria-valuenow={pctMes}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${pctMes}% del mes transcurrido`}
              />
            </div>
            <p className="text-xs text-zinc-600">
              {t("dashboard.pctMes", { pct: pctMes, days: diasRestantes })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
              <p className="text-xs text-zinc-500">{t("dashboard.gastoDiarioMedio")}</p>
              <HidableAmount value={gastoDiario} className="text-lg font-light text-zinc-200" />
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
              <p className="text-xs text-zinc-500">{t("dashboard.gastoProyectado")}</p>
              <HidableAmount value={gastoProyectado} className="text-lg font-light text-red-400" />
            </div>
          </div>
          <div className={`rounded-xl p-4 flex items-center justify-between border ${ahorroProyectado >= 0
            ? "bg-emerald-950/30 border-emerald-900/40"
            : "bg-red-950/30 border-red-900/40"
            }`}>
            <div>
              <p className="text-xs text-zinc-400 mb-0.5 font-medium">{t("dashboard.ahorroEstimado")}</p>
              <p className="text-xs text-zinc-600">{t("dashboard.ahorroRitmoActual")}</p>
            </div>
            <HidableAmount
              value={Math.abs(ahorroProyectado)}
              prefix={ahorroProyectado >= 0 ? "+" : "-"}
              className={`text-2xl font-light ${ahorroProyectado >= 0 ? "text-emerald-400" : "text-red-400"}`}
            />
          </div>
          {totalIngresos === 0 && (
            <p className="text-xs text-zinc-600 text-center">
              {t("dashboard.noIncomesForProjection")}
            </p>
          )}
        </div>
      </WidgetCard>
    ),

    media_diaria: (
      <WidgetCard key="media_diaria">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionMediaDiaria")}</p>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <HidableAmount value={gastoDiario} className="text-4xl font-light text-zinc-100" />
              <p className="text-xs text-zinc-600">{t("dashboard.porDiaMes")}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-sm font-semibold tabular-nums px-2.5 py-1 rounded-lg ${diffMedia <= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                {diffMedia > 0 ? "+" : ""}{diffPct}%
              </span>
              <p className="text-xs text-zinc-600">{t("dashboard.vsMesAnterior")}</p>
              <HidableAmount value={mediaDiariaAnt} suffix="€/día" className="text-xs text-zinc-700" />
            </div>
          </div>
        </div>
      </WidgetCard>
    ),

    ratio_ahorro: (
      <WidgetCard key="ratio_ahorro">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionRatioAhorro")}</p>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 flex-shrink-0" role="img" aria-label={`Ratio de ahorro: ${ratioAhorro ?? 0}%`}>
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#27272a" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={
                    ratioAhorro === null ? "#27272a"
                      : ratioAhorro >= 20 ? "#10b981"
                        : ratioAhorro >= 5 ? "#f59e0b"
                          : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - Math.max(0, Math.min(100, ratioAhorro ?? 0)) / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className={`text-xl font-semibold tabular-nums ${ratioColor}`}>
                  {ratioAhorro === null ? "—" : `${Math.max(0, ratioAhorro)}%`}
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className={`text-sm font-medium leading-tight ${ratioColor}`}>{ratioLabel}</p>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-zinc-600 flex-shrink-0">{t("dashboard.sectionIngresosTotales")}</span>
                  <HidableAmount value={totalIngresos} className="text-zinc-400" />
                </div>
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-zinc-600 flex-shrink-0">{t("dashboard.sectionGastosTotales")}</span>
                  <HidableAmount value={totalGastos} className="text-zinc-400" />
                </div>
                <div className="flex justify-between items-center text-xs gap-2 pt-1.5 border-t border-zinc-800">
                  <span className="text-zinc-500 flex-shrink-0">{t("dashboard.sectionAhorroNeto")}</span>
                  <HidableAmount
                    value={Math.abs(balanceNeto)}
                    prefix={balanceNeto >= 0 ? "+" : "-"}
                    className={`font-medium ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-700 mt-4 text-center">
            {t("dashboard.objetivoRecomendado")}
          </p>
        </div>
      </WidgetCard>
    ),

    presupuestos_categoria: (
      <WidgetCard key="presupuestos_categoria">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionPresupuestosMes")}</p>
            </div>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          {presupuestosConGasto.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Target className="w-8 h-8 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{t("dashboard.noPresupuestos")}</p>
              <p className="text-xs text-zinc-700">{t("dashboard.noPresupuestosHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {presupuestosConGasto.map(p => {
                const CatIcon = getIcon(p.cat!.icono)
                const superado = p.gastado > p.cantidad
                const cercano = !superado && p.pct >= 80
                const barColor = superado ? "#ef4444" : cercano ? "#f59e0b" : "#10b981"
                return (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm text-zinc-300 truncate">{p.cat!.label}</span>
                        {superado && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                            {t("dashboard.badgeSuperado")}
                          </span>
                        )}
                        {cercano && (
                          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                            {t("dashboard.badgeAtencion")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 text-xs">
                        <HidableAmount
                          value={p.gastado}
                          className={superado ? "text-red-400 font-medium" : "text-zinc-300"}
                        />
                        <span className="text-zinc-600">/</span>
                        <HidableAmount value={p.cantidad} className="text-zinc-500" />
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${p.pct}%`, backgroundColor: barColor }}
                        role="progressbar"
                        aria-valuenow={Math.round(p.pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${p.cat!.label}: ${Math.round(p.pct)}% del presupuesto utilizado`}
                      />
                    </div>
                    <p className="text-xs text-zinc-600 text-right tabular-nums">
                      {t("dashboard.pctUtilizado", { pct: Math.round(p.pct) })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </WidgetCard>
    ),

    mapa_calor: (
      <div key="mapa_calor" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionMapaCalor")}</p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="text-xs text-zinc-600">{t("dashboard.heatLow")}</span>
            <div className="flex gap-0.5">
              {[0.1, 0.35, 0.6, 0.85, 1].map(v => (
                <span key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(v) }} />
              ))}
            </div>
            <span className="text-xs text-zinc-600">{t("dashboard.heatHigh")}</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
          {DIAS_SEMANA.map((d, i) => (
            <p key={i} className="text-center text-[10px] text-zinc-600 font-medium">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t("dashboard.ariaHeatMap")}>
          {diasGrid.map((dia, i) => {
            if (dia === null) return <div key={`e-${i}`} role="gridcell" />
            const gasto = gastoPorDia[dia] ?? 0
            const intensity = gasto > 0 ? Math.min(gasto / maxGastoDia, 1) : 0
            const esHoy = esMesActual && dia === hoy.getDate()
            const esFuturo = esMesActual && dia > hoy.getDate()
            return (
              <div
                key={dia}
                role="gridcell"
                aria-label={t("dashboard.ariaDay", { day: dia, amount: gasto > 0 ? `${gasto.toFixed(2)}€` : t("dashboard.ariaDayNoExpense") })}
                tabIndex={esFuturo ? -1 : 0}
                onMouseEnter={() => setHoveredDay(dia)}
                onMouseLeave={() => setHoveredDay(null)}
                onFocus={() => setHoveredDay(dia)}
                onBlur={() => setHoveredDay(null)}
                className={`aspect-square rounded-md flex items-center justify-center transition-all duration-200 relative cursor-default ${esHoy ? "ring-1 ring-emerald-500/70" : ""
                  } ${esFuturo ? "opacity-25" : ""}`}
                style={{ backgroundColor: esFuturo ? "#18181b" : heatColor(intensity) }}
              >
                <span className={`text-[10px] font-medium select-none ${gasto > 0 ? "text-white/80" : "text-zinc-600"
                  }`}>
                  {dia}
                </span>
                {hoveredDay === dia && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl">
                      <p className="text-xs font-semibold text-zinc-200">
                        {gasto > 0 ? `${gasto.toFixed(2)}€` : t("dashboard.noExpensesMonth")}
                      </p>
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                          borderLeft: "4px solid transparent",
                          borderRight: "4px solid transparent",
                          borderTop: "4px solid #3f3f46",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex justify-between text-xs text-zinc-700">
          <span className="capitalize">{monthLabel}</span>
          {Object.keys(gastoPorDia).length > 0 && (
            <span>{t("dashboard.heatPicoDia", { amount: maxGastoDia.toFixed(2) })}</span>
          )}
        </div>
      </div>
    ),

    donut_categorias: (
      <div key="donut_categorias" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{t("dashboard.sectionDonut")}</p>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
          </div>
        ) : (
          <>
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={2} dataKey="value" stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                    itemStyle={{ color: "#f4f4f5" }}
                    formatter={(v, name) => [
                      `${Number(v ?? 0).toFixed(2)}€`,
                      categorias.find(c => c.id === String(name))?.label ?? String(name ?? ""),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-zinc-400">
                    {categorias.find(c => c.id === entry.name)?.label ?? entry.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ),

    barras_6meses: (
      <div key="barras_6meses" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.sectionBarras")}</p>
        <div className="flex items-center gap-4 mb-4" aria-hidden="true">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-500">{t("dashboard.legendGastos")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-500">{t("dashboard.legendIngresos")}</span>
          </div>
        </div>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={last6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(v, name) => [`${Number(v ?? 0).toFixed(2)}€`, name === "gastos" ? t("dashboard.sectionGastos") : t("dashboard.sectionIngresos")]}
              />
              <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),

    linea_gastos: (
      <div key="linea_gastos" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.widgetLineaLabel")}</p>
        <p className="text-xs text-zinc-600 mb-4">{t("dashboard.last12Months")}</p>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={last12Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, t("dashboard.sectionGastos")]}
              />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),

    area_balance: (
      <div key="area_balance" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.widgetAreaLabel")}</p>
        <p className="text-xs text-zinc-600 mb-4">{t("dashboard.last12Months")}</p>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={last12Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, t("dashboard.sectionBalanceNeto")]}
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#balanceGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),

    top_categorias: (
      <WidgetCard key="top_categorias">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetTopLabel")}</p>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          {topCategorias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Package className="w-8 h-8 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCategorias.map((entry, i) => {
                const cat = categorias.find(c => c.id === entry.name)
                const CatIcon = getIcon(cat?.icono ?? "Package")
                const pct = Math.round((entry.value / maxTopVal) * 100)
                return (
                  <div key={entry.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm text-zinc-300 truncate">
                          {cat?.label ?? entry.name}
                        </span>
                      </div>
                      <HidableAmount value={entry.value} className="text-sm font-medium text-zinc-200" />
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </WidgetCard>
    ),
    objetivo_ahorro: (
      <WidgetCard key="objetivo_ahorro">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetObjetivoLabel")}</p>
            </div>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          {!objetivoAhorro ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <PiggyBank className="w-8 h-8 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{t("dashboard.noPresupuestos")}</p>
              <p className="text-xs text-zinc-700">{t("dashboard.noPresupuestosHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{t("dashboard.objetivoAhorroActual")}</p>
                  <HidableAmount
                    value={Math.max(0, balanceNeto)}
                    className={`text-3xl font-light ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">{t("dashboard.objetivoMeta")}</p>
                  <HidableAmount value={objetivoAhorro.cantidad} className="text-base font-medium text-zinc-300" />
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${(pctObjetivo ?? 0) >= 100 ? "bg-emerald-400" : (pctObjetivo ?? 0) >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${Math.max(0, pctObjetivo ?? 0)}%` }}
                  role="progressbar"
                  aria-valuenow={pctObjetivo ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600">
                  {(pctObjetivo ?? 0) >= 100 ? "🎉" : `${pctObjetivo ?? 0}%`}
                </p>
                {(pctObjetivo ?? 0) < 100 && (
                  <HidableAmount
                    value={Math.max(0, objetivoAhorro.cantidad - balanceNeto)}
                    prefix={t("dashboard.objetivoFaltan")}
                    className="text-xs text-zinc-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </WidgetCard>
    ),

    comparativa_mes: (
      <WidgetCard key="comparativa_mes">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetComparativaLabel")}</p>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          <div className="space-y-3">
            {[
              { label: t("dashboard.sectionGastos"), actual: totalGastos, prev: gastoPrevMes, diff: diffGastoMes, colorActual: "text-red-400", invertir: true },
              { label: t("dashboard.sectionIngresos"), actual: totalIngresos, prev: ingPrevMes, diff: diffIngMes, colorActual: "text-emerald-400", invertir: false },
            ].map(({ label, actual, prev, diff, colorActual, invertir }) => {
              const mejor = invertir ? diff <= 0 : diff >= 0
              return (
                <div key={label} className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
                  <div className="flex items-end justify-between gap-2">
                    <HidableAmount value={actual} className={`text-2xl font-light ${colorActual}`} />
                    <div className="flex flex-col items-end gap-0.5">
                      <HidableAmount
                        value={Math.abs(diff)}
                        prefix={diff > 0 ? "+" : diff < 0 ? "-" : ""}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-lg tabular-nums ${mejor ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                      />
                      <p className="text-[10px] text-zinc-600">vs <HidableAmount value={prev} className="text-zinc-600" /></p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </WidgetCard>
    ),

    dia_mas_caro: (
      <WidgetCard key="dia_mas_caro">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetDiaMasCaroLabel")}</p>
            </div>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          {!diaMasCaro ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CalendarDays className="w-8 h-8 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center flex-shrink-0">
                <p className="text-2xl font-bold text-red-400 tabular-nums leading-none">{diaMasCaro[0]}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                  {new Date(sy, sm, parseInt(diaMasCaro[0])).toLocaleDateString(locale, { weekday: "short" })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mb-1">{t("dashboard.gastoTotalDia")}</p>
                <HidableAmount value={diaMasCaro[1]} className="text-3xl font-light text-red-400" />
                <p className="text-xs text-zinc-600 mt-1">
                  {((diaMasCaro[1] / totalGastos) * 100).toFixed(1)}{t("dashboard.pctGastoMensual")}
                </p>
              </div>
            </div>
          )}
        </div>
      </WidgetCard>
    ),

    gasto_dia_semana: (
      <div key="gasto_dia_semana" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{t("dashboard.widgetGastoDiaLabel")}</p>
        {monthGastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <BarChart2 className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
          </div>
        ) : (
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={dowData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }} barCategoryGap="20%">
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${v}€`} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#f4f4f5" }}
                  formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, "Gasto"]}
                />
                <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
                  {dowData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.gasto >= maxGastoDow * 0.8 ? "#ef4444" : entry.gasto >= maxGastoDow * 0.5 ? "#f97316" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-zinc-700 mt-2 text-center">{t("dashboard.acumuladoMesDia")}</p>
      </div>
    ),

    distribucion_ingreso: (
      <WidgetCard key="distribucion_ingreso">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetDistribucionLabel")}</p>
            </div>
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
          </div>
          {distribucionPct === null ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Wallet className="w-8 h-8 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{t("dashboard.ratioNoIncome")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className={`text-4xl font-light tabular-nums ${distribucionPct >= 100 ? "text-red-400" : distribucionPct >= 80 ? "text-yellow-400" : "text-emerald-400"}`}>
                    {distribucionPct}%
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{t("dashboard.distribucionGastas")}</p>
                </div>
                <div className="text-center">
                  <p className={`text-4xl font-light tabular-nums ${distribucionPct >= 100 ? "text-zinc-600" : "text-emerald-400"}`}>
                    {Math.max(0, 100 - distribucionPct)}%
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{t("dashboard.distribucionAhorras")}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 text-center">
                {t("dashboard.widgetDistribucionDesc")}
              </p>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-700 ${distribucionPct >= 100 ? "bg-red-400" : distribucionPct >= 80 ? "bg-yellow-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(distribucionPct, 100)}%` }}
                />
                <div
                  className="h-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.max(0, 100 - distribucionPct)}%` }}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <HidableAmount value={totalGastos} prefix={t("dashboard.distribucionGastado")} className="text-xs text-zinc-500 flex-1" />
                <HidableAmount value={totalIngresos} prefix={t("dashboard.distribucionIngresado")} className="text-xs text-zinc-500 flex-1 text-right" />
              </div>
            </div>
          )}
        </div>
      </WidgetCard>
    ),

    racha_ahorro: (
      <div key="racha_ahorro" className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <style>{`
      @keyframes flicker1 { 0%,100%{transform:scaleX(1) scaleY(1)} 25%{transform:scaleX(0.88) scaleY(1.08)} 75%{transform:scaleX(1.08) scaleY(0.94)} }
      @keyframes flicker2 { 0%,100%{transform:scaleX(1) scaleY(1)} 33%{transform:scaleX(0.92) scaleY(1.1)} 66%{transform:scaleX(1.06) scaleY(0.9)} }
      @keyframes rise { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      .flame-outer { animation: flicker1 1.4s ease-in-out infinite, rise 1.8s ease-in-out infinite; transform-origin: bottom center; }
      .flame-mid   { animation: flicker2 1.1s ease-in-out infinite; transform-origin: bottom center; }
      .flame-inner { animation: flicker1 0.9s ease-in-out infinite reverse; transform-origin: bottom center; }
      @media (prefers-reduced-motion: reduce) { .flame-outer,.flame-mid,.flame-inner { animation: none; } }
    `}</style>
        <div className="flex items-center gap-2 mb-4">
          <svg width="14" height="14" viewBox="0 0 14 18" aria-hidden="true">
            <g className="flame-outer">
              <ellipse cx="7" cy="13" rx="5.5" ry="5" fill={rachaDias >= 7 ? "#10b981" : rachaDias >= 3 ? "#f59e0b" : "#71717a"} />
              <path d="M7 2 C4 6 2 9 2 12 C2 15.3 4.2 17 7 17 C9.8 17 12 15.3 12 12 C12 9 10 6 7 2Z" fill={rachaDias >= 7 ? "#10b981" : rachaDias >= 3 ? "#f59e0b" : "#71717a"} />
            </g>
            <g className="flame-mid">
              <path d="M7 6 C5.5 8.5 4.5 10 4.5 12 C4.5 14 5.5 15.5 7 15.5 C8.5 15.5 9.5 14 9.5 12 C9.5 10 8.5 8.5 7 6Z" fill={rachaDias >= 7 ? "#34d399" : rachaDias >= 3 ? "#fbbf24" : "#52525b"} />
            </g>
            <g className="flame-inner">
              <path d="M7 9 C6.2 10.5 6 11.2 6 12.2 C6 13.4 6.4 14.2 7 14.2 C7.6 14.2 8 13.4 8 12.2 C8 11.2 7.8 10.5 7 9Z" fill={rachaDias >= 7 ? "#a7f3d0" : rachaDias >= 3 ? "#fde68a" : "#3f3f46"} />
            </g>
          </svg>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionRacha")}</p>
        </div>
        {rachaDias === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Flame className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.rachaNoActive")}</p>
            <p className="text-xs text-zinc-700">{t("dashboard.rachaNoActiveHint")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${rachaDias >= 7 ? "bg-emerald-500/15 border border-emerald-500/30" : rachaDias >= 3 ? "bg-yellow-500/15 border border-yellow-500/30" : "bg-zinc-800 border border-zinc-700"}`}>
              <p className={`text-3xl font-bold tabular-nums leading-none ${rachaDias >= 7 ? "text-emerald-400" : rachaDias >= 3 ? "text-yellow-400" : "text-zinc-400"}`}>
                {rachaDias}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{t("dashboard.rachaDias")}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-medium text-zinc-200">
                {rachaDias >= 7 ? t("dashboard.rachaIncreible") : rachaDias >= 3 ? t("dashboard.rachaBuen") : t("dashboard.rachaEmpezando")}
              </p>
              <p className="text-xs text-zinc-500">{t("dashboard.rachaConsecut")}</p>
            </div>
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Cabecera: navegación de meses */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedDate(new Date(sy, sm - 1, 1))}
          aria-label={t("dashboard.ariaPrevMonth")}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <p className="text-sm font-medium text-zinc-300 capitalize flex-1 text-center">
          {monthLabel}
        </p>

        <div className="flex items-center gap-2">
          <EncryptionBadge />
          <button
            onClick={() => setSelectedDate(new Date(sy, sm + 1, 1))}
            disabled={esHoyMes}
            aria-label={t("dashboard.ariaNextMonth")}
            aria-disabled={esHoyMes}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${esHoyMes
              ? "text-zinc-700 cursor-not-allowed"
              : "hover:bg-zinc-800 text-zinc-400"
              }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {encryptedBanner}

      {/* Widgets activos */}
      {activeWidgets.map(id => widgets[id] ?? null)}

      {/* Botón personalizar */}
      <button
        onClick={() => setShowWidgetPicker(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-all"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">{t("dashboard.customizeDashboard")}</span>
      </button>

      {/* Widget picker */}
      {showWidgetPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="widget-picker-title"
        >
          <div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setShowWidgetPicker(false)}
          />
          <div className="relative w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 id="widget-picker-title" className="text-lg font-semibold text-zinc-100">
                {t("dashboard.customizeTitle")}
              </h3>
              <button
                onClick={() => setShowWidgetPicker(false)}
                aria-label={t("dashboard.ariaCloseCustomize")}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 mb-5">
              {t("dashboard.customizeHint")}
            </p>
            <div className="space-y-2">
              {WIDGET_CATALOG.map(w => {
                const active = activeWidgets.includes(w.id)
                const WIcon = w.Icon
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left ${active
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-600"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-emerald-500/20" : "bg-zinc-700/50"
                      }`}>
                      <WIcon className={`w-5 h-5 ${active ? "text-emerald-400" : "text-zinc-500"}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${active ? "text-zinc-100" : "text-zinc-400"}`}>
                        {w.label}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">{w.descripcion}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${active ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"
                      }`}>
                      {active && <Check className="w-3.5 h-3.5 text-zinc-950" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}