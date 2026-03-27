"use client"

import { useState } from "react"
import { X, Plus, Loader2, Trash2, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getIcon, CUENTA_COLORS, CUENTA_ICON_OPTIONS } from "@/lib/icons"
import type { Cuenta } from "@/types"

export default function CuentasModal({
  isOpen, onClose, cuentas, onCuentasChange,
}: {
  isOpen: boolean
  onClose: () => void
  cuentas: Cuenta[]
  onCuentasChange: (cuentas: Cuenta[]) => void
}) {
  const [nombre, setNombre]           = useState("")
  const [saldoInicial, setSaldoInicial] = useState("")
  const [icono, setIcono]             = useState("Landmark")
  const [color, setColor]             = useState(CUENTA_COLORS[0])
  const [isSaving, setIsSaving]       = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

const handleCreate = async () => {
  if (!nombre.trim()) return
  setIsSaving(true)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { setIsSaving(false); return }

  const { data, error } = await supabase
    .from("cuentas")
    .insert({
      user_id: user.id,
      nombre: nombre.trim(),
      icono,
      color,
      saldo_inicial: parseFloat(saldoInicial) || 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creando cuenta:", error.message)
  } else if (data) {
    onCuentasChange([...cuentas, data])
    setNombre(""); setSaldoInicial(""); setIcono("Landmark"); setColor(CUENTA_COLORS[0])
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

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Mis Cuentas</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Lista */}
        {cuentas.length > 0 && (
          <div className="space-y-2 mb-6">
            {cuentas.map(c => {
              const CIcon = getIcon(c.icono)
              const isConfirming = confirmDeleteId === c.id
              return (
                <div key={c.id} className="flex items-center gap-3 bg-zinc-800 border border-zinc-700/60 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.color + "22" }}>
                    <CIcon className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{c.nombre}</p>
                    <p className="text-xs text-zinc-500">Saldo inicial: {c.saldo_inicial.toFixed(2)}€</p>
                  </div>
                  {isConfirming ? (
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-zinc-500 hover:text-zinc-300 px-2">Cancelar</button>
                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                        className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-all flex items-center gap-1">
                        {deletingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Borrar"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(c.id)}
                      className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
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
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Nueva cuenta</p>

          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: BBVA, Efectivo, Revolut..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />

          <input type="number" inputMode="decimal" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)}
            placeholder="Saldo inicial (€)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />

          <div>
            <p className="text-xs text-zinc-500 mb-2">Icono</p>
            <div className="grid grid-cols-4 gap-2">
              {CUENTA_ICON_OPTIONS.map(opt => {
                const OIcon = getIcon(opt.name)
                return (
                  <button key={opt.name} onClick={() => setIcono(opt.name)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                      icono === opt.name ? "border-emerald-500/50 bg-emerald-950/30" : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                    }`}>
                    <OIcon className="w-5 h-5 text-zinc-300" />
                    <span className="text-[10px] text-zinc-500">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {CUENTA_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: c }}>
                  {color === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} disabled={isSaving || !nombre.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  )
}