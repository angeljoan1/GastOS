"use client"

import { useState, useEffect } from "react"
import { X, Trash2, Loader2, Package } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

// Conexión independiente a Supabase para este componente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Definimos los tipos para que TypeScript esté contento
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

type Categoria = {
  id: string
  label: string
  emoji: string
  Icon: any
}

export default function SettingsModal({ isOpen, onClose, categorias, onCategoriesChange, session }: {
  isOpen: boolean; onClose: () => void; categorias: Categoria[]; onCategoriesChange: (cats: Categoria[]) => void; session: Session
}) {
  const [presupuesto, setPresupuesto] = useState<string>(() => session?.user?.user_metadata?.presupuesto?.toString() || "")
  const [newCatName, setNewCatName] = useState("")
  const [newCatEmoji, setNewCatEmoji] = useState("📌")
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
    if (newCatName.trim() && newCatEmoji.trim()) {
      const newCat = { id: newCatName.toLowerCase(), label: newCatName, emoji: newCatEmoji, Icon: Package }
      setEditingCats([...editingCats, newCat])
      setNewCatName(""); setNewCatEmoji("📌")
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
            <label className="block text-sm font-medium text-zinc-300 mb-3">Categorías Personalizadas</label>
            <div className="space-y-2 mb-3">
              {editingCats.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <span className="text-sm text-zinc-200">{cat.emoji} {cat.label}</span>
                  <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} className="w-14 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-2 text-xl text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" maxLength={2} title="Pon un emoji" />
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nueva categoría" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" onKeyPress={(e) => e.key === "Enter" && addCategory()} />
              <button onClick={addCategory} className="px-3 py-2 bg-emerald-500 text-zinc-950 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-all">Añadir</button>
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