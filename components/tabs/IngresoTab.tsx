"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  CalendarDays, X, Loader2, CheckCircle2, Delete,
  TrendingDown, TrendingUp, ArrowLeftRight,
} from "lucide-react"
import { getIcon } from "@/lib/icons"
import type { Categoria, Movimiento, Cuenta } from "@/types"
import BottomSheet, { SheetTrigger, type SheetOption } from "@/components/ui/BottomSheet"

function triggerHaptic() {
  if (typeof window !== "undefined" && window.navigator?.vibrate) window.navigator.vibrate(50)
}

type TipoActivo = "gasto" | "ingreso" | "transferencia"

export default function IngresoTab({
  categorias, cuentas,
}: {
  categorias: Categoria[]
  cuentas: Cuenta[]
}) {
  const [display, setDisplay] = useState("0")
  const [nota, setNota] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoActivo>("gasto")
  const [cuentaId, setCuentaId] = useState<string>("")
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>("")
  const [showRecurModal, setShowRecurModal] = useState(false)
  const [pendingCat, setPendingCat] = useState<string | null>(null)
  const [pendingSubs, setPendingSubs] = useState<Movimiento[]>([])
  const [processingSub, setProcessingSub] = useState<string | null>(null)
  const [showCuentaSheet, setShowCuentaSheet] = useState(false)
  const [showCuentaDestSheet, setShowCuentaDestSheet] = useState(false)

  // Auto-select primera cuenta cuando están disponibles
  useEffect(() => {
    if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  useEffect(() => {
    supabase.from("movimientos").select("*").eq("is_recurring", true)
      .order("created_at", { ascending: false }).then(({ data }) => {
        if (!data) return
        const now = new Date(); const cm = now.getMonth(); const cy = now.getFullYear()
        const map = new Map<string, Movimiento>()
        data.forEach(m => { const key = `${m.categoria}-${m.nota || ""}`; if (!map.has(key)) map.set(key, m) })
        const pending: Movimiento[] = []
        map.forEach(sub => {
          const d = new Date(sub.created_at)
          if (d.getMonth() !== cm || d.getFullYear() !== cy) pending.push(sub)
        })
        setPendingSubs(pending)
      })
  }, [])

  // ── Colores dinámicos ────────────────────────────────────────────────────
  const accent = tipoMovimiento === "ingreso"
    ? { text: "text-emerald-400", bg: "bg-emerald-500", hover: "hover:bg-emerald-400", border: "border-emerald-500/50", ring: "focus:ring-emerald-500/20" }
    : tipoMovimiento === "transferencia"
      ? { text: "text-blue-400", bg: "bg-blue-500", hover: "hover:bg-blue-400", border: "border-blue-500/50", ring: "focus:ring-blue-500/20" }
      : { text: "text-red-400", bg: "bg-red-500", hover: "hover:bg-red-400", border: "border-red-500/50", ring: "focus:ring-red-500/20" }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleDigit(d: string) {
    triggerHaptic(); setError(null)
    setDisplay(prev => {
      if (prev.length >= 8) return prev
      if (d === "." && prev.includes(".")) return prev
      if (prev === "0" && d !== ".") return d
      return prev + d
    })
  }

  function handleBackspace() {
    triggerHaptic(); setError(null)
    setDisplay(prev => prev.length <= 1 ? "0" : prev.slice(0, -1))
  }

  function onCategoryClick(catId: string) {
    const debePreguntar = tipoMovimiento === "ingreso" || catId === "Suscripciones" || catId === "suscripciones"
    if (debePreguntar) { setPendingCat(catId); setShowRecurModal(true) }
    else handleGuardar(catId, false)
  }

  async function handleGuardar(cat: string, isRecurring: boolean) {
    triggerHaptic(); setShowRecurModal(false)
    const cantidad = parseFloat(display)
    if (!cantidad || cantidad <= 0) return setError("Introduce una cantidad mayor que 0.")
    setLoading(true); setError(null)

    const { error } = await supabase.from("movimientos").insert({
      cantidad, categoria: cat, nota: nota || null,
      is_recurring: isRecurring, tipo: tipoMovimiento,
      cuenta_id: cuentaId || null,
    })

    setLoading(false)
    if (error) { setError("Error al guardar.") }
    else { setSuccess(true); setDisplay("0"); setNota(""); setTimeout(() => setSuccess(false), 1800) }
  }

  async function handleGuardarTransferencia() {
  triggerHaptic()
  const cantidad = parseFloat(display)
  if (!cantidad || cantidad <= 0) return setError("Introduce una cantidad mayor que 0.")
  if (!cuentaId || !cuentaDestinoId) return setError("Selecciona ambas cuentas.")
  if (cuentaId === cuentaDestinoId) return setError("Las cuentas deben ser diferentes.")

  setLoading(true); setError(null)
  const { error } = await supabase.from("movimientos").insert({
    cantidad,
    categoria: "transferencia",
    nota: nota || null,
    is_recurring: false,
    tipo: "transferencia",
    cuenta_id: cuentaId,
    cuenta_destino_id: cuentaDestinoId,
  })
  setLoading(false)
  if (error) {
    console.error("Error transferencia:", error) // ← ver el error real
    setError(`Error: ${error.message}`)          // ← mostrar el mensaje real
  } else {
    setSuccess(true); setDisplay("0"); setNota("")
    setCuentaDestinoId(""); setTimeout(() => setSuccess(false), 1800)
  }
}

  async function handleCobrarSub(sub: Movimiento) {
    setProcessingSub(sub.id)
    const orig = new Date(sub.created_at); const now = new Date()
    const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    now.setDate(Math.min(orig.getDate(), maxDay)); now.setHours(12, 0, 0, 0)
    const { error } = await supabase.from("movimientos").insert({
      cantidad: sub.cantidad, categoria: sub.categoria, nota: sub.nota,
      is_recurring: true, tipo: sub.tipo ?? "gasto",
      cuenta_id: sub.cuenta_id, created_at: now.toISOString(),
    })
    if (!error) { setPendingSubs(prev => prev.filter(p => p.id !== sub.id)); setSuccess(true); setTimeout(() => setSuccess(false), 1800) }
    setProcessingSub(null)
  }

  async function handleCancelarSub(id: string) {
    setProcessingSub(id)
    const { error } = await supabase.from("movimientos").update({ is_recurring: false }).eq("id", id)
    if (!error) setPendingSubs(prev => prev.filter(p => p.id !== id))
    setProcessingSub(null)
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"]
  const isDisabled = loading || display === "0" || display === "0."
  const isTransfer = tipoMovimiento === "transferencia"

  const cuentasDestino = cuentas.filter(c => c.id !== cuentaId)

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* Overlay éxito */}
      {success && (
        <div className="absolute inset-0 z-40 bg-zinc-950/95 flex flex-col items-center justify-center gap-3 rounded-t-xl animate-in fade-in duration-300">
          <CheckCircle2 className={`w-16 h-16 ${accent.text}`} strokeWidth={1.5} />
          <p className={`font-semibold text-lg ${accent.text}`}>¡Guardado!</p>
        </div>
      )}

      {/* Modal recurrencia */}
      {showRecurModal && (
        <div className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <CalendarDays className={`w-10 h-10 mx-auto mb-3 ${accent.text}`} />
            <h3 className="text-zinc-100 font-semibold mb-2">
              {tipoMovimiento === "ingreso" ? "¿Se cobra cada mes?" : "¿Es un pago mensual?"}
            </h3>
            <p className="text-zinc-500 text-sm mb-6">
              {tipoMovimiento === "ingreso"
                ? "Podemos recordártelo para que confirmes si ya has cobrado."
                : "Podemos marcarlo como suscripción para mejor control."}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleGuardar(pendingCat!, true)}
                className={`w-full py-3 text-sm ${accent.bg} text-zinc-950 rounded-xl font-bold ${accent.hover} transition-all`}>
                {tipoMovimiento === "ingreso" ? "Sí, se cobra mensualmente" : "Sí, se repite cada mes"}
              </button>
              <button onClick={() => handleGuardar(pendingCat!, false)}
                className="w-full py-3 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all">
                {tipoMovimiento === "ingreso" ? "No, es un ingreso puntual" : "No, es solo un pago puntual"}
              </button>
              <button onClick={() => setShowRecurModal(false)} className="mt-1 text-xs text-zinc-600 hover:text-zinc-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Banner recurrentes pendientes */}
      {pendingSubs.length > 0 && (
        <div className="border-b border-zinc-800/60 p-4 bg-zinc-950">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-zinc-400" />
            <p className="font-semibold text-xs uppercase tracking-wider text-zinc-400">
              Recurrentes pendientes — {new Date().toLocaleDateString("es-ES", { month: "long" })}
            </p>
          </div>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {pendingSubs.map(sub => {
              const esIngreso = sub.tipo === "ingreso"
              return (
                <div key={sub.id} className={`flex items-center justify-between rounded-xl p-3 border ${esIngreso ? "bg-emerald-950/20 border-emerald-900/30" : "bg-red-950/20 border-red-900/30"
                  }`}>
                  <div className="min-w-0 flex-1 pr-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${esIngreso ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}>{esIngreso ? "↑ Ingreso" : "↓ Gasto"}</span>
                    <p className="text-sm text-zinc-200 truncate font-medium mt-1">
                      {sub.categoria}{sub.nota ? ` · ${sub.nota}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{sub.cantidad}€</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleCancelarSub(sub.id)} disabled={processingSub === sub.id}
                      className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-all">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleCobrarSub(sub)} disabled={processingSub === sub.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${esIngreso
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950"
                        : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-zinc-950"
                        }`}>
                      {processingSub === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : esIngreso ? "¿Cobrado?" : "Cobrar"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toggle tipo */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          {([
            { id: "gasto", label: "Gasto", Icon: TrendingDown, activeClass: "bg-red-500/15 text-red-400 border border-red-500/30" },
            { id: "ingreso", label: "Ingreso", Icon: TrendingUp, activeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
            { id: "transferencia", label: "Transferencia", Icon: ArrowLeftRight, activeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
          ] as const).map(({ id, label, Icon, activeClass }) => (
            <button key={id} onClick={() => { setTipoMovimiento(id); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${tipoMovimiento === id ? activeClass : "text-zinc-600 hover:text-zinc-400"
                }`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === "transferencia" ? "Transfer" : label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Display numérico */}
      <div className="flex flex-col items-end justify-end px-6 pt-3 pb-4 border-b border-zinc-800/60 bg-zinc-950">
        {error && <p className="text-xs text-red-400 mb-2 self-start">{error}</p>}
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-light transition-colors duration-200 ${accent.text}`}>€</span>
          <span className={`text-6xl font-light tracking-tight leading-none tabular-nums transition-colors duration-200 ${display === "0" ? "text-zinc-600" : accent.text
            }`}>{display}</span>
        </div>
        <p className={`text-xs mt-1 font-medium uppercase tracking-widest ${accent.text} opacity-60`}>
          {tipoMovimiento === "gasto" ? "Gasto" : tipoMovimiento === "ingreso" ? "Ingreso" : "Transferencia"}
        </p>
      </div>

      {/* Cuerpo principal */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map(k => (
            <button key={k} onClick={() => handleDigit(k)} disabled={loading}
              className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-100 text-xl font-light active:bg-zinc-800 transition-colors select-none">
              {k}
            </button>
          ))}
          <button onClick={handleBackspace} disabled={loading}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-400 active:bg-zinc-800 transition-colors flex items-center justify-center select-none">
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Nota */}
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Nota opcional</p>
          <input type="text" value={nota} onChange={e => setNota(e.target.value)} maxLength={80}
            placeholder={tipoMovimiento === "ingreso" ? "Ej: Nómina de marzo" : tipoMovimiento === "transferencia" ? "Ej: Ahorro mensual" : "Ej: Cena con Juan"}
            className={`w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all focus:ring-1 ${accent.border} ${accent.ring}`} />
        </div>

        {/* ── MODO TRANSFERENCIA ─────────────────────────────────────── */}
        {isTransfer && (
          <div className="space-y-3">
            {cuentas.length < 2 ? (
              <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 text-center">
                <p className="text-sm text-blue-300 font-medium mb-1">Necesitas al menos 2 cuentas</p>
                <p className="text-xs text-zinc-500">Crea tus cuentas desde el menú → Mis Cuentas</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Cuenta origen</p>
                  {(() => {
                    const c = cuentas.find(c => c.id === cuentaId)
                    return (
                      <SheetTrigger onClick={() => setShowCuentaSheet(true)} placeholder="Selecciona cuenta..."
                        label={c?.nombre} icono={c?.icono} color={c?.color} />
                    )
                  })()}
                </div>
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Cuenta destino</p>
                  {(() => {
                    const c = cuentas.find(c => c.id === cuentaDestinoId)
                    return (
                      <SheetTrigger onClick={() => setShowCuentaDestSheet(true)} placeholder="Selecciona cuenta..."
                        label={c?.nombre} icono={c?.icono} color={c?.color} />
                    )
                  })()}
                </div>
                <button onClick={handleGuardarTransferencia}
                  disabled={isDisabled || !cuentaDestinoId || loading}
                  className="w-full py-4 bg-sky-600 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  Registrar transferencia
                </button>
              </>
            )}
          </div>
        )}

        {/* ── MODO GASTO / INGRESO ───────────────────────────────────── */}
        {!isTransfer && (
          <>
            {/* Selector de cuenta */}
            {cuentas.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Cuenta</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {cuentas.map(c => {
                    const CIcon = getIcon(c.icono)
                    const selected = cuentaId === c.id
                    return (
                      <button key={c.id} onClick={() => setCuentaId(c.id)}
                        style={{
                          borderColor: selected ? c.color : c.color + "40",
                          backgroundColor: selected ? c.color + "33" : c.color + "12",
                        }}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all">
                        <CIcon className="w-4 h-4" style={{ color: c.color }} />
                        <span style={{ color: selected ? c.color : c.color + "99" }}>{c.nombre}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Grid de categorías */}
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 px-1">Categoría</p>
              <div className="grid grid-cols-3 gap-3">
                {categorias
                  .filter(c => tipoMovimiento === "ingreso" ? c.tipo === "ingreso" || c.tipo === "ambos" : c.tipo === "gasto" || c.tipo === "ambos")
                  .map(cat => (
                    <CategoryButton key={cat.id} cat={cat} onPress={onCategoryClick} disabled={isDisabled} />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
      <BottomSheet
        isOpen={showCuentaSheet} onClose={() => setShowCuentaSheet(false)}
        title="Cuenta origen" value={cuentaId}
        onChange={setCuentaId}
        options={cuentas.map(c => ({ value: c.id, label: c.nombre, icono: c.icono, color: c.color }))} />

      <BottomSheet
        isOpen={showCuentaDestSheet} onClose={() => setShowCuentaDestSheet(false)}
        title="Cuenta destino" value={cuentaDestinoId}
        onChange={setCuentaDestinoId}
        options={cuentas.filter(c => c.id !== cuentaId).map(c => ({ value: c.id, label: c.nombre, icono: c.icono, color: c.color }))} />
    </div>
  )
}

function CategoryButton({ cat, onPress, disabled }: {
  cat: Categoria; onPress: (id: string) => void; disabled: boolean
}) {
  const CatIcon = getIcon(cat.icono)
  return (
    <button onClick={() => onPress(cat.id)} disabled={disabled}
      className="h-20 w-full rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-40 transition-all duration-200 flex flex-col items-center justify-center gap-2 select-none p-2">
      <CatIcon className="w-5 h-5 text-zinc-400" />
      <span className="text-[11px] font-medium text-zinc-300 text-center leading-tight">{cat.label}</span>
    </button>
  )
}