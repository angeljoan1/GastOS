"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Package, Edit2, Trash2, Search, TrendingDown, TrendingUp } from "lucide-react"
import EditMovimientoModal from "@/components/modals/EditMovimientoModal"
import type { Categoria, Movimiento } from "@/types"


type TipoFilter = "todos" | "gasto" | "ingreso"

function getCatConfig(cat: string, allCats: Categoria[]) {
  return allCats.find((c) => c.id === cat) ?? { id: cat, label: cat, Icon: Package, tipo: 'ambos' as const }
}

export default function HistorialTab({ categorias }: { categorias: Categoria[] }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null)
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos") // ← NUEVO
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // ── Fetch con filtro de tipo ────────────────────────────────────────────────
  const fetchMovimientos = useCallback(async (
    pageIndex: number,
    search: string,
    categoryFilter: string,
    tipo: TipoFilter,
    isNewSearch = false
  ) => {
    if (isNewSearch) setIsSearching(true)

    let query = supabase.from("movimientos").select("*").order("created_at", { ascending: false })

    if (search.trim() !== "") {
      query = query.ilike("nota", `%${search}%`)
    }
    if (categoryFilter !== "") {
      query = query.eq("categoria", categoryFilter)
    }
    // Filtro de tipo: si es "todos" no aplicamos nada
    // Fallback defensivo: registros sin 'tipo' se asumen 'gasto'
    if (tipo === "gasto") {
      query = query.or("tipo.eq.gasto,tipo.is.null")
    } else if (tipo === "ingreso") {
      query = query.eq("tipo", "ingreso")
    }

    const from = pageIndex * 20
    query = query.range(from, from + 19)

    const { data } = await query

    if (data) {
      if (isNewSearch) setMovimientos(data)
      else setMovimientos((prev) => [...prev, ...data])
      setHasMore(data.length === 20)
    }

    setLoading(false)
    setIsSearching(false)
  }, [])

  // Re-fetch cuando cambia cualquier filtro
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      fetchMovimientos(0, searchTerm, selectedCategory, tipoFilter, true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedCategory, tipoFilter, fetchMovimientos])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMovimientos(nextPage, searchTerm, selectedCategory, tipoFilter, false)
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from("movimientos").delete().eq("id", id)
    setDeletingId(null)
    setConfirmarBorrado(null)
    if (!error) setMovimientos((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleUpdateMovimiento(updatedMov: Movimiento) {
    const notaFinal = updatedMov.nota?.trim() === "" ? null : updatedMov.nota?.trim()

    const { data, error } = await supabase
      .from("movimientos")
      .update({
        cantidad: updatedMov.cantidad,
        categoria: updatedMov.categoria,
        nota: notaFinal,
        is_recurring: updatedMov.is_recurring,
        tipo: updatedMov.tipo ?? "gasto", // ← incluimos tipo para no perderlo
        created_at: updatedMov.created_at,
      })
      .eq("id", updatedMov.id)
      .select()

    if (error) {
      alert("Error de la base de datos: " + error.message)
    } else if (!data || data.length === 0) {
      alert("❌ Supabase ha bloqueado la edición silenciosamente.")
    } else {
      setMovimientos((prev) =>
        prev.map((m) => (m.id === updatedMov.id ? { ...updatedMov, nota: notaFinal || undefined } : m))
      )
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  }

  // Movimiento que se va a borrar (para el texto del modal)
  const movABorrar = confirmarBorrado
    ? movimientos.find((m) => m.id === confirmarBorrado)
    : null

  if (loading && page === 0) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* ── Header: búsqueda + categoría ────────────────────────────────── */}
      <div className="flex gap-2 px-4 pt-4 pb-3 border-b border-zinc-800/60 bg-zinc-950 flex-col">
        <div className="flex gap-2">
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
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* ── Toggle Todos / Gastos / Ingresos ──────────────────────────── */}
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          {(["todos", "gasto", "ingreso"] as TipoFilter[]).map((t) => {
            const active = tipoFilter === t
            const label = t === "todos" ? "Todos" : t === "gasto" ? "Gastos" : "Ingresos"
            const activeClass =
              t === "todos"
                ? "bg-zinc-700 text-zinc-100"
                : t === "gasto"
                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            return (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  active ? activeClass : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t === "gasto" && <TrendingDown className="w-3 h-3" />}
                {t === "ingreso" && <TrendingUp className="w-3 h-3" />}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isSearching ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-600">No hay movimientos</p>
          </div>
        ) : (
          <>
            {movimientos.map((m) => {
              const cat = getCatConfig(m.categoria, categorias)
              const isDeleting = deletingId === m.id
              const esIngreso = m.tipo === "ingreso"

              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 bg-zinc-900 border rounded-2xl px-4 py-3 transition-all duration-200 ${
                    esIngreso ? "border-emerald-900/40" : "border-zinc-800/70"
                  }`}
                  style={{ opacity: isDeleting ? 0.5 : 1 }}
                >
                  {/* Icono con badge de recurrente */}
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 relative">
                    {m.is_recurring && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    )}
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-zinc-200 truncate">{cat.label}</p>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        esIngreso
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}>
                        {esIngreso ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                    {m.nota && <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.nota}</p>}
                    <p className="text-xs text-zinc-600 mt-0.5">{formatDate(m.created_at)}</p>
                  </div>

                  {/* Importe con color según tipo */}
                  <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                    esIngreso ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {esIngreso ? "+" : "-"}
                    {m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </p>

                  {/* Acciones */}
                  <button
                    onClick={() => setEditingMov(m)}
                    disabled={isDeleting}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmarBorrado(m.id)}
                    disabled={isDeleting}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-4 mt-4 text-sm font-medium text-zinc-400 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar más antiguos"}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Modal confirmación borrado ────────────────────────────────────── */}
      {confirmarBorrado && (
        <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-zinc-100 font-semibold mb-2">
              ¿Borrar {movABorrar?.tipo === "ingreso" ? "ingreso" : "gasto"}?
            </h3>
            <p className="text-zinc-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarBorrado(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all">Cancelar</button>
              <button onClick={() => handleDelete(confirmarBorrado)} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all">Borrar</button>
            </div>
          </div>
        </div>
      )}

      <EditMovimientoModal
        isOpen={!!editingMov}
        onClose={() => setEditingMov(null)}
        movimiento={editingMov}
        categorias={categorias}
        onSave={handleUpdateMovimiento}
      />
    </div>
  )
}
