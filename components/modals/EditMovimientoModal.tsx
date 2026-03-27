"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import type { Movimiento, Categoria, Cuenta } from "@/types"

export default function EditMovimientoModal({ isOpen, onClose, movimiento, categorias, cuentas, onSave }: {
  isOpen: boolean; onClose: () => void; movimiento: Movimiento | null
  categorias: Categoria[]; cuentas: Cuenta[]
  onSave: (updatedMov: Movimiento) => Promise<void>
}) {
  const [cantidad,  setCantidad]  = useState("")
  const [categoria, setCategoria] = useState("")
  const [nota,      setNota]      = useState("")
  const [fecha,     setFecha]     = useState("")
  const [cuentaId,  setCuentaId]  = useState<string>("")
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (movimiento) {
      setCantidad(movimiento.cantidad.toString())
      setCategoria(movimiento.categoria)
      setNota(movimiento.nota || "")
      setCuentaId(movimiento.cuenta_id || "")
      const d = new Date(movimiento.created_at)
      setFecha(d.toISOString().split("T")[0])
    }
  }, [movimiento])

  const handleSave = async () => {
    if (!movimiento || !cantidad || !categoria || !fecha) return
    setLoading(true)
    try {
      const nuevaFecha = new Date(`${fecha}T12:00:00Z`).toISOString()
      await onSave({ ...movimiento, cantidad: parseFloat(cantidad), categoria, nota, created_at: nuevaFecha, cuenta_id: cuentaId || null })
      onClose()
    } finally { setLoading(false) }
  }

  if (!isOpen || !movimiento) return null

  const esTransfer = movimiento.tipo === "transferencia"

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            Editar {esTransfer ? "Transferencia" : movimiento.tipo === "ingreso" ? "Ingreso" : "Gasto"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Cantidad (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={cantidad} onChange={e => setCantidad(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]" />
            </div>
          </div>

          {!esTransfer && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all">
                {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
              </select>
            </div>
          )}

          {cuentas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Cuenta</label>
              <select value={cuentaId} onChange={e => setCuentaId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all">
                <option value="">Sin cuenta asignada</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Nota (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Añade una descripción..." maxLength={80}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none h-20" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 text-sm bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}