"use client"

// components/tabs/IngresoTab.tsx
// Cambios respecto a la versión anterior:
//   - handleCobrarSub: insert único con created_at ya calculado (sin UPDATE posterior)
//   - CategoryButton: disabled incluye loading para evitar doble envío
//   - encryptData/decryptData ahora son async → se usa await

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import {
  CalendarDays, X, Loader2, CheckCircle2, Delete,
  TrendingDown, TrendingUp, ArrowLeftRight,
} from "lucide-react"
import { getIcon } from "@/lib/icons"
import type { Categoria, Movimiento, Cuenta } from "@/types"
import BottomSheet, { SheetTrigger } from "@/components/ui/BottomSheet"
import { encryptData, decryptData, DECRYPT_ERROR } from "@/lib/crypto"
import { invalidateSaldoCache } from "@/components/tabs/DashboardTab"
import EncryptionBadge from "@/components/ui/Encryptionbadge"

function triggerHaptic() {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(50)
  }
}

type TipoActivo = "gasto" | "ingreso" | "transferencia"

export default function IngresoTab({
  categorias, cuentas,
}: {
  categorias: Categoria[]
  cuentas: Cuenta[]
}) {
  const t = useTranslations()
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
  const [recurPeriod, setRecurPeriod] = useState<'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual'>('monthly')
  const [showPeriodStep, setShowPeriodStep] = useState(false)
  const [isRecurringTransfer, setIsRecurringTransfer] = useState(false)
  const [lastSaved, setLastSaved] = useState<{ cantidad: number; catLabel: string; cuentaNombre: string | null; tipo: TipoActivo } | null>(null)

  useEffect(() => {
    if (cuentas.length > 0 && !cuentaId) setCuentaId(cuentas[0].id)
  }, [cuentas, cuentaId])

  useEffect(() => {
    // Bug 8 FIX: user_id explícito para no depender solo de RLS.
    // Bug 2 FIX: distinguimos DECRYPT_ERROR de dato vacío legítimo.
    ; (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("movimientos")
        .select("*")
        .eq("is_recurring", true)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (!data) return
      const now = new Date()
      const map = new Map<string, Movimiento>()

      const decrypted = await Promise.all(
        data.map(async m => {
          const cantidadStr = await decryptData(m.cantidad)
          const notaStr = m.nota ? await decryptData(m.nota) : null
          return {
            ...m,
            cantidad: cantidadStr === DECRYPT_ERROR ? -1 : (parseFloat(cantidadStr) || 0),
            nota: notaStr === DECRYPT_ERROR ? DECRYPT_ERROR : notaStr,
          }
        })
      )

      decrypted.forEach(m => {
        const key = `${m.categoria}-${m.nota || ""}`
        if (!map.has(key)) map.set(key, m)
      })

      const pending: Movimiento[] = []
      map.forEach(sub => {
        if (sub.cantidad === -1) return // irrecuperable — no mostrar
        const ultimo = new Date(sub.created_at)
        const meses = mesesDePeriod(sub.recur_period)
        const vencimiento = new Date(
          ultimo.getFullYear(),
          ultimo.getMonth() + meses,
          ultimo.getDate(),
          12, 0, 0, 0
        )
        if (vencimiento <= now) pending.push(sub)
      })

      setPendingSubs(pending)
    })()
  }, [])

  const accent =
    tipoMovimiento === "ingreso"
      ? { text: "text-emerald-400", bg: "bg-emerald-500", hover: "hover:bg-emerald-400", border: "border-emerald-500/50", ring: "focus:ring-emerald-500/20" }
      : tipoMovimiento === "transferencia"
        ? { text: "text-blue-400", bg: "bg-blue-500", hover: "hover:bg-blue-400", border: "border-blue-500/50", ring: "focus:ring-blue-500/20" }
        : { text: "text-red-400", bg: "bg-red-500", hover: "hover:bg-red-400", border: "border-red-500/50", ring: "focus:ring-red-500/20" }

  function handleDigit(d: string) {
    triggerHaptic()
    setError(null)
    setDisplay(prev => {
      if (prev.length >= 8) return prev
      if (d === "." && prev.includes(".")) return prev
      if (prev === "0" && d !== ".") return d
      return prev + d
    })
  }

  function handleBackspace() {
    triggerHaptic()
    setError(null)
    setDisplay(prev => prev.length <= 1 ? "0" : prev.slice(0, -1))
  }

function onCategoryClick(catId: string) {
  const cat = categorias.find(c => c.id === catId)
  if (cat?.can_be_recurring) {
    setPendingCat(catId)
    setShowRecurModal(true)
  } else {
    handleGuardar(catId, false)
  }
}

  function mesesDePeriod(period?: string | null): number {
    switch (period) {
      case 'bimonthly': return 2
      case 'quarterly': return 3
      case 'semiannual': return 6
      case 'annual': return 12
      default: return 1
    }
  }

  async function handleGuardar(
    cat: string,
    isRecurring: boolean,
    period?: Movimiento["recur_period"] | null,
  ) {
    triggerHaptic()
    setShowRecurModal(false)
    setShowPeriodStep(false)
    const cantidadRaw = parseFloat(display)
    if (!cantidadRaw || cantidadRaw <= 0) return setError(t("ingreso.errorAmountZero"))
    setLoading(true)
    setError(null)

    const cantidadEncriptada = await encryptData(cantidadRaw)
    const notaEncriptada = nota ? await encryptData(nota.trim()) : null

    const { error } = await supabase.from("movimientos").insert({
      cantidad: cantidadEncriptada,
      categoria: cat,
      nota: notaEncriptada,
      is_recurring: isRecurring,
      ...(isRecurring && period ? { recur_period: period } : {}),
      tipo: tipoMovimiento,
      cuenta_id: cuentaId || null,
    })

    setLoading(false)
    if (error) {
      setError(t("ingreso.errorSave"))
    } else {
      invalidateSaldoCache()
      const catLabel = categorias.find(c => c.id === cat)?.label ?? cat
      const cuentaNombre = cuentas.find(c => c.id === cuentaId)?.nombre ?? null
      setLastSaved({ cantidad: cantidadRaw, catLabel, cuentaNombre, tipo: tipoMovimiento })
      setSuccess(true)
      setDisplay("0")
      setNota("")
      setTimeout(() => setSuccess(false), 2500)
    }
  }

  async function handleGuardarTransferencia() {
    triggerHaptic()
    const cantidadRaw = parseFloat(display)
    if (!cantidadRaw || cantidadRaw <= 0) return setError(t("ingreso.errorAmountZero"))
    if (!cuentaId || !cuentaDestinoId) return setError(t("ingreso.errorSelectBothAccounts"))
    if (cuentaId === cuentaDestinoId) return setError(t("ingreso.errorSameAccount"))

    setLoading(true)
    setError(null)

    const cantidadEncriptada = await encryptData(cantidadRaw)
    const notaEncriptada = nota ? await encryptData(nota.trim()) : null

    const { error } = await supabase.from("movimientos").insert({
      cantidad: cantidadEncriptada,
      categoria: "transferencia",
      nota: notaEncriptada,
      is_recurring: isRecurringTransfer,
      tipo: "transferencia",
      cuenta_id: cuentaId,
      cuenta_destino_id: cuentaDestinoId,
    })

    setLoading(false)
    if (error) {
      setError(`Error: ${error.message}`)
    } else {
      invalidateSaldoCache()
      const cuentaOrigenNombre = cuentas.find(c => c.id === cuentaId)?.nombre ?? null
      setLastSaved({ cantidad: cantidadRaw, catLabel: t("ingreso.typeTransferencia"), cuentaNombre: cuentaOrigenNombre, tipo: "transferencia" })
      setSuccess(true)
      setDisplay("0")
      setNota("")
      setCuentaDestinoId("")
      setIsRecurringTransfer(false)
      setTimeout(() => setSuccess(false), 2500)
    }
  }

  async function handleCobrarSub(sub: Movimiento) {
    setProcessingSub(sub.id)

    const orig = new Date(sub.created_at)
    const meses = mesesDePeriod(sub.recur_period)
    const maxDay = new Date(orig.getFullYear(), orig.getMonth() + meses + 1, 0).getDate()
    const dia = Math.min(orig.getDate(), maxDay)

    // Calculamos created_at en el cliente e insertamos en un solo paso
    // (antes se hacía insert + update separados, lo que podía dejar fecha incorrecta si el update fallaba)
    const fechaObjetivo = new Date(
      orig.getFullYear(),
      orig.getMonth() + meses,
      dia,
      12, 0, 0, 0
    ).toISOString()

    const cantidadEncriptada = await encryptData(sub.cantidad)
    const notaEncriptada = sub.nota ? await encryptData(sub.nota) : null

    const { error } = await supabase
      .from("movimientos")
      .insert({
        cantidad: cantidadEncriptada,
        categoria: sub.categoria,
        nota: notaEncriptada,
        is_recurring: true,
        recur_period: sub.recur_period ?? 'monthly',
        tipo: sub.tipo ?? "gasto",
        cuenta_id: sub.cuenta_id,
        created_at: fechaObjetivo,   // ← directo en el insert, sin UPDATE posterior
      })

    if (error) {
      console.error("handleCobrarSub error:", error.message)
      setProcessingSub(null)
      return
    }

    setPendingSubs(prev => prev.filter(p => p.id !== sub.id))
    invalidateSaldoCache()
    setSuccess(true)
    setTimeout(() => setSuccess(false), 1800)
    setProcessingSub(null)
  }

  async function handleCancelarSub(id: string) {
    setProcessingSub(id)
    const { error } = await supabase
      .from("movimientos")
      .update({ is_recurring: false })
      .eq("id", id)
    if (!error) setPendingSubs(prev => prev.filter(p => p.id !== id))
    setProcessingSub(null)
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"]
  const isDisabled = loading || display === "0" || display === "0."
  const isTransfer = tipoMovimiento === "transferencia"

  const getCatLabel = (catId: string) =>
    categorias.find(c => c.id === catId)?.label ?? catId

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-4 duration-500">

      {success && lastSaved && (
        <div className="absolute inset-0 z-40 bg-zinc-950/95 flex flex-col items-center justify-center gap-4 rounded-t-xl animate-in fade-in duration-300 px-8">
          <CheckCircle2 className={`w-14 h-14 ${accent.text}`} strokeWidth={1.5} />
          <p className={`font-semibold text-lg ${accent.text}`}>{t("ingreso.savedOk")}</p>
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{t("ingreso.savedAmount")}</span>
              <span className={`font-semibold tabular-nums ${accent.text}`}>
                {lastSaved.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{t("ingreso.savedCategory")}</span>
              <span className="text-zinc-200 font-medium">{lastSaved.catLabel}</span>
            </div>
            {lastSaved.cuentaNombre && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">{t("ingreso.savedAccount")}</span>
                <span className="text-zinc-200">{lastSaved.cuentaNombre}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showRecurModal && (
        <div
          className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recur-modal-title"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <CalendarDays className={`w-10 h-10 mx-auto mb-3 ${accent.text}`} aria-hidden="true" />

            {!showPeriodStep ? (
              <>
                <h3 id="recur-modal-title" className="text-zinc-100 font-semibold mb-2">
                  {tipoMovimiento === "ingreso" ? t("ingreso.recurModalTitleIngreso") : t("ingreso.recurModalTitleGasto")}
                </h3>
                <p className="text-zinc-500 text-sm mb-6">
                  {tipoMovimiento === "ingreso" ? t("ingreso.recurModalDescIngreso") : t("ingreso.recurModalDescGasto")}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowPeriodStep(true)}
                    className="w-full py-3 text-sm bg-zinc-700 text-zinc-100 rounded-xl font-bold hover:bg-zinc-600 transition-all"
                  >
                    {tipoMovimiento === "ingreso" ? t("ingreso.recurYesIngreso") : t("ingreso.recurYesGasto")}
                  </button>
                  <button
                    onClick={() => handleGuardar(pendingCat!, false)}
                    className="w-full py-3 text-sm bg-zinc-700 text-zinc-100 rounded-xl font-bold hover:bg-zinc-600 transition-all"
                  >
                    {tipoMovimiento === "ingreso" ? t("ingreso.recurNoIngreso") : t("ingreso.recurNoGasto")}
                  </button>
                  <button
                    onClick={() => { setShowRecurModal(false); setShowPeriodStep(false) }}
                    className="mt-1 text-xs text-zinc-600 hover:text-zinc-400"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="recur-modal-title" className="text-zinc-100 font-semibold mb-2">{t("ingreso.recurPeriodTitle")}</h3>
                <p className="text-zinc-500 text-sm mb-4">{t("ingreso.recurPeriodDesc")}</p>
                <div className="flex flex-col gap-2 mb-4">
                  {([
                    { value: 'monthly', label: t("ingreso.recurMonthly"), sub: t("ingreso.recurMonthlyDesc") },
                    { value: 'bimonthly', label: t("ingreso.recurBimonthly"), sub: t("ingreso.recurBimonthlyDesc") },
                    { value: 'quarterly', label: t("ingreso.recurQuarterly"), sub: t("ingreso.recurQuarterlyDesc") },
                    { value: 'semiannual', label: t("ingreso.recurSemiannual"), sub: t("ingreso.recurSemiannualDesc") },
                    { value: 'annual', label: t("ingreso.recurAnnual"), sub: t("ingreso.recurAnnualDesc") },
                  ] as const).map(({ value, label, sub }) => (
                    <button
                      key={value}
                      onClick={() => setRecurPeriod(value)}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm text-left transition-all border flex justify-between items-center ${recurPeriod === value
                        ? `${accent.bg} text-zinc-950 font-bold border-transparent`
                        : 'text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                        }`}
                    >
                      <span>{label}</span>
                      <span className={`text-xs ${recurPeriod === value ? 'text-zinc-950/60' : 'text-zinc-500'}`}>{sub}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPeriodStep(false)}
                    className="flex-1 py-2.5 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all"
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={() => handleGuardar(pendingCat!, true, recurPeriod)}
                    className={`flex-1 py-2.5 text-sm ${accent.bg} text-zinc-950 rounded-xl font-bold ${accent.hover} transition-all`}
                  >
                    {t("common.save")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {pendingSubs.length > 0 && (
        <div className="border-b border-zinc-800/60 p-4 bg-zinc-950">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <p className="font-semibold text-xs uppercase tracking-wider text-zinc-400">
              {t("ingreso.pendingTitle")} — {new Date().toLocaleDateString("es-ES", { month: "long" })}
            </p>
          </div>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {pendingSubs.map(sub => {
              const esIngreso = sub.tipo === "ingreso"
              const catLabel = getCatLabel(sub.categoria)
              return (
                <div
                  key={sub.id}
                  className={`flex items-center justify-between rounded-xl p-3 border ${esIngreso
                    ? "bg-emerald-950/20 border-emerald-900/30"
                    : "bg-red-950/20 border-red-900/30"
                    }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${esIngreso ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}>
                      {esIngreso ? t("ingreso.pendingLabelIngreso") : t("ingreso.pendingLabelGasto")}
                    </span>
                    <p className="text-sm text-zinc-200 truncate font-medium mt-1">
                      {catLabel}{sub.nota && sub.nota !== DECRYPT_ERROR ? ` · ${sub.nota}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {sub.cantidad === -1
                        ? t("common.encryptedShort")
                        : `${sub.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`
                      }
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleCancelarSub(sub.id)}
                      disabled={processingSub === sub.id}
                      aria-label={`Cancelar recurrente ${catLabel}`}
                      className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCobrarSub(sub)}
                      disabled={processingSub === sub.id}
                      aria-label={`Cobrar recurrente ${catLabel}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${esIngreso
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950"
                        : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-zinc-950"
                        }`}
                    >
                      {processingSub === sub.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : esIngreso ? t("ingreso.pendingCollect") : t("ingreso.pendingPay")
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-2">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800" role="group" aria-label={t("ingreso.ariaTypeGroup")}>
          {([
            { id: "gasto", label: t("ingreso.typeGasto"), Icon: TrendingDown, activeClass: "bg-red-500/15 text-red-400 border border-red-500/30" },
            { id: "ingreso", label: t("ingreso.typeIngreso"), Icon: TrendingUp, activeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
            { id: "transferencia", label: t("ingreso.typeTransferencia"), Icon: ArrowLeftRight, activeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
          ] as const).map(({ id, label, Icon, activeClass }) => (
            <button
              key={id}
              onClick={() => { setTipoMovimiento(id); setError(null) }}
              aria-pressed={tipoMovimiento === id}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${tipoMovimiento === id ? activeClass : "text-zinc-600 hover:text-zinc-400"
                }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === "transferencia" ? t("ingreso.typeTransferShort") : label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-end justify-end px-6 pt-2 pb-2 border-b border-zinc-800/60 bg-zinc-950">
        {error && <p className="text-xs text-red-400 mb-1 self-start" role="alert">{error}</p>}
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-light transition-colors duration-200 ${accent.text}`} aria-hidden="true">€</span>
          <span className="text-5xl font-light tracking-tight leading-none tabular-nums text-zinc-100">
            {display}
          </span>
        </div>
        <div className="flex items-center justify-between w-full mt-1">
          <EncryptionBadge />
          <p className={`text-xs font-medium uppercase tracking-widest ${accent.text} opacity-60`}>
            {tipoMovimiento === "gasto" ? t("ingreso.typeGasto") : tipoMovimiento === "ingreso" ? t("ingreso.typeIngreso") : t("ingreso.typeTransferencia")}
          </p>
        </div>
      </div>

      {lastSaved && !success && (
        <div className="px-4 pt-2 pb-0">
          <button
            onClick={() => {/* abre EditMovimientoModal — conectar en Bloque 11 */}}
            className="w-full flex items-center justify-between bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
          >
            <span>{t("ingreso.lastSaved")}: <span className="text-zinc-300">{lastSaved.catLabel} · {lastSaved.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€</span></span>
            <span className="text-zinc-600 text-[10px] uppercase tracking-wider ml-2">{t("ingreso.lastSavedEdit")}</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 flex flex-col gap-4">

          <div>
            <label htmlFor="nota-input" className="block text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">
              {t("ingreso.labelNota")}
            </label>
            <input
              id="nota-input"
              type="text"
              value={nota}
              onChange={e => setNota(e.target.value)}
              maxLength={80}
              placeholder={
                tipoMovimiento === "ingreso"
                  ? t("ingreso.placeholderNotaIngreso")
                  : tipoMovimiento === "transferencia"
                    ? t("ingreso.placeholderNotaTransfer")
                    : t("ingreso.placeholderNotaGasto")
              }
              className={`w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all focus:ring-1 ${accent.border} ${accent.ring}`}
            />
          </div>

          {isTransfer && (
            <div className="space-y-3">
              {cuentas.length < 2 ? (
                <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-300 font-medium mb-1">{t("ingreso.needTwoAccounts")}</p>
                  <p className="text-xs text-zinc-500">{t("ingreso.needTwoAccountsHint")}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">{t("ingreso.labelCuentaOrigen")}</p>
                    {(() => {
                      const c = cuentas.find(c => c.id === cuentaId)
                      return (
                        <SheetTrigger
                          onClick={() => setShowCuentaSheet(true)}
                          placeholder={t("ingreso.placeholderSelectCuenta")}
                          label={c?.nombre}
                          icono={c?.icono}
                          color={c?.color}
                        />
                      )
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">{t("ingreso.labelCuentaDestino")}</p>
                    {(() => {
                      const c = cuentas.find(c => c.id === cuentaDestinoId)
                      return (
                        <SheetTrigger
                          onClick={() => setShowCuentaDestSheet(true)}
                          placeholder={t("ingreso.placeholderSelectCuenta")}
                          label={c?.nombre}
                          icono={c?.icono}
                          color={c?.color}
                        />
                      )
                    })()}
                  </div>
                  <div className="flex items-center justify-between px-1 py-2">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">{t("ingreso.recurringTransferLabel")}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{t("ingreso.recurringTransferDesc")}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRecurringTransfer}
                      onClick={() => setIsRecurringTransfer(v => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${isRecurringTransfer ? "bg-blue-500" : "bg-zinc-700"
                        }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${isRecurringTransfer ? "left-5" : "left-1"
                        }`} />
                    </button>
                  </div>
                  <button
                    onClick={handleGuardarTransferencia}
                    disabled={isDisabled || !cuentaDestinoId || loading}
                    className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ArrowLeftRight className="w-4 h-4" />
                    }
                    {t("ingreso.registerTransfer")}
                  </button>
                </>
              )}
            </div>
          )}

          {!isTransfer && (
            <>
              {cuentas.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">{t("ingreso.labelCuenta")}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("ingreso.ariaSelectCuenta")}>
                    {cuentas.map(c => {
                      const CIcon = getIcon(c.icono)
                      const selected = cuentaId === c.id
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCuentaId(c.id)}
                          aria-pressed={selected}
                          aria-label={`Cuenta ${c.nombre}`}
                          style={{
                            borderColor: selected ? c.color : c.color + "40",
                            backgroundColor: selected ? c.color + "33" : c.color + "12",
                          }}
                          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all"
                        >
                          <CIcon className="w-4 h-4" style={{ color: c.color }} aria-hidden="true" />
                          <span style={{ color: selected ? c.color : c.color + "99" }}>{c.nombre}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest">{t("ingreso.labelCategoria")}</p>
                  <p className="text-[10px] text-zinc-700">{t("ingreso.manageInSettings")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from(
                    new Map(
                      categorias
                        .filter(c =>
                          tipoMovimiento === "ingreso"
                            ? c.tipo === "ingreso" || c.tipo === "ambos"
                            : c.tipo === "gasto" || c.tipo === "ambos"
                        )
                        .map(c => [c.id, c])
                    ).values()
                  ).map(cat => (
                    <CategoryButton
                      key={cat.id}
                      cat={cat}
                      onPress={onCategoryClick}
                      disabled={isDisabled || loading}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 px-6 py-3 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
        {keys.map(k => (
          <button
            key={k}
            onClick={() => { if (k === ".") triggerHaptic(); handleDigit(k) }}
            aria-label={k === "." ? t("ingreso.ariaDecimalPoint") : k}
            className="h-14 flex items-center justify-center text-2xl font-light text-zinc-200 active:bg-zinc-800 active:scale-95 rounded-xl transition-all duration-75 tabular-nums"
          >
            {k}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          aria-label={t("pin.ariaDeleteDigit")}
          className="h-14 flex items-center justify-center text-zinc-500 hover:text-red-400 active:bg-zinc-800 active:scale-95 rounded-xl transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      <BottomSheet
        isOpen={showCuentaSheet}
        onClose={() => setShowCuentaSheet(false)}
        title={t("ingreso.sheetTitleCuentaOrigen")}
        value={cuentaId}
        onChange={setCuentaId}
        options={cuentas.map(c => ({ value: c.id, label: c.nombre, icono: c.icono, color: c.color }))}
      />
      <BottomSheet
        isOpen={showCuentaDestSheet}
        onClose={() => setShowCuentaDestSheet(false)}
        title={t("ingreso.sheetTitleCuentaDestino")}
        value={cuentaDestinoId}
        onChange={setCuentaDestinoId}
        options={cuentas.filter(c => c.id !== cuentaId).map(c => ({ value: c.id, label: c.nombre, icono: c.icono, color: c.color }))}
      />
    </div>
  )
}

function CategoryButton({
  cat, onPress, disabled,
}: {
  cat: Categoria
  onPress: (id: string) => void
  disabled: boolean
}) {
  const CatIcon = getIcon(cat.icono)
  return (
    <button
      onClick={() => onPress(cat.id)}
      disabled={disabled}
      aria-label={`Categoría ${cat.label}`}
      className="h-20 w-full rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-500 hover:bg-zinc-800/80 disabled:opacity-40 transition-all duration-200 flex flex-col items-center justify-center gap-2 select-none p-2"
    >
      <CatIcon className="w-5 h-5 text-zinc-400" aria-hidden="true" />
      <span className="text-[11px] font-medium text-zinc-300 text-center leading-tight">{cat.label}</span>
    </button>
  )
}