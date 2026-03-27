"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Loader2, Plus, Target } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getIcon, CATEGORIA_ICON_OPTIONS } from "@/lib/icons"
import type { Categoria, Presupuesto } from "@/types"

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

export default function SettingsModal({
  isOpen, onClose, categorias, onCategoriesChange,
  presupuestos, onPresupuestosChange,
  session, userId,
}: {
  isOpen:                 boolean
  onClose:                () => void
  categorias:             Categoria[]
  onCategoriesChange:     (cats: Categoria[]) => void
  presupuestos:           Presupuesto[]
  onPresupuestosChange:   (p: Presupuesto[]) => void
  session:                Session
  userId:                 string
}) {
  // ── Estado categorías ──────────────────────────────────────────────────────
  const [newCatName,  setNewCatName]  = useState("")
  const [newCatTipo,  setNewCatTipo]  = useState<"gasto" | "ingreso" | "ambos">("gasto")
  const [newCatIcono, setNewCatIcono] = useState("Package")
  const [savingCat,   setSavingCat]   = useState(false)
  const [deletingCat, setDeletingCat] = useState<string | null>(null)

  // ── Estado presupuestos ───────────────────────────────────────────────────
  const [editingPresupuesto, setEditingPresupuesto] = useState<string | null>(null) // categoria_id
  const [inputPresupuesto,   setInputPresupuesto]   = useState("")
  const [savingPres,         setSavingPres]         = useState(false)
  const [deletingPres,       setDeletingPres]       = useState<string | null>(null)

  // ── Tab activo dentro del modal ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"categorias" | "presupuestos">("categorias")

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setNewCatName(""); setNewCatIcono("Package"); setNewCatTipo("gasto")
      setError(null); setEditingPresupuesto(null); setInputPresupuesto("")
    }
  }, [isOpen])

  if (!isOpen) return null

  // ── Helpers presupuestos ──────────────────────────────────────────────────
  const getPresupuesto = (catId: string) => presupuestos.find(p => p.categoria_id === catId)

  // ── CRUD categorías ────────────────────────────────────────────────────────
  const handleAddCat = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true); setError(null)
    const { data, error } = await supabase.from("categorias")
      .insert({ user_id: userId, label: newCatName.trim(), icono: newCatIcono, tipo: newCatTipo, orden: categorias.length })
      .select().single()
    if (error) setError("Error al crear la categoría.")
    else if (data) { onCategoriesChange([...categorias, data]); setNewCatName(""); setNewCatIcono("Package") }
    setSavingCat(false)
  }

  const handleDeleteCat = async (id: string) => {
    setDeletingCat(id)
    const { error } = await supabase.from("categorias").delete().eq("id", id)
    if (error) setError("No se pudo borrar. Puede que haya movimientos asociados.")
    else onCategoriesChange(categorias.filter(c => c.id !== id))
    setDeletingCat(null)
  }

  // ── CRUD presupuestos ──────────────────────────────────────────────────────
  const handleSavePresupuesto = async (catId: string) => {
    const cantidad = parseFloat(inputPresupuesto)
    if (!cantidad || cantidad <= 0) return
    setSavingPres(true); setError(null)

    const existing = getPresupuesto(catId)
    if (existing) {
      // UPDATE
      const { data, error } = await supabase.from("presupuestos")
        .update({ cantidad }).eq("id", existing.id).select().single()
      if (error) setError("Error al actualizar el presupuesto.")
      else if (data) onPresupuestosChange(presupuestos.map(p => p.id === existing.id ? data : p))
    } else {
      // INSERT
      const { data, error } = await supabase.from("presupuestos")
        .insert({ user_id: userId, categoria_id: catId, cantidad }).select().single()
      if (error) setError("Error al crear el presupuesto.")
      else if (data) onPresupuestosChange([...presupuestos, data])
    }
    setSavingPres(false); setEditingPresupuesto(null); setInputPresupuesto("")
  }

  const handleDeletePresupuesto = async (presId: string) => {
    setDeletingPres(presId)
    const { error } = await supabase.from("presupuestos").delete().eq("id", presId)
    if (!error) onPresupuestosChange(presupuestos.filter(p => p.id !== presId))
    setDeletingPres(null)
  }

  const gastoCats = categorias.filter(c => c.tipo === "gasto" || c.tipo === "ambos")

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-zinc-100">Configuración</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-zinc-800 p-1 border border-zinc-700/60 mb-6">
          {([
            { id: "categorias",   label: "Categorías" },
            { id: "presupuestos", label: "Presupuestos" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === t.id ? "bg-zinc-600 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── TAB: Categorías ─────────────────────────────────────────────── */}
        {activeTab === "categorias" && (
          <div className="space-y-6">
            {(["gasto", "ingreso"] as const).map(tipo => {
              const cats = categorias.filter(c => c.tipo === tipo || c.tipo === "ambos")
              return (
                <div key={tipo}>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                    {tipo === "gasto" ? "Gastos" : "Ingresos"}
                  </p>
                  {cats.length === 0
                    ? <p className="text-xs text-zinc-700 px-1">Sin categorías</p>
                    : (
                      <div className="space-y-2">
                        {cats.map(cat => {
                          const CIcon      = getIcon(cat.icono)
                          const isDeleting = deletingCat === cat.id
                          return (
                            <div key={cat.id}
                              className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <CIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                <span className="text-sm text-zinc-200">{cat.label}</span>
                                {cat.tipo === "ambos" && (
                                  <span className="text-[10px] text-zinc-600 bg-zinc-700 px-1.5 py-0.5 rounded">ambos</span>
                                )}
                              </div>
                              <button onClick={() => handleDeleteCat(cat.id)} disabled={!!isDeleting}
                                className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                                {isDeleting
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />
                                }
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </div>
              )
            })}

            {/* Nueva categoría */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Nueva categoría</p>
              <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
                {(["gasto", "ingreso", "ambos"] as const).map(t => (
                  <button key={t} onClick={() => setNewCatTipo(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      newCatTipo === t ? "bg-zinc-600 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}>
                    {t === "gasto" ? "Gasto" : t === "ingreso" ? "Ingreso" : "Ambos"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nombre de la categoría"
                  onKeyDown={e => e.key === "Enter" && handleAddCat()}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                <button onClick={handleAddCat} disabled={savingCat || !newCatName.trim()}
                  className="px-3 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 transition-all">
                  {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-2">Icono</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {CATEGORIA_ICON_OPTIONS.map(name => {
                    const Ico = getIcon(name)
                    return (
                      <button key={name} onClick={() => setNewCatIcono(name)}
                        className={`aspect-square flex items-center justify-center rounded-lg border transition-all ${
                          newCatIcono === name ? "border-emerald-500/60 bg-emerald-950/30" : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                        }`}>
                        <Ico className="w-4 h-4 text-zinc-300" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Presupuestos ────────────────────────────────────────────── */}
        {activeTab === "presupuestos" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 mb-4">
              Asigna un límite mensual opcional a tus categorías de gasto. Recibirás una alerta visual cuando te acerques o lo superes.
            </p>

            {gastoCats.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">
                No tienes categorías de gasto aún.
              </p>
            ) : (
              gastoCats.map(cat => {
                const CIcon      = getIcon(cat.icono)
                const pres       = getPresupuesto(cat.id)
                const isEditing  = editingPresupuesto === cat.id
                const isDeleting = deletingPres === pres?.id

                return (
                  <div key={cat.id} className="bg-zinc-800 border border-zinc-700/60 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <CIcon className="w-4 h-4 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-200 flex-1">{cat.label}</p>
                      {pres && !isEditing && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            {pres.cantidad.toFixed(2)}€
                          </span>
                          <button onClick={() => { setEditingPresupuesto(cat.id); setInputPresupuesto(pres.cantidad.toString()) }}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">
                            Editar
                          </button>
                          <button onClick={() => handleDeletePresupuesto(pres.id)} disabled={isDeleting}
                            className="text-zinc-600 hover:text-red-400 transition-colors">
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      {!pres && !isEditing && (
                        <button onClick={() => { setEditingPresupuesto(cat.id); setInputPresupuesto("") }}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">
                          <Target className="w-3.5 h-3.5" />
                          Añadir límite
                        </button>
                      )}
                    </div>

                    {/* Formulario inline de edición */}
                    {isEditing && (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number" inputMode="decimal" value={inputPresupuesto}
                          onChange={e => setInputPresupuesto(e.target.value)}
                          placeholder="Límite mensual (€)"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") handleSavePresupuesto(cat.id); if (e.key === "Escape") setEditingPresupuesto(null) }}
                          className="flex-1 bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
                        <button onClick={() => handleSavePresupuesto(cat.id)} disabled={savingPres}
                          className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          {savingPres ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                        </button>
                        <button onClick={() => setEditingPresupuesto(null)}
                          className="px-3 py-2 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-6 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all">
          Cerrar
        </button>
      </div>
    </div>
  )
}