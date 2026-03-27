"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Package, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { Categoria, Movimiento } from "@/types"

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

// ─── Utilidades y Constantes ─────────────────────────────────────────────────
const CHART_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b", "#10b981"]

function getCatConfig(cat: string, allCats: Categoria[]) {
  return allCats.find((c) => c.id === cat) ?? { id: cat, label: cat, Icon: Package, tipo: 'ambos' as const }
}

export default function DashboardTab({ categorias, session }: { categorias: Categoria[]; session: Session }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const presupuesto = session?.user?.user_metadata?.presupuesto || null

  useEffect(() => {
    async function fetchMovimientos() {
      const { data } = await supabase.from("movimientos").select("*").order("created_at", { ascending: false })
      if (data) setMovimientos(data)
      setLoading(false)
    }
    fetchMovimientos()
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
    </div>
  )

  const selectedMonth = selectedDate.getMonth()
  const selectedYear = selectedDate.getFullYear()

  // ── Movimientos del mes filtrados por tipo ────────────────────────────────
  const monthMovimientos = movimientos.filter((m) => {
    const d = new Date(m.created_at)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  // Solo gastos (donut, barra, presupuesto)
  const monthGastos = monthMovimientos.filter((m) => (m.tipo ?? 'gasto') === 'gasto')
  // Solo ingresos
  const monthIngresos = monthMovimientos.filter((m) => m.tipo === 'ingreso')

  const totalGastosMonth = monthGastos.reduce((acc, m) => acc + m.cantidad, 0)
  const totalIngresosMonth = monthIngresos.reduce((acc, m) => acc + m.cantidad, 0)
  const balanceNeto = totalIngresosMonth - totalGastosMonth

  const percentUsed = presupuesto ? (totalGastosMonth / presupuesto) * 100 : 0

  // Donut: solo gastos, agrupados por categoría
  const categoryTotals = monthGastos.reduce((acc, m) => {
    acc[m.categoria] = (acc[m.categoria] || 0) + m.cantidad
    return acc
  }, {} as Record<string, number>)
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }))

  // Barras: últimos 6 meses, solo gastos
  const last6Months: { month: string; gastos: number; ingresos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(selectedYear, selectedMonth - i, 1)
    const monthNum = date.getMonth()
    const year = date.getFullYear()

    const movsMes = movimientos.filter((m) => {
      const d = new Date(m.created_at)
      return d.getMonth() === monthNum && d.getFullYear() === year
    })

    const gastosMes = movsMes
      .filter((m) => (m.tipo ?? 'gasto') === 'gasto')
      .reduce((acc, m) => acc + m.cantidad, 0)

    const ingresosMes = movsMes
      .filter((m) => m.tipo === 'ingreso')
      .reduce((acc, m) => acc + m.cantidad, 0)

    const label = date.toLocaleDateString("es-ES", { month: "short" })
    last6Months.push({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      gastos: Math.round(gastosMes * 100) / 100,
      ingresos: Math.round(ingresosMes * 100) / 100,
    })
  }

  const handlePrevMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth - 1, 1))
  const handleNextMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth + 1, 1))
  const monthLabel = selectedDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* ── Selector de mes ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-medium text-zinc-300 capitalize flex-1 text-center">{monthLabel}</p>
        <button onClick={handleNextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Tarjetas de resumen: Gastos + Ingresos + Balance ─────────────── */}
      <div className="space-y-3">
        {/* Fila superior: Gastos e Ingresos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Gastos</p>
            </div>
            <p className="text-2xl font-light text-red-400 tabular-nums">
              {totalGastosMonth.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-zinc-500 text-base ml-1">€</span>
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Ingresos</p>
            </div>
            <p className="text-2xl font-light text-emerald-400 tabular-nums">
              {totalIngresosMonth.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-zinc-500 text-base ml-1">€</span>
            </p>
          </div>
        </div>

        {/* Balance neto */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Balance neto</p>
            </div>
            <p className={`text-2xl font-light tabular-nums ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {balanceNeto >= 0 ? "+" : ""}
              {balanceNeto.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-zinc-500 text-base ml-1">€</span>
            </p>
          </div>

          {/* Barra de presupuesto (solo si hay presupuesto configurado) */}
          {presupuesto && (
            <div className="space-y-2 mt-3 pt-3 border-t border-zinc-800/60">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Presupuesto mensual: {presupuesto.toFixed(2)}€</p>
                <p className="text-xs text-zinc-500">{Math.round(percentUsed)}%</p>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${percentUsed > 100 ? "bg-red-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Donut: solo gastos por categoría ─────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Gastos por Categoría</p>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package className="w-8 h-8 text-zinc-700" />
            <p className="text-sm text-zinc-600">Sin gastos este mes</p>
          </div>
        ) : (
          <>
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                    itemStyle={{ color: "#f4f4f5" }}
                    formatter={(value: any, name: any) => {
                      const cat = getCatConfig(name, categorias)
                      return [`${Number(value).toFixed(2)}€`, cat.label]
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {pieData.map((entry, index) => {
                const cat = getCatConfig(entry.name, categorias)
                return (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="text-xs text-zinc-300 font-medium">{cat.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Barras: últimos 6 meses, gastos vs ingresos ──────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Últimos 6 Meses</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-xs text-zinc-500">Gastos</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-zinc-500">Ingresos</span></div>
        </div>
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}€`, name === "gastos" ? "Gastos" : "Ingresos"]}
              />
              <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
