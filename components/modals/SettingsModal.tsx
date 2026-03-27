"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Loader2, UtensilsCrossed, Briefcase, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Categoria, Movimiento } from "@/types"

// Definimos los tipos para que TypeScript esté contento
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

export default function SettingsModal({ isOpen, onClose, categorias, onCategoriesChange, session }: {
  isOpen: boolean; onClose: () => void; categorias: Categoria[]; onCategoriesChange: (cats: Categoria[]) => void; session: Session
}) {
  const [presupuesto, setPresupuesto] = useState<string>(() => session?.user?.user_metadata?.presupuesto?.toString() || "")
  const [newCatName, setNewCatName] = useState("")
  const [newCatTipo, setNewCatTipo] = useState<'gasto' | 'ingreso' | 'ambos'>('gasto')
  const [editingCats, setEditingCats] = useState<Categoria[]>(categorias)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEditingCats(categorias)
      setPresupuesto(session?.user?.user_metadata?.presupuesto?.toString() || "")
    }
  }, [isOpen, categorias, session])

  const handleSave = async () => {
    setIsSaving(true)
    await supabase.auth.updateUser({
      data: {
        categorias_custom: editingCats,
        presupuesto: presupuesto ? parseFloat(presupuesto) : null
      }
    })
    onCategoriesChange(editingCats)
    setIsSaving(false)
    onClose()
  }

  const addCategory = () => {
    if (newCatName.trim()) {
      const newCat: Categoria = {
        id: newCatName.toLowerCase().replace(/\s+/g, '_'),
        label: newCatName.trim(),
        Icon: newCatTipo === 'ingreso' ? Briefcase : UtensilsCrossed,
        tipo: newCatTipo,
      }
      setEditingCats([...editingCats, newCat])
      setNewCatName("")
    }
  }

  const removeCategory = (id: string) => {
    setEditingCats(editingCats.filter((c) => c.id !== id))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Configuración</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Presupuesto Mensual (€)</label>
            <input type="number" inputMode="decimal" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="Ej: 1000" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-300 mb-3">Categorías</p>

            {/* Gastos */}
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Gastos</p>
            <div className="space-y-2 mb-4">
              {editingCats.filter(c => c.tipo === 'gasto' || c.tipo === 'ambos').map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200">{cat.label}</span>
                  </div>
                  <button onClick={() => removeCategory(cat.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            {/* Ingresos */}
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Ingresos</p>
            <div className="space-y-2 mb-4">
              {editingCats.filter(c => c.tipo === 'ingreso').map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200">{cat.label}</span>
                  </div>
                  <button onClick={() => removeCategory(cat.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            {/* Formulario nueva categoría */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-widest pt-1">Nueva categoría</p>
              <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700">
                {(['gasto', 'ingreso', 'ambos'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewCatTipo(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${newCatTipo === t ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {t === 'gasto' ? 'Gasto' : t === 'ingreso' ? 'Ingreso' : 'Ambos'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nombre de la categoría"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <button onClick={addCategory} className="px-3 py-2 bg-emerald-500 text-zinc-950 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all disabled:opacity-50">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 flex justify-center items-center gap-2 py-3 text-sm bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}