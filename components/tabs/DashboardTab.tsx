"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2, Package, ChevronLeft, ChevronRight } from "lucide-react"
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

export interface Movimiento {
  id: string
  created_at: string
  cantidad: number
  categoria: string
  nota?: string
  is_recurring?: boolean
}

type Categoria = {
  id: string
  label: string
  emoji: string
  Icon: any
}

// ─── Utilidades y Constantes ─────────────────────────────────────────────────
const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#64748b"]

function getCatConfig(cat: string, allCats: Categoria[]) {
  return allCats.find((c) => c.id === cat) ?? { id: cat, emoji: "📦", label: cat, Icon: Package }
}

export default function DashboardTab({ categorias, session }: { categorias: Categoria[]; session: Session }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // ESTADOS PARA SUSCRIPCIONES
  const [pendingSubs, setPendingSubs] = useState<Movimiento[]>([])
  const [processingSub, setProcessingSub] = useState<string | null>(null)

  const presupuesto = session?.user?.user_metadata?.presupuesto || null

  useEffect(() => {
    async function fetchMovimientos() {
      const { data } = await supabase.from("movimientos").select("*").order("created_at", { ascending: false })
      if (data) {
        setMovimientos(data)

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const recurringActivas = data.filter(m => m.is_recurring)
        const mapUltimosPagos = new Map<string, Movimiento>()
        
        recurringActivas.forEach(m => {
          const key = `${m.categoria}-${m.nota || ''}`
          if (!mapUltimosPagos.has(key)) {
            mapUltimosPagos.set(key, m) 
          }
        })

        const pending: Movimiento[] = []
        mapUltimosPagos.forEach(sub => {
          const d = new Date(sub.created_at)
          const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear
          if (!isThisMonth) {
            pending.push(sub)
          }
        })
        setPendingSubs(pending)
      }
      setLoading(false)
    }
    fetchMovimientos()
  }, [])

  const handleCobrarSub = async (sub: Movimiento) => {
    setProcessingSub(sub.id)
    const { data: newSub, error } = await supabase.from("movimientos").insert({
      cantidad: sub.cantidad,
      categoria: sub.categoria,
      nota: sub.nota,
      is_recurring: true
    }).select().single()

    if (!error && newSub) {
      setMovimientos(prev => [newSub, ...prev])
      setPendingSubs(prev => prev.filter(p => p.id !== sub.id))
    }
    setProcessingSub(null)
  }

  const handleCancelarSub = async (id: string) => {
    setProcessingSub(id)
    const { error } = await supabase.from("movimientos").update({ is_recurring: false }).eq("id", id)
    if (!error) {
      setPendingSubs(prev => prev.filter(p => p.id !== id))
      setMovimientos(prev => prev.map(m => m.id === id ? { ...m, is_recurring: false } : m))
    }
    setProcessingSub(null)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>

  const selectedMonth = selectedDate.getMonth(); const selectedYear = selectedDate.getFullYear()
  const monthMovimientos = movimientos.filter((m) => { const d = new Date(m.created_at); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
  const totalThisMonth = monthMovimientos.reduce((acc, m) => acc + m.cantidad, 0)
  const percentUsed = presupuesto ? (totalThisMonth / presupuesto) * 100 : 0

  const categoryTotals = monthMovimientos.reduce((acc, m) => { acc[m.categoria] = (acc[m.categoria] || 0) + m.cantidad; return acc }, {} as Record<string, number>)
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))

  const last6Months: { month: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(selectedYear, selectedMonth - i, 1); const monthNum = date.getMonth(); const year = date.getFullYear()
    const monthTotal = movimientos.filter((m) => { const d = new Date(m.created_at); return d.getMonth() === monthNum && d.getFullYear() === year }).reduce((acc, m) => acc + m.cantidad, 0)
    last6Months.push({ month: date.toLocaleDateString("es-ES", { month: "short" }).charAt(0).toUpperCase() + date.toLocaleDateString("es-ES", { month: "short" }).slice(1), total: Math.round(monthTotal * 100) / 100 })
  }

  const handlePrevMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth - 1, 1))
  const handleNextMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth + 1, 1))
  const monthLabel = selectedDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">

      <div className="flex items-center justify-between">
        <button onClick={handlePrevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-sm font-medium text-zinc-300 capitalize flex-1 text-center">{monthLabel}</p>
        <button onClick={handleNextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Gasto Total</p>
          <p className="text-4xl font-light text-zinc-100 tabular-nums">
            {totalThisMonth.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-zinc-500 text-2xl ml-1">€</span>
          </p>
        </div>
        {presupuesto && (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><p className="text-xs text-zinc-500">Presupuesto: {presupuesto.toFixed(2)}€</p><p className="text-xs text-zinc-500">{Math.round(percentUsed)}%</p></div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div className={`h-full transition-all duration-300 ${percentUsed > 100 ? "bg-red-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Distribución por Categoría</p>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2"><Package className="w-8 h-8 text-zinc-700" /><p className="text-sm text-zinc-600">Sin gastos este mes</p></div>
        ) : (
          <>
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                    itemStyle={{ color: "#f4f4f5" }}
                    formatter={(value: any, name: any) => {
                      const cat = getCatConfig(name, categorias);
                      return [`${Number(value).toFixed(2)}€`, cat.label];
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

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Últimos 6 Meses</p>
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }} itemStyle={{ color: "#f4f4f5" }} formatter={(value: any) => [`${Number(value).toFixed(2)}€`, "Total"]} />
              <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}