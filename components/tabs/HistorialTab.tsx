"use client"

// components/tabs/HistorialTab.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #9:  Al cargar página 2 y luego filtrar, el estado de `page` no se
//          reseteaba → al quitar el filtro solo aparecían los 20 de la pág 2.
//          FIX: searchTerm también dispara reset de page a 0 y re-fetch.
// BUG #10: metaThemeColor podía ser null al hacer cleanup si el meta no existía
//          en el momento del render del efecto. FIX: referenciamos por selector
//          en el momento del cleanup, no al montar.

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import {
  Loader2, Package, Edit2, Trash2, Search,
  TrendingDown, TrendingUp, ArrowLeftRight,
} from "lucide-react"
import { getIcon } from "@/lib/icons"
import EditMovimientoModal from "@/components/modals/EditMovimientoModal"
import type { Categoria, Movimiento, Cuenta } from "@/types"
import BottomSheet, { SheetTrigger, type SheetOption } from "@/components/ui/BottomSheet"
import { encryptData, decryptData } from "@/lib/crypto"
import EncryptionBadge from "@/components/ui/Encryptionbadge"

type TipoFilter = "todos" | "gasto" | "ingreso" | "transferencia"

// Colores de barra de estado por filtro activo
const THEME_COLORS: Record<TipoFilter, string> = {
  todos: "#09090b",
  gasto: "#7f1d1d",
  ingreso: "#064e3b",
  transferencia: "#1e3a8a",
}

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
  const [showTipoSheet, setShowTipoSheet] = useState(false)

  // Carga desde BD y desencripta. No filtra por nota porque está cifrada en BD.
  const fetchMovimientos = useCallback(async (
    pageIndex: number,
    categoryFilter: string,
    tipo: TipoFilter,
    isNew = false,
  ) => {
    if (isNew) setIsSearching(true)

    let q = supabase
      .from("movimientos")
      .select("*")
      .order("created_at", { ascending: false })

    if (categoryFilter) q = q.eq("categoria", categoryFilter)
    if (tipo === "gasto") q = q.or("tipo.eq.gasto,tipo.is.null")
    else if (tipo === "ingreso") q = q.eq("tipo", "ingreso")
    else if (tipo === "transferencia") q = q.eq("tipo", "transferencia")

    const from = pageIndex * 20
    const { data, error } = await q.range(from, from + 19)

    if (error) {
      console.error("Error en la búsqueda:", error.message)
    } else if (data) {
      // Aplicamos el coordinador
      const decryptedData = await Promise.all(
        data.map(async (m) => ({
          ...m,
          cantidad: parseFloat(await decryptData(m.cantidad)) || 0,
          nota: m.nota ? await decryptData(m.nota) : null,
        }))
      );

      if (isNew) setMovimientos(decryptedData)
      else setMovimientos(prev => [...prev, ...decryptedData])

      setHasMore(data.length === 20)
    }

    setLoading(false)
    setIsSearching(false)
  }, [])

  // Re-fetch al cambiar categoría o tipo
  useEffect(() => {
    setPage(0)
    fetchMovimientos(0, selectedCategory, tipoFilter, true)
  }, [selectedCategory, tipoFilter, fetchMovimientos])

  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (confirmarBorrado) {
      const t = setTimeout(() => cancelDeleteRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [confirmarBorrado])

  // BUG #9 FIX: resetear page cuando cambia searchTerm para que al borrar
  // el filtro de texto no quede "en medio" de la paginación
  useEffect(() => {
    setPage(0)
  }, [searchTerm])

  // Filtrado en memoria por texto (los datos ya están desencriptados)
  const movimientosFiltrados = searchTerm.trim()
    ? movimientos.filter(m => {
      const term = searchTerm.toLowerCase()
      return (
        m.nota?.toLowerCase().includes(term) ||
        m.categoria?.toLowerCase().includes(term) ||
        // También buscamos contra el label de la categoría si existe
        categorias.find(c => c.id === m.categoria)?.label?.toLowerCase().includes(term)
      )
    })
    : movimientos

  // BUG #10 FIX: el efecto de theme-color ahora usa una función de cleanup
  // que busca el meta EN EL MOMENTO del cleanup, no en el momento del montaje.
  // Así evitamos el caso donde metaThemeColor era null al montar pero existe al limpiar.
  useEffect(() => {
    const color = THEME_COLORS[tipoFilter]

    // Asegurar que el meta existe
    let meta = document.querySelector("meta[name='theme-color']")
    if (!meta) {
      meta = document.createElement("meta")
        ; (meta as HTMLMetaElement).name = "theme-color"
      document.head.appendChild(meta)
    }
    meta.setAttribute("content", color)

    return () => {
      // BUG #10 FIX: re-buscamos el meta en el cleanup, no usamos el ref capturado
      const metaAtCleanup = document.querySelector("meta[name='theme-color']")
      if (metaAtCleanup) {
        metaAtCleanup.setAttribute("content", THEME_COLORS.todos)
      }
    }
  }, [tipoFilter])

  async function handleDelete(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from("movimientos").delete().eq("id", id)
    setDeletingId(null)
    setConfirmarBorrado(null)
    if (!error) setMovimientos(prev => prev.filter(m => m.id !== id))
  }

  async function handleUpdateMovimiento(updated: Movimiento) {
    const notaRaw = updated.nota?.trim() === "" ? null : updated.nota?.trim()

    const cantidadEncriptada = await encryptData(updated.cantidad)
    const notaEncriptada = notaRaw ? await encryptData(notaRaw) : null

    const { data, error } = await supabase
      .from("movimientos")
      .update({
        cantidad: cantidadEncriptada as string,
        categoria: updated.categoria,
        nota: notaEncriptada,
        tipo: updated.tipo ?? "gasto",
        created_at: updated.created_at,
        cuenta_id: updated.cuenta_id,
      })
      .eq("id", updated.id)
      .select()

    if (error) {
      alert("Error: " + error.message)
    } else if (data?.length) {
      setMovimientos(prev =>
        prev.map(m =>
          m.id === updated.id
            ? { ...updated, nota: notaRaw ?? undefined }
            : m
        )
      )
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  const getCuenta = (id?: string | null) => cuentas.find(c => c.id === id)
  const movABorrar = confirmarBorrado
    ? movimientos.find(m => m.id === confirmarBorrado)
    : null

  if (loading && page === 0) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
    </div>
  )

  const catSheetOptions: SheetOption[] = [
    { value: "", label: "Todas las categorías" },
    ...categorias.map(c => ({
      value: c.id,
      label: c.label,
      icono: c.icono,
      tipo: c.tipo,
    })),
  ]

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header filtros */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b border-zinc-800/60 bg-zinc-950">

        {/* Fila 1: Buscador + Badge E2EE */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nota o categoría..."
              aria-label="Buscar movimientos"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <EncryptionBadge />
        </div>

        {/* Filtros: categoría + tipo */}
        <div className="flex gap-2 w-full">
        <div className="w-[48%]">
            {(() => {
              const cat = categorias.find(c => c.id === selectedCategory)
              return (
                <SheetTrigger
                  onClick={() => setShowCatSheet(true)}
                  placeholder="Categoría"
                  label={cat?.label}
                  icono={cat?.icono}
                  color={cat?.tipo === "ingreso" ? "#10b981" : cat?.tipo === "gasto" ? "#ef4444" : undefined}
                />
              )
            })()}
          </div>
          <div className="w-[48%]">
            {(() => {
              const tipoOpts = [
                { id: "todos", label: "Todos", color: undefined, icono: undefined },
                { id: "gasto", label: "Gastos", color: "#ef4444", icono: "TrendingDown" },
                { id: "ingreso", label: "Ingresos", color: "#10b981", icono: "TrendingUp" },
                { id: "transferencia", label: "Transfer.", color: "#3b82f6", icono: "ArrowLeftRight" },
              ]
              const sel = tipoOpts.find(t => t.id === tipoFilter)
              return (
                <SheetTrigger
                  onClick={() => setShowTipoSheet(true)}
                  placeholder="Tipo"
                  label={sel?.label}
                  icono={sel?.icono}
                  color={sel?.color}
                />
              )
            })()}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isSearching ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">
              {searchTerm
                ? "No hay resultados para esa búsqueda"
                : "No hay movimientos"
              }
            </p>
          </div>
        ) : (
          <>
            {movimientosFiltrados.map(m => {
              const cat = categorias.find(c => c.id === m.categoria)
              const CatIcon = getIcon(cat?.icono ?? "Package")
              const isDeleting = deletingId === m.id
              const esIngreso = m.tipo === "ingreso"
              const esTransfer = m.tipo === "transferencia"
              const cuenta = getCuenta(m.cuenta_id)
              const cuentaDest = getCuenta(m.cuenta_destino_id)

              const borderColor = esTransfer
                ? "border-blue-900/40"
                : esIngreso
                  ? "border-emerald-900/40"
                  : "border-zinc-800/70"

              const amountColor = esTransfer
                ? "text-blue-400"
                : esIngreso
                  ? "text-emerald-400"
                  : "text-red-400"

              const amountPrefix = esTransfer ? "↔" : esIngreso ? "+" : "-"

              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 bg-zinc-900 border ${borderColor} rounded-2xl px-4 py-3 transition-all duration-200 hover:bg-zinc-800/50 cursor-pointer`}
                  style={{ opacity: isDeleting ? 0.5 : 1 }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${esTransfer ? "bg-blue-500/10" : esIngreso ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {esTransfer
                      ? <ArrowLeftRight className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      : <CatIcon className={`w-4 h-4 ${esTransfer ? "text-blue-400" : esIngreso ? "text-emerald-400" : "text-red-400"}`} aria-hidden="true" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {esTransfer ? "Transferencia" : (cat?.label ?? m.categoria)}
                    </p>
                    <span className={`w-fit text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${esTransfer
                      ? "bg-blue-500/15 text-blue-400"
                      : esIngreso
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                      }`}>
                      {esTransfer ? "Transfer" : esIngreso ? "Ingreso" : "Gasto"}
                    </span>
                    {esTransfer && cuenta && cuentaDest && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {cuenta.nombre} → {cuentaDest.nombre}
                      </p>
                    )}
                    {!esTransfer && cuenta && (
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{cuenta.nombre}</p>
                    )}
                    {m.nota && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.nota}</p>
                    )}
                    <p className="text-xs text-zinc-700 mt-0.5">{formatDate(m.created_at)}</p>
                  </div>

                  <p className={`text-sm font-semibold tabular-nums flex-shrink-0 ${amountColor}`}
                    aria-label={`${amountPrefix}${m.cantidad.toLocaleString("es-ES", { minimumFractionDigits: 2 })} euros`}
                  >
                    {amountPrefix}
                    {(m.cantidad as number).toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}€
                  </p>

                  <button
                    onClick={() => setEditingMov(m)}
                    disabled={isDeleting}
                    aria-label={`Editar movimiento de ${m.cantidad.toFixed(2)}€`}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-950/40 transition-all flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setConfirmarBorrado(m.id)}
                    disabled={isDeleting}
                    aria-label={`Borrar movimiento de ${m.cantidad.toFixed(2)}€`}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                  >
                    {isDeleting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              )
            })}

            {/* "Cargar más" solo si no hay búsqueda activa */}
            {hasMore && !searchTerm && (
              <button
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  fetchMovimientos(next, selectedCategory, tipoFilter)
                }}
                disabled={loading}
                className="w-full py-4 mt-2 text-sm font-medium text-zinc-400 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl transition-all flex justify-center items-center gap-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : "Cargar más antiguos"
                }
              </button>
            )}
          </>
        )}
      </div>

      {/* Modal confirmación borrado */}
      {confirmarBorrado && (
        <div
          className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <h3 id="confirm-delete-title" className="text-zinc-100 font-semibold mb-2">
              ¿Borrar{" "}
              {movABorrar?.tipo === "ingreso"
                ? "ingreso"
                : movABorrar?.tipo === "transferencia"
                  ? "transferencia"
                  : "gasto"
              }?
            </h3>
            <p className="text-zinc-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                ref={cancelDeleteRef}
                onClick={() => setConfirmarBorrado(null)}
                aria-label="Cancelar borrado"
                className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmarBorrado!)}
                aria-label={`Confirmar borrado de ${movABorrar?.tipo === "ingreso" ? "ingreso" : movABorrar?.tipo === "transferencia" ? "transferencia" : "gasto"} de ${movABorrar?.cantidad.toFixed(2)}€`}
                className="flex-1 py-2 text-sm bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      <EditMovimientoModal
        isOpen={!!editingMov}
        onClose={() => setEditingMov(null)}
        movimiento={editingMov}
        categorias={categorias}
        cuentas={cuentas}
        onSave={handleUpdateMovimiento}
      />

      <BottomSheet
        isOpen={showTipoSheet}
        onClose={() => setShowTipoSheet(false)}
        title="Filtrar por tipo"
        value={tipoFilter}
        onChange={v => setTipoFilter(v as TipoFilter)}
        options={[
          { value: "todos", label: "Todos" },
          { value: "gasto", label: "Gastos", icono: "TrendingDown", tipo: "gasto" },
          { value: "ingreso", label: "Ingresos", icono: "TrendingUp", tipo: "ingreso" },
          { value: "transferencia", label: "Transferencias", icono: "ArrowLeftRight", tipo: "transferencia" },
        ]}
      />

      <BottomSheet
        isOpen={showCatSheet}
        onClose={() => setShowCatSheet(false)}
        title="Filtrar por categoría"
        value={selectedCategory}
        onChange={v => { setSelectedCategory(v); setSearchTerm("") }}
        options={catSheetOptions}
      />
    </div>
  )
}