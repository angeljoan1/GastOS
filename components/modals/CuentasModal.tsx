"use client"

// components/modals/CuentasModal.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #1: nombre y saldo_inicial se cifraban pero se guardaban en claro → CORREGIDO
// BUG #2: decryptData sobre nombre ya en claro → CORREGIDO (los datos de la lista
//         llegan por prop desde page.tsx ya desencriptados; la cuenta recién creada
//         se añade al estado con los valores en claro directamente)
// BUG #20: saldo inicial siempre mostraba 0.00 → CORREGIDO (mismo origen que #1)


import { X, Plus, Loader2, Trash2, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { getIcon, CUENTA_COLORS, CUENTA_ICON_OPTIONS } from "@/lib/icons"
import type { Cuenta } from "@/types"
import { encryptData } from "@/lib/crypto"
import { useState, useEffect, useRef } from "react"

const CUENTAS_ORDER_KEY = "gastos_cuentas_order_v1"

export default function CuentasModal({
  isOpen, onClose, cuentas, onCuentasChange,
}: {
  isOpen: boolean
  onClose: () => void
  cuentas: Cuenta[]
  onCuentasChange: (cuentas: Cuenta[]) => void
}) {
  const t = useTranslations()
  const [nombre, setNombre] = useState("")
  const [saldoInicial, setSaldoInicial] = useState("")
  const [icono, setIcono] = useState("Landmark")
  const [color, setColor] = useState(CUENTA_COLORS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [cuentaOrder, setCuentaOrder] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(CUENTAS_ORDER_KEY)
      return s ? JSON.parse(s) : []
    } catch { return [] }
  })
  const [draggingCuentaId, setDraggingCuentaId] = useState<string | null>(null)
  const [dragOverCuentaId, setDragOverCuentaId] = useState<string | null>(null)
  const dragCuentaIdRef = useRef<string | null>(null)
  const dragOverCuentaIdRef = useRef<string | null>(null)
  const isDraggingCuentaRef = useRef(false)
  const pointerCuentaStartRef = useRef<{ x: number; y: number } | null>(null)
  const [ghostCuentaPos, setGhostCuentaPos] = useState<{ x: number; y: number } | null>(null)
  const [ghostCuentaLabel, setGhostCuentaLabel] = useState<string>("")

  // Escape para cerrar
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleCreate = async () => {
    if (!nombre.trim()) return
    setIsSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsSaving(false); return }

    const nombreRaw = nombre.trim()
    const saldoRaw = parseFloat(saldoInicial) || 0

    // BUG #1 FIX: ahora sí ciframos antes de insertar en Supabase
    const nombreCifrado = await encryptData(nombreRaw)
    const saldoCifrado = await encryptData(saldoRaw)

    const { data, error } = await supabase
      .from("cuentas")
      .insert({
        user_id: user.id,
        nombre: nombreCifrado,   // ← cifrado
        icono,
        color,
        saldo_inicial: saldoCifrado,    // ← cifrado
      })
      .select()
      .single()

    if (error) {
      console.error("Error creando cuenta:", error.message)
    } else if (data) {
      // BUG #2 FIX: añadimos al estado local con valores EN CLARO,
      // no con los valores cifrados que devuelve Supabase.
      // Así la lista es consistente con el resto de cuentas (ya desencriptadas).
      const cuentaEnClaro: Cuenta = {
        ...data,
        nombre: nombreRaw,
        saldo_inicial: saldoRaw,
      }
      onCuentasChange([...cuentas, cuentaEnClaro])
      setNombre("")
      setSaldoInicial("")
      setIcono("Landmark")
      setColor(CUENTA_COLORS[0])
    }

    setIsSaving(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from("cuentas").delete().eq("id", id)
    if (!error) onCuentasChange(cuentas.filter(c => c.id !== id))
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  if (!isOpen) return null

  const iconKeyMap: Record<string, string> = {
    Landmark:   t("cuentas.iconBanco"),
    Wallet:     t("cuentas.iconEfectivo"),
    CreditCard: t("cuentas.iconTarjeta"),
    TrendingUp: t("cuentas.iconInversion"),
    Coins:      t("cuentas.iconMonedas"),
    Banknote:   t("cuentas.iconBilletes"),
    Building2:  t("cuentas.iconEntidad"),
    Package:    t("cuentas.iconOtro"),
  }

  return (
    <>
    {ghostCuentaPos && ghostCuentaLabel && (
      <div
        className="fixed z-[200] pointer-events-none select-none"
        style={{
          left: ghostCuentaPos.x - 20,
          top: ghostCuentaPos.y - 28,
          transform: "rotate(2deg) scale(1.05)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-emerald-500/60 bg-zinc-900 shadow-2xl shadow-black/60">
          <span className="text-sm font-medium text-zinc-100">{ghostCuentaLabel}</span>
          <span className="text-zinc-500 text-xs">⠿</span>
        </div>
      </div>
    )}
    <div
      className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cuentas-modal-title"
    >
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
      <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

      <div className="flex items-center justify-between mb-6">
          <h2 id="cuentas-modal-title" className="text-xl font-semibold text-zinc-100">{t("cuentas.title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("cuentas.ariaClose")}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Lista de cuentas existentes */}
        {/* BUG #2 FIX: los valores de 'c.nombre' y 'c.saldo_inicial' ya llegan
            en claro desde el prop (page.tsx los desencripta al cargar).
            No es necesario llamar a decryptData() aquí. */}
        {cuentas.length > 0 && (
          <div className="space-y-2 mb-6">
            {[...cuentas].sort((a, b) => {
              const ai = cuentaOrder.indexOf(a.id)
              const bi = cuentaOrder.indexOf(b.id)
              if (ai === -1 && bi === -1) return 0
              if (ai === -1) return 1
              if (bi === -1) return -1
              return ai - bi
            }).map(c => {
              const CIcon = getIcon(c.icono)
              const isConfirming = confirmDeleteId === c.id
              const isDraggingThis = draggingCuentaId === c.id
              const isOver = dragOverCuentaId === c.id && !isDraggingThis

              const DRAG_THRESHOLD = 8

              const handlePointerDown = (e: React.PointerEvent) => {
                if ((e.target as HTMLElement).closest("button")) return
                isDraggingCuentaRef.current = false
                dragCuentaIdRef.current = c.id
                pointerCuentaStartRef.current = { x: e.clientX, y: e.clientY }
              }

              const handlePointerMove = (e: React.PointerEvent) => {
                if (!dragCuentaIdRef.current || !pointerCuentaStartRef.current) return
                const dx = e.clientX - pointerCuentaStartRef.current.x
                const dy = e.clientY - pointerCuentaStartRef.current.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                if (!isDraggingCuentaRef.current) {
                  if (dist < DRAG_THRESHOLD) return
                  isDraggingCuentaRef.current = true
                  setDraggingCuentaId(dragCuentaIdRef.current)
                  setGhostCuentaLabel(c.nombre)
                  e.currentTarget.setPointerCapture(e.pointerId)
                }

                setGhostCuentaPos({ x: e.clientX, y: e.clientY })

                e.currentTarget.releasePointerCapture(e.pointerId)
                const el = document.elementFromPoint(e.clientX, e.clientY)
                const target = el?.closest("[data-cuenta-id]")
                const overId = target?.getAttribute("data-cuenta-id") ?? null
                if (overId && overId !== dragCuentaIdRef.current) {
                  dragOverCuentaIdRef.current = overId
                }
                e.currentTarget.setPointerCapture(e.pointerId)
              }

              const handlePointerUp = (e: React.PointerEvent) => {
                if (isDraggingCuentaRef.current) {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                  const el = document.elementFromPoint(e.clientX, e.clientY)
                  const target = el?.closest("[data-cuenta-id]")
                  const finalOverId = target?.getAttribute("data-cuenta-id") ?? dragOverCuentaIdRef.current
                  const from = dragCuentaIdRef.current
                  if (from && finalOverId && from !== finalOverId) {
                    setCuentaOrder(prev => {
                      const base = prev.length > 0 ? prev : cuentas.map(c => c.id)
                      const next = [...base]
                      const fromIdx = next.indexOf(from)
                      const toIdx = next.indexOf(finalOverId)
                      if (fromIdx === -1 || toIdx === -1) return prev
                      next.splice(fromIdx, 1)
                      next.splice(toIdx, 0, from)
                      try { localStorage.setItem(CUENTAS_ORDER_KEY, JSON.stringify(next)) } catch { }
                      return next
                    })
                  }
                }
                dragCuentaIdRef.current = null
                dragOverCuentaIdRef.current = null
                isDraggingCuentaRef.current = false
                pointerCuentaStartRef.current = null
                setDraggingCuentaId(null)
                setDragOverCuentaId(null)
                setGhostCuentaPos(null)
                setGhostCuentaLabel("")
              }

              return (
                <div
                  key={c.id}
                  data-cuenta-id={c.id}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`flex items-center gap-3 bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 py-3 select-none touch-none transition-all ${
                    isDraggingThis ? "opacity-40 cursor-grabbing" : "cursor-grab"
                  } ${isOver ? "border-emerald-500/50 bg-emerald-950/20" : ""}`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.color + "22" }}
                  >
                    <CIcon className="w-4 h-4" style={{ color: c.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{c.nombre}</p>
                    <p className="text-xs text-zinc-500">
                      {t("cuentas.saldoInicial", { amount: (c.saldo_inicial ?? 0).toFixed(2) })}
                    </p>
                  </div>
                  <span className="text-zinc-600 text-xs pointer-events-none mr-1">⠿</span>

                  {isConfirming ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
                      >
                        {t("cuentas.deleteCancel")}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        aria-label={t("cuentas.ariaDeleteConfirm", { name: c.nombre })}
                        className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-all flex items-center gap-1"
                      >
                        {deletingId === c.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : t("cuentas.deleteConfirm")
                        }
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      aria-label={t("cuentas.ariaDeleteAccount", { name: c.nombre })}
                      className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Formulario nueva cuenta */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("cuentas.sectionNew")}</p>

          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder={t("cuentas.placeholderNombre")}
            aria-label={t("cuentas.ariaLabelNombre")}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />

          <input
            type="number"
            inputMode="decimal"
            value={saldoInicial}
            onChange={e => setSaldoInicial(e.target.value)}
            placeholder={t("cuentas.placeholderSaldo")}
            aria-label={t("cuentas.ariaLabelSaldo")}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />

          <div>
            <p className="text-xs text-zinc-500 mb-2" id="icono-label">{t("cuentas.sectionIcono")}</p>
            <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="icono-label">
              {CUENTA_ICON_OPTIONS.map(opt => {
                const OIcon = getIcon(opt.name)
                const iconLabel = t(`cuentas.icon${opt.name.replace("Landmark","Banco").replace("Wallet","Efectivo").replace("CreditCard","Tarjeta").replace("TrendingUp","Inversion").replace("Coins","Monedas").replace("Banknote","Billetes").replace("Building2","Entidad").replace("Package","Otro")}` as Parameters<typeof t>[0])
                return (
                  <button
                    key={opt.name}
                    onClick={() => setIcono(opt.name)}
                    aria-label={`Icono ${iconKeyMap[opt.name] ?? opt.label}`}
                    aria-pressed={icono === opt.name}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${icono === opt.name
                      ? "border-emerald-500/50 bg-emerald-950/30"
                      : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                      }`}
                      >
                      <OIcon className="w-5 h-5 text-zinc-300" />
                      <span className="text-[10px] text-zinc-500">{iconKeyMap[opt.name] ?? opt.label}</span>
                    </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2" id="color-label">{t("cuentas.sectionColor")}</p>
            <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="color-label">
              {CUENTA_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isSaving || !nombre.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all"
          >
            {isSaving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />
            }
            {t("cuentas.createButton")}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}