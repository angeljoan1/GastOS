"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { CalendarDays, X, Loader2, CheckCircle2, Delete, Package } from "lucide-react"

// ─── Cliente Supabase Independiente ───────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Tipos ───────────────────────────────────────────────────────────────────
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

// ─── Utilidades ──────────────────────────────────────────────────────────────
function triggerHaptic() {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50)
  }
}

function getCatConfig(cat: string, allCats: Categoria[]) {
  return allCats.find((c) => c.id === cat) ?? { id: cat, emoji: "📦", label: cat, Icon: Package }
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function IngresoTab({ categorias }: { categorias: Categoria[] }) {
  const [display, setDisplay] = useState("0"); const [nota, setNota] = useState(""); const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)

  const [showRecurModal, setShowRecurModal] = useState(false)
  const [pendingCat, setPendingCat] = useState<string | null>(null)

  // ESTADOS PARA SUSCRIPCIONES PENDIENTES
  const [pendingSubs, setPendingSubs] = useState<Movimiento[]>([])
  const [processingSub, setProcessingSub] = useState<string | null>(null)

  useEffect(() => {
    async function checkSubs() {
      const { data } = await supabase.from("movimientos").select("*").eq("is_recurring", true).order("created_at", { ascending: false })
      if (data) {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const mapUltimosPagos = new Map<string, Movimiento>()
        data.forEach(m => {
          const key = `${m.categoria}-${m.nota || ''}`
          if (!mapUltimosPagos.has(key)) mapUltimosPagos.set(key, m)
        })

        const pending: Movimiento[] = []
        mapUltimosPagos.forEach(sub => {
          const d = new Date(sub.created_at)
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
            pending.push(sub)
          }
        })
        setPendingSubs(pending)
      }
    }
    checkSubs()
  }, [])

  const handleCobrarSub = async (sub: Movimiento) => {
    setProcessingSub(sub.id)
    const originalDate = new Date(sub.created_at)
    const newDate = new Date()

    const maxDaysInThisMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate()
    const targetDay = Math.min(originalDate.getDate(), maxDaysInThisMonth)

    newDate.setDate(targetDay)
    newDate.setHours(12, 0, 0, 0)

    const { error } = await supabase.from("movimientos").insert({
      cantidad: sub.cantidad,
      categoria: sub.categoria,
      nota: sub.nota,
      is_recurring: true,
      created_at: newDate.toISOString()
    })

    if (!error) {
      setPendingSubs(prev => prev.filter(p => p.id !== sub.id))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 1800)
    }
    setProcessingSub(null)
  }

  const handleCancelarSub = async (id: string) => {
    setProcessingSub(id)
    const { error } = await supabase.from("movimientos").update({ is_recurring: false }).eq("id", id)
    if (!error) setPendingSubs(prev => prev.filter(p => p.id !== id))
    setProcessingSub(null)
  }

  function handleDigit(d: string) {
    triggerHaptic(); setError(null)
    setDisplay((prev) => {
      if (prev.length >= 8) return prev
      if (d === "." && prev.includes(".")) return prev
      if (prev === "0" && d !== ".") return d
      return prev + d
    })
  }

  function handleBackspace() {
    triggerHaptic(); setError(null)
    setDisplay((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)))
  }

  function onCategoryClick(catId: string) {
    if (catId === "Suscripciones" || catId === "suscripciones") {
      setPendingCat(catId); setShowRecurModal(true)
    } else {
      handleCategoria(catId, false)
    }
  }

  async function handleCategoria(cat: string, isRecurring: boolean) {
    triggerHaptic(); setShowRecurModal(false);
    const cantidad = parseFloat(display)
    if (!cantidad || cantidad <= 0) return setError("Introduce una cantidad mayor que 0.")
    setLoading(true); setError(null)

    const { error } = await supabase.from("movimientos").insert({
      cantidad, categoria: cat, nota: nota || null, is_recurring: isRecurring
    })

    setLoading(false)
    if (error) setError("Error al guardar.")
    else { setSuccess(true); setDisplay("0"); setNota(""); setTimeout(() => setSuccess(false), 1800) }
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"]

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">
      {success && (
        <div className="absolute inset-0 z-40 bg-zinc-950/95 flex flex-col items-center justify-center gap-3 rounded-t-xl animate-in fade-in duration-300">
          <CheckCircle2 className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
          <p className="text-emerald-400 font-semibold text-lg">¡Guardado!</p>
        </div>
      )}

      {showRecurModal && (
        <div className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <CalendarDays className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-zinc-100 font-semibold mb-2">¿Es un pago mensual?</h3>
            <p className="text-zinc-500 text-sm mb-6">Podemos marcarlo como suscripción para llevar un mejor control.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleCategoria(pendingCat!, true)} className="w-full py-3 text-sm bg-emerald-500 text-zinc-950 rounded-xl font-bold hover:bg-emerald-400 transition-all">Sí, se repite cada mes</button>
              <button onClick={() => handleCategoria(pendingCat!, false)} className="w-full py-3 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all">No, es solo un pago puntual</button>
              <button onClick={() => setShowRecurModal(false)} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {pendingSubs.length > 0 && (
        <div className="bg-emerald-950/30 border-b border-emerald-900/50 p-4 shadow-md">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CalendarDays className="w-4 h-4" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">
              ¿Cobrar para {new Date().toLocaleDateString('es-ES', { month: 'long' })}?
            </h3>
          </div>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {pendingSubs.map(sub => {
              const cat = getCatConfig(sub.categoria, categorias)
              return (
                <div key={sub.id} className="flex items-center justify-between bg-zinc-900/80 rounded-xl p-3 border border-emerald-900/30">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm text-zinc-200 truncate font-medium">{cat.emoji} {cat.label} {sub.nota ? `· ${sub.nota}` : ''}</p>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">{sub.cantidad}€</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleCancelarSub(sub.id)} disabled={processingSub === sub.id} className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/50 flex items-center justify-center transition-all"><X className="w-4 h-4" /></button>
                    <button onClick={() => handleCobrarSub(sub)} disabled={processingSub === sub.id} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-zinc-950 transition-all flex items-center gap-1">
                      {processingSub === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cobrar"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col items-end justify-end px-6 pt-6 pb-4 border-b border-zinc-800/60 bg-zinc-950">
        {error && <p className="text-xs text-red-400 mb-2 self-start">{error}</p>}
        <div className="flex items-baseline gap-2">
          <span className="text-zinc-500 text-3xl font-light">€</span>
          <span className="text-zinc-100 text-6xl font-light tracking-tight leading-none tabular-nums">{display}</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button key={k} onClick={() => handleDigit(k)} disabled={loading} className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-100 text-xl font-light active:bg-zinc-800 transition-colors select-none">{k}</button>
          ))}
          <button onClick={handleBackspace} disabled={loading} className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-400 active:bg-zinc-800 transition-colors flex items-center justify-center select-none"><Delete className="w-5 h-5" /></button>
        </div>

        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Nota opcional</p>
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={80} placeholder="Ej: Cena con Juan" className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
        </div>

        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 px-1">Categoría</p>
          <div className="grid grid-cols-3 gap-3 mb-3 px-1">
            {categorias.map((cat) => (
              <CategoryButton key={cat.id} cat={cat} onPress={onCategoryClick} loading={loading || display === "0" || display === "0."} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponente Botón Categoría ───────────────────────────────────────────
function CategoryButton({
  cat,
  onPress,
  loading,
}: {
  cat: Categoria
  onPress: (id: string) => void
  loading: boolean
}) {
  return (
    <button
      onClick={() => onPress(cat.id)}
      disabled={loading}
      className="h-20 w-full rounded-2xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 select-none shadow-sm p-2"
    >
      <span className="text-2xl leading-none">{cat.emoji}</span>
      <span className="text-[13px] font-bold text-center leading-tight break-words">
        {cat.label}
      </span>
    </button>
  )
}