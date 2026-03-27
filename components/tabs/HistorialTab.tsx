"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Loader2, Package, Edit2, Trash2, Search, TrendingDown, TrendingUp, ArrowLeftRight } from "lucide-react"
import { getIcon } from "@/lib/icons"
import EditMovimientoModal from "@/components/modals/EditMovimientoModal"
import type { Categoria, Movimiento, Cuenta } from "@/types"
import BottomSheet, { SheetTrigger, type SheetOption } from "@/components/ui/BottomSheet"

type TipoFilter = "todos" | "gasto" | "ingreso" | "transferencia"

export default function HistorialTab({
  categorias, cuentas,
}: {
  categorias: Categoria[]
  cuentas: Cuenta[]
}) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null)
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [showCatSheet, setShowCatSheet] = useState(false)

  const fetchMovimientos = useCallback(async (
    pageIndex: number, search: string, categoryFilter: string, tipo: TipoFilter, isNew = false
  ) => {
    if (isNew) setIsSearching(true)
    let q = supabase.from("movimientos").select("*").order("created_at", { ascending: false })
    
    // Solo busca coincidencias en la columna "nota"
    if (search.trim()) {
      q = q.ilike("nota", `%${search.trim()}%`)
    }
    
    if (categoryFilter) q = q.eq("categoria", categoryFilter)
    if (tipo === "gasto") q = q.or("tipo.eq.gasto,tipo.is.null")
    else if (tipo === "ingreso") q = q.eq("tipo", "ingreso")
    else if (tipo === "transferencia") q = q.eq("tipo", "transferencia")
    
    const from = pageIndex * 20
    const { data, error } = await q.range(from, from + 19)
    
    if (error) {
      console.error("Error en la búsqueda:", error.message)
    } else if (data) {
      if (isNew) setMovimientos(data); else setMovimientos(prev => [...prev, ...data])
      setHasMore(data.length === 20)
    }
    setLoading(false); setIsSearching(false)
  }, [])

  // useEffect para la búsqueda
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); fetchMovimientos(0, searchTerm, selectedCategory, tipoFilter, true) }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, selectedCategory, tipoFilter, fetchMovimientos])

  // NUEVO: useEffect para cambiar el color de la barra de estado del móvil
  useEffect(() => {
    const colores = {
      todos: "#09090b",         // bg-zinc-950
      gasto: "#7f1d1d",         // bg-red-900
      ingreso: "#064e3b",       // bg-emerald-900
      transferencia: "#1e3a8a", // bg-blue-900
    };

    const colorElegido = colores[tipoFilter];
    
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", colorElegido);
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = colorElegido;
      document.head.appendChild(meta);
    }

    return () => {
      if (metaThemeColor) metaThemeColor.setAttribute("content", "#09090b");
    };
  }, [tipoFilter]);

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from("movimientos").delete().eq("id", id)
    setDeletingId(null); setConfirmarBorrado(null)
    if (!error) setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  async function handleUpdateMovimiento(updated: Movimiento) {
    const nota = updated.nota?.trim() === "" ? null : updated.nota?.trim()
    const { data, error } = await supabase.from("movimientos")
      .update({ cantidad: updated.cantidad, categoria: updated.categoria, nota, tipo: updated.tipo ?? "gasto", created_at: updated.created_at, cuenta_id: updated.cuenta_id })
      .eq("id", updated.id).select()
    if (error) alert("Error: " + error.message)
    else if (data?.length) setMovimientos(prev => prev.map(m => m.id === updated.id ? { ...updated, nota: nota ?? undefined } : m))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  }

  const getCuenta = (id?: string | null) => cuentas.find(c => c.id === id)
  const movABorrar = confirmarBorrado ? movimientos.find(m => m.id === confirmarBorrado) : null

  if (loading && page === 0) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* Header filtros */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-zinc-800/60 bg-zinc-950">

        {/* Fila 1: Buscador a todo el ancho */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nota..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all" />
        </div>

        {/* Fila 2: Categoría y Tipos */}
        <div className="flex gap-2 w-full">
          <div className="w-[110px] flex-shrink-0">
            {(() => {
              const cat = categorias.find(c => c.id === selectedCategory)
              return (
                <SheetTrigger onClick={() => setShowCatSheet(true)}
                  placeholder="Todas"
                  label={cat?.label}
                  icono={cat?.icono} />
              )
            })()}
          </div>

          <div className="flex flex-1 rounded-xl bg-zinc-900 p-1 border border-zinc-800 overflow-x-auto">
            {([
              { id: "todos", label: "Todos", activeClass: "bg-zinc-700 text-zinc-100", Icon: undefined },
              { id: "gasto", label: "Gastos", activeClass: "bg-red-500/15 text-red-400 border border-red-500/30", Icon: TrendingDown },
              { id: "ingreso", label: "Ingresos", activeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", Icon: TrendingUp },
              { id: "transferencia", label: "Transfer.", activeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30", Icon: ArrowLeftRight },
            ] as const satisfies { id: TipoFilter; label: string; activeClass: string; Icon: any }[]).map(({ id, label, activeClass, Icon }) => (
              <button key={id} onClick={() => setTipoFilter(id)}
                className={`flex-1 flex items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${tipoFilter === id ? activeClass : "text-zinc-600 hover:text-zinc-400"
                  }`}>
                {Icon && <Icon className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isSearching ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
        ) : movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-600">No hay movimientos</p>
          </div>
        ) : (
          <>
            {movimientos.map(m => {
              const cat = categorias.find(c => c.id === m.categoria)
              const CatIcon = getIcon(cat?.icono ?? "Package")
              const isDeleting = deletingId === m.id
              const esIngreso = m.tipo === "ingreso"
              const esTransfer = m.tipo === "transferencia"
              const cuenta = getCuenta(m.cuenta_id)
              const cuentaDest = getCuenta(m.cuenta_destino_id)

              const borderColor = esTransfer ? "border-blue-900/40" : esIngreso ? "border-emerald-900/40" : "border-zinc-800/70"
              const amountColor = esTransfer ? "text-blue-400" : esIngreso ? "text-emerald-400" : "text-red-400"
              const amountPrefix = esTransfer ? "↔" : esIngreso ? "+" : "-"

              return (
                <div key={m.id}
                  className={`flex items-center gap-3 bg-zinc-900 border ${borderColor} rounded-2xl px-4 py-3 transition-all duration-200`}
                  style={{ opacity: isDeleting ? 0.5 : 1 }}>

                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {esTransfer
                      ? <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                      : <CatIcon className="w-4 h-4 text-zinc-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {esTransfer ? "Transferencia" : (cat?.label ?? m.categoria)}
                    </p>
                    <span className={`w-fit text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${esTransfer ? "bg-blue-500/15 text-blue-400"
                      : esIngreso ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                      }`}>
                      {esTransfer ? "Transfer" : esIngreso ? "Ingreso" : "Gasto"}
                    </span>
                    {esTransfer && cuenta && cuentaDest && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{cuenta.nombre} → {cuentaDest.nombre}</p>
                    )}
                    {!esTransfer && cuenta && (
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{cuenta.nombre}</p>
                    )}
                    {m.nota && <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.nota}</p>}
                    <p className="text-xs text-zinc-700 mt-0.5">{formatDate(m.created_at)}</p>
                  </div>

                  <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${amountColor}`}>
                    {amountPrefix}{m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </p>

                  <button onClick={() => setEditingMov(m)} disabled={isDeleting}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all flex-shrink-0">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmarBorrado(m.id)} disabled={isDeleting}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0">
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )
            })}

            {hasMore && (
              <button onClick={() => { const next = page + 1; setPage(next); fetchMovimientos(next, searchTerm, selectedCategory, tipoFilter) }}
                disabled={loading}
                className="w-full py-4 mt-2 text-sm font-medium text-zinc-400 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl transition-all flex justify-center items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar más antiguos"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal confirmación borrado */}
      {confirmarBorrado && (
        <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-zinc-100 font-semibold mb-2">
              ¿Borrar {movABorrar?.tipo === "ingreso" ? "ingreso" : movABorrar?.tipo === "transferencia" ? "transferencia" : "gasto"}?
            </h3>
            <p className="text-zinc-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarBorrado(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all">Cancelar</button>
              <button onClick={() => handleDelete(confirmarBorrado!)} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all">Borrar</button>
            </div>
          </div>
        </div>
      )}

      <EditMovimientoModal
        isOpen={!!editingMov} onClose={() => setEditingMov(null)}
        movimiento={editingMov} categorias={categorias}
        cuentas={cuentas} onSave={handleUpdateMovimiento} />

      <BottomSheet
        isOpen={showCatSheet} onClose={() => setShowCatSheet(false)}
        title="Filtrar por categoría" value={selectedCategory}
        onChange={setSelectedCategory}
        options={[
          { value: "", label: "Todas las categorías" },
          ...categorias.map(c => ({ value: c.id, label: c.label, icono: c.icono, tipo: c.tipo }))
        ]}
      />
    </div>
  )
}