"use client"

// components/modals/EditMovimientoModal.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #4: Al abrir el modal con un movimiento cuya categoría es texto libre
//         (importado vía CSV) el <select> no seleccionaba ninguna opción válida
//         y el usuario podía guardar sin categoría. Se añade opción de guardia
//         y se muestra el valor raw si no hay match con ninguna categoría.

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import type { Movimiento, Categoria, Cuenta } from "@/types"

export default function EditMovimientoModal({
  isOpen, onClose, movimiento, categorias, cuentas, onSave,
}: {
  isOpen: boolean
  onClose: () => void
  movimiento: Movimiento | null
  categorias: Categoria[]
  cuentas: Cuenta[]
  onSave: (updatedMov: Movimiento) => Promise<void>
}) {
  const [cantidad, setCantidad] = useState("")
  const [categoria, setCategoria] = useState("")
  const [nota, setNota] = useState("")
  const [fecha, setFecha] = useState("")
  const [cuentaId, setCuentaId] = useState<string>("")
  const [loading, setLoading] = useState(false)

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

  // Cerrar con Escape + foco al primer campo al abrir
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const handleSave = async () => {
    if (!movimiento || !cantidad || !fecha) return
    // BUG #4 FIX: no bloqueamos si categoria es texto libre (importado),
    // pero sí si está completamente vacía
    if (!categoria.trim()) return
    setLoading(true)
    try {
      const nuevaFecha = new Date(`${fecha}T12:00:00Z`).toISOString()
      await onSave({
        ...movimiento,
        cantidad: parseFloat(cantidad),
        categoria,
        nota,
        created_at: nuevaFecha,
        cuenta_id: cuentaId || null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !movimiento) return null

  const esTransfer = movimiento.tipo === "transferencia"

  // BUG #4 FIX: comprobamos si la categoría del movimiento existe en el catálogo
  const categoriaEnCatalogo = categorias.some(c => c.id === movimiento.categoria)

  // Filtramos categorías según el tipo del movimiento para el selector
  const categoriasFiltradas = esTransfer
    ? []
    : categorias.filter(c =>
      movimiento.tipo === "ingreso"
        ? c.tipo === "ingreso" || c.tipo === "ambos"
        : c.tipo === "gasto" || c.tipo === "ambos"
    )

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 id="edit-modal-title" className="text-xl font-semibold text-zinc-100">
            Editar {esTransfer ? "Transferencia" : movimiento.tipo === "ingreso" ? "Ingreso" : "Gasto"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de edición"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="edit-cantidad" className="block text-sm font-medium text-zinc-300 mb-2">
                Cantidad (€)
              </label>
              <input
                id="edit-cantidad"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="edit-fecha" className="block text-sm font-medium text-zinc-300 mb-2">
                Fecha
              </label>
              <input
                id="edit-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {!esTransfer && (
            <div>
              <label htmlFor="edit-categoria" className="block text-sm font-medium text-zinc-300 mb-2">
                Categoría
              </label>
              <select
                id="edit-categoria"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                {/* BUG #4 FIX: si el movimiento tiene una categoría que no existe
                    en el catálogo (texto libre de CSV), la mostramos como opción
                    seleccionada para no perder el dato */}
                {!categoriaEnCatalogo && movimiento.categoria && (
                  <option value={movimiento.categoria}>
                    {movimiento.categoria} (importada)
                  </option>
                )}

                {/* Opción vacía de guardia solo si la categoría actual es vacía */}
                {!categoria && (
                  <option value="" disabled>Selecciona una categoría</option>
                )}

                {categoriasFiltradas.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cuentas.length > 0 && (
            <div>
              <label htmlFor="edit-cuenta" className="block text-sm font-medium text-zinc-300 mb-2">
                Cuenta
              </label>
              <select
                id="edit-cuenta"
                value={cuentaId}
                onChange={e => setCuentaId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="">Sin cuenta asignada</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="edit-nota" className="block text-sm font-medium text-zinc-300 mb-2">
              Nota (opcional)
            </label>
            <textarea
              id="edit-nota"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Añade una descripción..."
              maxLength={80}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none h-20"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !cantidad || !categoria.trim() || !fecha}
            className="flex-1 py-3 text-sm bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}