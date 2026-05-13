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

import { useState, useMemo, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useDashboardData } from "@/components/dashboard/hooks/useDashboardData"
import { useDashboardMemos } from "@/components/dashboard/hooks/useDashboardMemos"
import {
  Package, ChevronLeft, ChevronRight, TrendingDown, TrendingUp,
  Wallet, ArrowLeftRight, Plus, X, Check, Flame, Target,
  PiggyBank, CalendarDays, BarChart2,
} from "lucide-react"
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line,
} from "recharts"
import { getIcon } from "@/lib/icons"
import EncryptionBadge from "@/components/ui/Encryptionbadge"
import { useAppData } from "@/contexts/AppDataContext"

// ── Widgets extraídos ─────────────────────────────────────────────────────────
import ResumenMesWidget from "@/components/dashboard/widgets/ResumenMesWidget"
import SaldoCuentasWidget from "@/components/dashboard/widgets/SaldoCuentasWidget"
import ProyeccionMesWidget from "@/components/dashboard/widgets/ProyeccionMesWidget"
import MediaDiariaWidget from "@/components/dashboard/widgets/MediaDiariaWidget"
import RatioAhorroWidget from "@/components/dashboard/widgets/RatioAhorroWidget"
import PresupuestosWidget from "@/components/dashboard/widgets/PresupuestosWidget"
import MapaCalorWidget from "@/components/dashboard/widgets/MapaCalorWidget"
import DonutCategoriasWidget from "@/components/dashboard/widgets/DonutCategoriasWidget"
import Barras6MesesWidget from "@/components/dashboard/widgets/Barras6MesesWidget"
import LineaGastosWidget from "@/components/dashboard/widgets/LineaGastosWidget"
import AreaBalanceWidget from "@/components/dashboard/widgets/AreaBalanceWidget"
import TopCategoriasWidget from "@/components/dashboard/widgets/TopCategoriasWidget"
import TopIngresosWidget from "@/components/dashboard/widgets/TopIngresosWidget"
import ObjetivoAhorroWidget from "@/components/dashboard/widgets/ObjetivoAhorroWidget"
import ComparativaMesWidget from "@/components/dashboard/widgets/ComparativaMesWidget"
import DiaMasCaroWidget from "@/components/dashboard/widgets/DiaMasCaroWidget"
import GastoDiaSemanaWidget from "@/components/dashboard/widgets/GastoDiaSemanaWidget"
import DistribucionIngresoWidget from "@/components/dashboard/widgets/DistribucionIngresoWidget"
import ResumenSemanalWidget from "@/components/dashboard/widgets/ResumenSemanalWidget"
import PresupuestoGlobalWidget from "@/components/dashboard/widgets/PresupuestoGlobalWidget"
import RachaAhorroWidget from "@/components/dashboard/widgets/RachaAhorroWidget"

type WidgetId =
  | "resumen_mes" | "saldo_cuentas" | "donut_categorias" | "barras_6meses"
  | "linea_gastos" | "area_balance" | "top_categorias" | "top_ingresos" | "proyeccion_mes"
  | "media_diaria" | "mapa_calor" | "ratio_ahorro" | "presupuestos_categoria"
  | "objetivo_ahorro" | "comparativa_mes" | "dia_mas_caro"
  | "gasto_dia_semana" | "distribucion_ingreso" | "racha_ahorro"
  | "resumen_semanal" | "presupuesto_global"

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
    { id: "top_ingresos", label: t("dashboard.widgetTopIngresosLabel"), descripcion: t("dashboard.widgetTopIngresosDesc"), Icon: TrendingUp },
    { id: "objetivo_ahorro", label: t("dashboard.widgetObjetivoLabel"), descripcion: t("dashboard.widgetObjetivoDesc"), Icon: PiggyBank },
    { id: "comparativa_mes", label: t("dashboard.widgetComparativaLabel"), descripcion: t("dashboard.widgetComparativaDesc"), Icon: BarChart2 },
    { id: "dia_mas_caro", label: t("dashboard.widgetDiaMasCaroLabel"), descripcion: t("dashboard.widgetDiaMasCaroDesc"), Icon: CalendarDays },
    { id: "gasto_dia_semana", label: t("dashboard.widgetGastoDiaLabel"), descripcion: t("dashboard.widgetGastoDiaDesc"), Icon: BarChart2 },
    { id: "distribucion_ingreso", label: t("dashboard.widgetDistribucionLabel"), descripcion: t("dashboard.widgetDistribucionDesc"), Icon: Wallet },
    { id: "racha_ahorro", label: t("dashboard.widgetRachaLabel"), descripcion: t("dashboard.widgetRachaDesc"), Icon: Flame },
    { id: "resumen_semanal", label: t("dashboard.widgetResumenSemanalLabel"), descripcion: t("dashboard.widgetResumenSemanalDesc"), Icon: CalendarDays },
    { id: "presupuesto_global", label: t("dashboard.widgetPresupuestoGlobalLabel"), descripcion: t("dashboard.widgetPresupuestoGlobalDesc"), Icon: Target },
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

// ── DashboardTab ──────────────────────────────────────────────────────────────
export default function DashboardTab({
  onOpenSettings, userId,
}: {
  onOpenSettings?: (tab: "categorias" | "presupuestos" | "objetivos" | "seguridad") => void
  userId: string
}) {
  const t = useTranslations()
  const locale = useLocale()
  const { categorias, cuentas, presupuestos, objetivos } = useAppData()
  const WIDGET_CATALOG = useMemo(() => getWidgetCatalog(t), [t])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [dragId, setDragId] = useState<WidgetId | null>(null)
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null)
  const dragIdRef = useRef<WidgetId | null>(null)
  const dragOverIdRef = useRef<WidgetId | null>(null)
  const isDraggingRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [ghostLabel, setGhostLabel] = useState<string>("")
  const [ghostIcon, setGhostIcon] = useState<React.ElementType | null>(null)
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGETS
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      return s ? JSON.parse(s) : DEFAULT_WIDGETS
    } catch { return DEFAULT_WIDGETS }
  })

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

  const { movimientos, hasEncryptedMovs, loading } = useDashboardData(activeWidgets, userId, cuentas)

  const sm = selectedDate.getMonth()
  const sy = selectedDate.getFullYear()

  const {
    monthMovs, monthGastos, monthIngresos,
    totalGastos, totalIngresos, balanceNeto,
    saldos, patrimonioTotal,
    categoryTotals, pieData, topCategorias, maxTopVal, topIngresos, maxTopIngVal,
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
  } = useDashboardMemos({ movimientos, selectedDate, cuentas, categorias, presupuestos, objetivos, locale })

  const ratioLabel = ratioAhorro === null
    ? t("dashboard.ratioNoIncome") // añade esta clave a los JSON → "Sin ingresos registrados"
    : ratioAhorro >= 20 ? t("dashboard.ratioExcellent")
      : ratioAhorro >= 5 ? t("dashboard.ratioModerate")
        : ratioAhorro >= 0 ? t("dashboard.ratioLow")
          : t("dashboard.ratioNegative")

  if (loading) return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {/* Navegador de mes */}
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="w-32 h-4 rounded-full bg-zinc-800 animate-pulse" />
        <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
      {/* Skeleton resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4 space-y-3">
          <div className="w-16 h-3 rounded-full bg-zinc-800 animate-pulse" />
          <div className="w-24 h-7 rounded-full bg-zinc-800 animate-pulse" />
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4 space-y-3">
          <div className="w-16 h-3 rounded-full bg-zinc-800 animate-pulse" />
          <div className="w-24 h-7 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </div>
      {/* Skeleton balance */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4 space-y-3">
        <div className="w-24 h-3 rounded-full bg-zinc-800 animate-pulse" />
        <div className="w-32 h-7 rounded-full bg-zinc-800 animate-pulse" />
      </div>
      {/* Skeleton widget grande */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
        <div className="w-28 h-3 rounded-full bg-zinc-800 animate-pulse" />
        <div className="w-full h-2 rounded-full bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
            <div className="w-20 h-3 rounded-full bg-zinc-700 animate-pulse" />
            <div className="w-16 h-6 rounded-full bg-zinc-700 animate-pulse" />
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
            <div className="w-20 h-3 rounded-full bg-zinc-700 animate-pulse" />
            <div className="w-16 h-6 rounded-full bg-zinc-700 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Skeleton donut placeholder */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 flex flex-col items-center gap-4">
        <div className="w-28 h-3 rounded-full bg-zinc-800 animate-pulse self-start" />
        <div className="w-44 h-44 rounded-full bg-zinc-800 animate-pulse" />
      </div>
    </div>
  )

  const encryptedBanner = hasEncryptedMovs ? (
    <div className="mx-4 mb-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
      <span className="text-sm">🔒</span>
      <p className="text-xs text-yellow-400/90">{t("common.encryptedBanner")}</p>
    </div>
  ) : null

  // ── Definición de widgets ─────────────────────────────────────────────────
  const { recientes } = movimientos
  const widgets: Partial<Record<WidgetId, React.ReactNode>> = {

    resumen_mes: (
      <ResumenMesWidget key="resumen_mes" totalGastos={totalGastos} totalIngresos={totalIngresos} balanceNeto={balanceNeto} />
    ),

    saldo_cuentas: (
      <SaldoCuentasWidget key="saldo_cuentas" saldos={saldos} patrimonioTotal={patrimonioTotal} />
    ),

    proyeccion_mes: (
      <ProyeccionMesWidget key="proyeccion_mes" diaActual={diaActual} diasEnMes={diasEnMes} diasRestantes={diasRestantes} pctMes={pctMes} gastoDiario={gastoDiario} gastoProyectado={gastoProyectado} ahorroProyectado={ahorroProyectado} totalIngresos={totalIngresos} />
    ),

    media_diaria: (
      <MediaDiariaWidget key="media_diaria" gastoDiario={gastoDiario} mediaDiariaAnt={mediaDiariaAnt} diffMedia={diffMedia} diffPct={diffPct} />
    ),

    ratio_ahorro: (
      <RatioAhorroWidget key="ratio_ahorro" ratioAhorro={ratioAhorro} ratioColor={ratioColor} ratioLabel={ratioLabel} totalGastos={totalGastos} totalIngresos={totalIngresos} balanceNeto={balanceNeto} />
    ),

    presupuestos_categoria: (
      <PresupuestosWidget key="presupuestos_categoria" presupuestosConGasto={presupuestosConGasto} onOpenSettings={onOpenSettings} />
    ),

    mapa_calor: (
      <MapaCalorWidget key="mapa_calor" gastoPorDia={gastoPorDia} maxGastoDia={maxGastoDia} diasGrid={diasGrid} DIAS_SEMANA={DIAS_SEMANA} monthLabel={monthLabel} esMesActual={esMesActual} selectedYear={sy} selectedMonth={sm} />
    ),

    donut_categorias: (
      <DonutCategoriasWidget key="donut_categorias" pieData={pieData} categorias={categorias} onSelectCat={setSelectedCat} />
    ),

    barras_6meses: (
      <Barras6MesesWidget key="barras_6meses" last6Months={last6Months} />
    ),

    linea_gastos: (
      <LineaGastosWidget key="linea_gastos" last12Months={last12Months} />
    ),

    area_balance: (
      <AreaBalanceWidget key="area_balance" last12Months={last12Months} />
    ),

    top_categorias: (
      <TopCategoriasWidget key="top_categorias" topCategorias={topCategorias} maxTopVal={maxTopVal} categorias={categorias} onSelectCat={setSelectedCat} />
    ),

    top_ingresos: (
      <TopIngresosWidget key="top_ingresos" topIngresos={topIngresos} maxTopIngVal={maxTopIngVal} categorias={categorias} />
    ),
    objetivo_ahorro: (
      <ObjetivoAhorroWidget key="objetivo_ahorro" objetivoAhorro={objetivoAhorro} pctObjetivo={pctObjetivo} balanceNeto={balanceNeto} onOpenSettings={onOpenSettings} />
    ),

    comparativa_mes: (
      <ComparativaMesWidget key="comparativa_mes" totalGastos={totalGastos} totalIngresos={totalIngresos} gastoPrevMes={gastoPrevMes} ingPrevMes={ingPrevMes} diffGastoMes={diffGastoMes} diffIngMes={diffIngMes} />
    ),

    dia_mas_caro: (
      <DiaMasCaroWidget key="dia_mas_caro" diaMasCaro={diaMasCaro} totalGastos={totalGastos} selectedYear={sy} selectedMonth={sm} locale={locale} />
    ),

    gasto_dia_semana: (
      <GastoDiaSemanaWidget key="gasto_dia_semana" monthGastos={monthGastos} dowData={dowData} maxGastoDow={maxGastoDow} />
    ),

    distribucion_ingreso: (
      <DistribucionIngresoWidget key="distribucion_ingreso" distribucionPct={distribucionPct} totalGastos={totalGastos} totalIngresos={totalIngresos} />
    ),

    resumen_semanal: (
      <ResumenSemanalWidget key="resumen_semanal" recientes={recientes} categorias={categorias} presupuestosConGasto={presupuestosConGasto} esMesActual={esMesActual} />
    ),

    presupuesto_global: (
      <PresupuestoGlobalWidget key="presupuesto_global" objetivos={objetivos} totalGastos={totalGastos} onOpenSettings={onOpenSettings} />
    ),

    racha_ahorro: (
      <RachaAhorroWidget key="racha_ahorro" rachaDias={rachaDias} rachaTopCat={rachaTopCat} />
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

        <p className="text-sm font-bold text-zinc-200 capitalize flex-1 text-center tracking-wide">
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

      {/* Empty state para nuevos usuarios */}
      {monthMovs.length === 0 && !loading && esMesActual && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-zinc-200">{t("dashboard.emptyStateTitle")}</p>
          <p className="text-sm text-zinc-500">{t("dashboard.emptyStateHint")}</p>
        </div>
      )}

      {/* Widgets activos */}
      {activeWidgets.map(id => widgets[id] ?? null)}

      {/* Botón personalizar */}
      <button
        onClick={() => setShowWidgetPicker(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-all"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-semibold">{t("dashboard.customizeDashboard")}</span>
      </button>

      {/* Drill-down categoria */}
      {selectedCat && (() => {
        const cat = categorias.find(c => c.id === selectedCat)
        const color = CHART_COLORS[pieData.findIndex(e => e.name === selectedCat) % CHART_COLORS.length] ?? "#10b981"
        const drillData = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(sy, sm - (5 - i), 1)
          const total = movimientos.recientes
            .filter(m => {
              const md = new Date(m.created_at)
              const localMd = new Date(md.getTime() - md.getTimezoneOffset() * 60000)
              return (
                localMd.getUTCMonth() === d.getMonth() &&
                localMd.getUTCFullYear() === d.getFullYear() &&
                m.categoria === selectedCat &&
                (m.tipo ?? "gasto") === "gasto"
              )
            })
            .reduce((a, m) => a + m.cantidad, 0)
          return {
            month: d.toLocaleDateString(locale, { month: "short" }).charAt(0).toUpperCase() +
              d.toLocaleDateString(locale, { month: "short" }).slice(1),
            total: Math.round(total * 100) / 100,
          }
        })
        const catTotal = categoryTotals[selectedCat] ?? 0
        const CatIcon = getIcon(cat?.icono ?? "Package")
        return (
          <div
            className="fixed inset-0 z-50 flex items-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cat-drill-title"
          >
            <div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              onClick={() => setSelectedCat(null)}
              aria-hidden="true"
            />
            <div className="relative w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "22" }}>
                    <CatIcon className="w-4 h-4" style={{ color }} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="cat-drill-title" className="text-base font-semibold text-zinc-100">
                      {cat?.label ?? selectedCat}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {t("dashboard.drillTotalMes")}: <span className="font-medium" style={{ color }}>{catTotal.toFixed(2)}€</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCat(null)}
                  aria-label={t("common.close")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 mb-3">{t("dashboard.last6Months")}</p>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={drillData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${v}€`} />
                    <Tooltip
                      cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                      itemStyle={{ color: "#f4f4f5" }}
                      formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, cat?.label ?? selectedCat]}
                    />
                    <Line type="monotone" dataKey="total" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} activeDot={{ r: 5, fill: color }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Fantasma de drag */}
      {ghostPos && ghostLabel && ghostIcon && (() => {
        const GhostIcon = ghostIcon as React.ElementType
        return (
          <div
            className="fixed z-[200] pointer-events-none select-none"
            style={{
              left: ghostPos.x - 160,
              top: ghostPos.y - 32,
              width: "320px",
              opacity: 0.85,
            }}
          >
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 shadow-2xl shadow-black/60">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/20">
                <GhostIcon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{ghostLabel}</p>
              </div>
              <span className="text-zinc-600 text-xs">⠿</span>
            </div>
          </div>
        )
      })()}

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
              <h3 id="widget-picker-title" className="text-lg font-black text-zinc-100">
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
              {/* Widgets activos: reordenables con drag */}
             {activeWidgets.map(id => {
                const w = WIDGET_CATALOG.find(x => x.id === id)
                if (!w) return null
                const WIcon = w.Icon
                const isDraggingThis = dragId === id
                const isOver = dragOverId === id

                const HOLD_MS = 350

                const handlePointerDown = (e: React.PointerEvent) => {
                  if ((e.target as HTMLElement).closest("button")) return
                  isDraggingRef.current = false
                  dragIdRef.current = w.id
                  pointerStartRef.current = { x: e.clientX, y: e.clientY }
                  // Iniciem el timer de hold — el drag s'activa només si l'usuari
                  // manté premut HOLD_MS sense moure's més de 6px
                  holdTimerRef.current = setTimeout(() => {
                    if (!dragIdRef.current) return
                    isDraggingRef.current = true
                    setDragId(dragIdRef.current)
                    setGhostLabel(w.label)
                    setGhostIcon(() => WIcon)
                    if (pointerStartRef.current) {
                      setGhostPos({ x: pointerStartRef.current.x, y: pointerStartRef.current.y })
                    }
                    // Ara sí capturem el pointer per rebre tots els events
                    const el = document.querySelector(`[data-widget-id="${dragIdRef.current}"]`)
                    if (el) (el as HTMLElement).setPointerCapture(e.pointerId)
                  }, HOLD_MS)
                }

                const handlePointerMove = (e: React.PointerEvent) => {
                  if (!dragIdRef.current || !pointerStartRef.current) return
                  const dx = e.clientX - pointerStartRef.current.x
                  const dy = e.clientY - pointerStartRef.current.y
                  // Si es mou més de 6px abans del hold, cancel·lem el drag
                  if (!isDraggingRef.current) {
                    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
                      dragIdRef.current = null
                      pointerStartRef.current = null
                    }
                    return
                  }
                  setGhostPos({ x: e.clientX, y: e.clientY })
                  e.currentTarget.releasePointerCapture(e.pointerId)
                  const el = document.elementFromPoint(e.clientX, e.clientY)
                  const target = el?.closest("[data-widget-id]")
                  const overId = target?.getAttribute("data-widget-id") as WidgetId | null
                  if (overId && overId !== dragIdRef.current) {
                    dragOverIdRef.current = overId
                    setDragOverId(overId)
                  }
                  e.currentTarget.setPointerCapture(e.pointerId)
                }

                const handlePointerUp = (e: React.PointerEvent) => {
                  if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
                  if (isDraggingRef.current) {
                    e.currentTarget.releasePointerCapture(e.pointerId)
                    const el = document.elementFromPoint(e.clientX, e.clientY)
                    const target = el?.closest("[data-widget-id]")
                    const finalOverId = (target?.getAttribute("data-widget-id") ?? dragOverIdRef.current) as WidgetId | null
                    if (dragIdRef.current && finalOverId && dragIdRef.current !== finalOverId) {
                      const from = dragIdRef.current
                      const to = finalOverId
                      setActiveWidgets(prev => {
                        const next = [...prev]
                        const fromIdx = next.indexOf(from)
                        const toIdx = next.indexOf(to)
                        next.splice(fromIdx, 1)
                        next.splice(toIdx, 0, from)
                        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { }
                        return next
                      })
                    }
                  }
                  dragIdRef.current = null
                  dragOverIdRef.current = null
                  isDraggingRef.current = false
                  pointerStartRef.current = null
                  setDragId(null)
                  setDragOverId(null)
                  setGhostPos(null)
                  setGhostLabel("")
                  setGhostIcon(null)
                }

                return (
                  <div
                    key={w.id}
                    data-widget-id={w.id}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left select-none touch-none ${
                      isDraggingThis ? "opacity-40 cursor-grabbing" : "cursor-grab"
                    } ${isOver && !isDraggingThis ? "border-emerald-500/60 bg-emerald-500/15" : "border-emerald-500/40 bg-emerald-500/10"}`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/20">
                      <WIcon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 pointer-events-none">
                      <p className="text-sm font-medium text-zinc-100">{w.label}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{w.descripcion}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-zinc-600 text-xs select-none pointer-events-none">⠿</span>
                      <button
                        onClick={e => { e.stopPropagation(); toggleWidget(w.id) }}
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500 border-2 border-emerald-500"
                      >
                        <Check className="w-3.5 h-3.5 text-zinc-950" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Widgets inactivos */}
              {WIDGET_CATALOG.filter(w => !activeWidgets.includes(w.id)).map(w => {
                const WIcon = w.Icon
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    aria-pressed={false}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left border-zinc-800 bg-zinc-800/40 hover:border-zinc-600"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-700/50">
                      <WIcon className="w-5 h-5 text-zinc-500" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-400">{w.label}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{w.descripcion}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-zinc-600" />
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