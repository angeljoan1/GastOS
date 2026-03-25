"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2, Package, Edit2, Trash2, Search } from "lucide-react"

// Importamos el modal que creamos antes y su tipo Movimiento
import EditMovimientoModal, { Movimiento } from "@/components/modals/EditMovimientoModal"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Categoria = {
  id: string
  label: string
  emoji: string
  Icon: any
}

// Utilidad para pintar los iconos correctos
function getCatConfig(cat: string, allCats: Categoria[]) {
  return allCats.find((c) => c.id === cat) ?? { id: cat, emoji: "📦", label: cat, Icon: Package }
}

export default function HistorialTab({ categorias }: { categorias: Categoria[] }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null)
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  const fetchMovimientos = useCallback(async (pageIndex: number, search: string, categoryFilter: string, isNewSearch = false) => {
    if (isNewSearch) setIsSearching(true)

    let query = supabase.from("movimientos").select("*").order("created_at", { ascending: false })

    if (search.trim() !== "") {
      query = query.ilike('nota', `%${search}%`)
    }

    if (categoryFilter !== "") {
      query = query.eq('categoria', categoryFilter)
    }

    const from = pageIndex * 20
    const to = from + 19
    query = query.range(from, to)

    const { data } = await query

    if (data) {
      if (isNewSearch) setMovimientos(data)
      else setMovimientos((prev) => [...prev, ...data])
      setHasMore(data.length === 20)
    }

    setLoading(false)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      fetchMovimientos(0, searchTerm, selectedCategory, true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedCategory, fetchMovimientos])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovimientos(nextPage, searchTerm, selectedCategory, false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id); const { error } = await supabase.from("movimientos").delete().eq("id", id)
    setDeletingId(null); setConfirmarBorrado(null)
    if (!error) setMovimientos((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleUpdateMovimiento(updatedMov: Movimiento) {
    const notaFinal = updatedMov.nota?.trim() === "" ? null : updatedMov.nota?.trim();

    const { data, error } = await supabase
      .from("movimientos")
      .update({
        cantidad: updatedMov.cantidad,
        categoria: updatedMov.categoria,
        nota: notaFinal,
        is_recurring: updatedMov.is_recurring,
        created_at: updatedMov.created_at
      })
      .eq("id", updatedMov.id)
      .select();

    if (error) {
      alert("Error de la base de datos: " + error.message);
    } else if (!data || data.length === 0) {
      alert("❌ Supabase ha bloqueado la edición silenciosamente.");
    } else {
      setMovimientos((prev) =>
        prev.map((m) => (m.id === updatedMov.id ? { ...updatedMov, nota: notaFinal || undefined } : m))
      );
    }
  }

  function formatDate(iso: string) { return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) }

  if (loading && page === 0) return <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* HEADER DE BÚSQUEDA Y FILTRO */}
      <div className="flex gap-2 px-4 py-4 border-b border-zinc-800/60 bg-zinc-950">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en notas..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all w-1/3 max-w-[120px] truncate"
        >
          <option value="">Todas</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isSearching ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
        ) : movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3"><Package className="w-10 h-10 text-zinc-700" /><p className="text-sm text-zinc-600">No hay movimientos</p></div>
        ) : (
          <>
            {movimientos.map((m) => {
              const cat = getCatConfig(m.categoria, categorias); const isDeleting = deletingId === m.id
              return (
                <div key={m.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800/70 rounded-2xl px-4 py-3 transition-all duration-200" style={{ opacity: isDeleting ? 0.5 : 1 }}>
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-lg leading-none">{cat.emoji}</span>
                    {m.is_recurring && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{cat.label}</p>
                    {m.nota && <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.nota}</p>}
                    <p className="text-xs text-zinc-600 mt-0.5">{formatDate(m.created_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 tabular-nums flex-shrink-0">{m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <button onClick={() => setEditingMov(m)} disabled={isDeleting} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all flex-shrink-0"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmarBorrado(m.id)} disabled={isDeleting} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
                </div>
              )
            })}

            {hasMore && (
              <button onClick={loadMore} disabled={loading} className="w-full py-4 mt-4 text-sm font-medium text-zinc-400 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl transition-all flex justify-center items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar más antiguos"}
              </button>
            )}
          </>
        )}
      </div>

      {confirmarBorrado && (
        <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-zinc-100 font-semibold mb-2">¿Borrar gasto?</h3>
            <p className="text-zinc-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarBorrado(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all">Cancelar</button>
              <button onClick={() => handleDelete(confirmarBorrado)} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all">Borrar</button>
            </div>
          </div>
        </div>
      )}

      <EditMovimientoModal isOpen={!!editingMov} onClose={() => setEditingMov(null)} movimiento={editingMov} categorias={categorias} onSave={handleUpdateMovimiento} />
    </div>
  )
}