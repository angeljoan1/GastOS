"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  Delete,
  UtensilsCrossed,
  Beer,
  Bus,
  CalendarDays,
  Package,
  Trash2,
  LogOut,
  CheckCircle2,
  Loader2,
  WalletCards,
  History,
  BarChart3,
  Settings,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Download,
  Upload,
  Search,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

// ─── Supabase Client ────────────────────────────────────────────────────────
const supabaseUrl = "https://hwvkfobocmzvlezjviqy.supabase.co"
const supabaseKey = "sb_publishable_s1ISa8PMnxviz21ADMtyqA_tSSdcuyA"
const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Types ───────────────────────────────────────────────────────────────────
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

interface Movimiento {
  id: string
  created_at: string
  cantidad: number
  categoria: string
  nota?: string
  is_recurring?: boolean
}

// ─── Haptics Utility ───────────────────────────────────────────────────────────
function triggerHaptic() {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50)
  }
}

// ─── Category Config ─────────────────────────────────────────────────────────
const DEFAULT_CATEGORIAS = [
  { id: "Comida", label: "Comida", emoji: "🍔", Icon: UtensilsCrossed },
  { id: "Ocio", label: "Ocio", emoji: "🍻", Icon: Beer },
  { id: "Transporte", label: "Transporte", emoji: "🚌", Icon: Bus },
  { id: "Suscripciones", label: "Suscripciones", emoji: "📅", Icon: CalendarDays },
  { id: "Otros", label: "Otros", emoji: "📦", Icon: Package },
]

function getCatConfig(cat: string, allCats: typeof DEFAULT_CATEGORIAS) {
  return allCats.find((c) => c.id === cat) ?? { emoji: "📦", label: cat, Icon: Package }
}


// ─── Auth Screen ─────────────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError("Credenciales incorrectas. Inténtalo de nuevo.")
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess("Registro exitoso. Revisa tu correo para confirmar tu cuenta.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
            <WalletCards className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">GastOS</h1>
          <p className="text-sm text-zinc-500 mt-1">Registro de gastos personal</p>
        </div>

        <div className="flex rounded-xl bg-zinc-900 p-1 mb-6 border border-zinc-800">
          <button onClick={() => { setIsLogin(true); setError(null); setSuccess(null) }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isLogin ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            Iniciar Sesión
          </button>
          <button onClick={() => { setIsLogin(false); setError(null); setSuccess(null) }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${!isLogin ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Correo electrónico</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
          </div>
          {error && <div className="bg-red-950/50 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
          {success && <div className="bg-emerald-950/50 border border-emerald-900/50 rounded-xl px-4 py-3 text-sm text-emerald-400">{success}</div>}
          <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-3 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} {isLogin ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ isOpen, onClose, categorias, onCategoriesChange, session }: {
  isOpen: boolean; onClose: () => void; categorias: typeof DEFAULT_CATEGORIAS; onCategoriesChange: (cats: typeof DEFAULT_CATEGORIAS) => void; session: Session
}) {
  const [presupuesto, setPresupuesto] = useState<string>(() => session?.user?.user_metadata?.presupuesto?.toString() || "")
  const [newCatName, setNewCatName] = useState("")
  const [newCatEmoji, setNewCatEmoji] = useState("📌")
  const [editingCats, setEditingCats] = useState(categorias)
  const [isSaving, setIsSaving] = useState(false) // Nuevo estado de carga

  useEffect(() => {
    if (isOpen) {
      setEditingCats(categorias)
      setPresupuesto(session?.user?.user_metadata?.presupuesto?.toString() || "")
    }
  }, [isOpen, categorias, session])

  const handleSave = async () => {
    setIsSaving(true)
    // GUARDAMOS EN SUPABASE (EN LA NUBE)
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

// ─── Edit Movimiento Modal ────────────────────────────────────────────────────
function EditMovimientoModal({ isOpen, onClose, movimiento, categorias, onSave }: {
  isOpen: boolean; onClose: () => void; movimiento: Movimiento | null; categorias: typeof DEFAULT_CATEGORIAS; onSave: (updatedMov: Movimiento) => Promise<void>
}) {
  const [cantidad, setCantidad] = useState(""); const [categoria, setCategoria] = useState("")
  const [nota, setNota] = useState(""); const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (movimiento) { setCantidad(movimiento.cantidad.toString()); setCategoria(movimiento.categoria); setNota(movimiento.nota || "") }
  }, [movimiento])

  const handleSave = async () => {
    if (!movimiento || !cantidad || !categoria) return
    setLoading(true)
    try {
      await onSave({ ...movimiento, cantidad: parseFloat(cantidad), categoria, nota })
      onClose()
    } finally { setLoading(false) }
  }

  if (!isOpen || !movimiento) return null

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Editar Gasto</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Cantidad (€)</label>
            <input type="number" step="0.01" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all">
              {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Nota (opcional)</label>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Añade una descripción..." maxLength={80} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none h-20" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-3 text-sm bg-emerald-500 text-zinc-950 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ingreso Tab ──────────────────────────────────────────────────────────────
function IngresoTab({ categorias }: { categorias: typeof DEFAULT_CATEGORIAS }) {
  const [display, setDisplay] = useState("0"); const [nota, setNota] = useState(""); const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)

  // Nuevos estados para el modal de suscripción
  const [showRecurModal, setShowRecurModal] = useState(false)
  const [pendingCat, setPendingCat] = useState<string | null>(null)

  function handleDigit(d: string) {
    triggerHaptic(); setError(null)
    setDisplay((prev) => {
      if (prev.length >= 8) return prev
      if (d === "." && prev.includes(".")) return prev
      if (prev === "0" && d !== ".") return d
      return prev + d
    })
  }

  function handleBackspace() {
    triggerHaptic(); setError(null)
    setDisplay((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)))
  }

  // Interceptamos el clic antes de guardar
  function onCategoryClick(catId: string) {
    if (catId === "Suscripciones" || catId === "suscripciones") {
      setPendingCat(catId)
      setShowRecurModal(true) // Abre la pregunta
    } else {
      handleCategoria(catId, false) // Guarda normal
    }
  }

  async function handleCategoria(cat: string, isRecurring: boolean) {
    triggerHaptic(); setShowRecurModal(false);
    const cantidad = parseFloat(display)
    if (!cantidad || cantidad <= 0) return setError("Introduce una cantidad mayor que 0.")
    setLoading(true); setError(null)

    // Guardamos en Supabase incluyendo si es recurrente
    const { error } = await supabase.from("movimientos").insert({
      cantidad,
      categoria: cat,
      nota: nota || null,
      is_recurring: isRecurring
    })

    setLoading(false)
    if (error) setError("Error al guardar.")
    else { setSuccess(true); setDisplay("0"); setNota(""); setTimeout(() => setSuccess(false), 1800) }
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"]

  return (
    <div className="flex flex-col h-full relative animate-in fade-in slide-in-from-bottom-8 duration-500">
      {success && (
        <div className="absolute inset-0 z-20 bg-zinc-950/95 flex flex-col items-center justify-center gap-3 rounded-t-xl animate-in fade-in duration-300">
          <CheckCircle2 className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
          <p className="text-emerald-400 font-semibold text-lg">¡Guardado!</p>
        </div>
      )}

      {/* Modal de Suscripción Recurrente */}
      {showRecurModal && (
        <div className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
            <CalendarDays className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-zinc-100 font-semibold mb-2">¿Es un pago mensual?</h3>
            <p className="text-zinc-500 text-sm mb-6">Podemos marcarlo como suscripción para llevar un mejor control.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleCategoria(pendingCat!, true)} className="w-full py-3 text-sm bg-emerald-500 text-zinc-950 rounded-xl font-bold hover:bg-emerald-400 transition-all">
                Sí, se repite cada mes
              </button>
              <button onClick={() => handleCategoria(pendingCat!, false)} className="w-full py-3 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all">
                No, es solo un pago puntual
              </button>
              <button onClick={() => setShowRecurModal(false)} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-end justify-end px-6 pt-8 pb-4 border-b border-zinc-800/60">
        {error && <p className="text-xs text-red-400 mb-2 self-start">{error}</p>}
        <div className="flex items-baseline gap-2">
          <span className="text-zinc-500 text-3xl font-light">€</span>
          <span className="text-zinc-100 text-6xl font-light tracking-tight leading-none tabular-nums">{display}</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button key={k} onClick={() => handleDigit(k)} disabled={loading} className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-100 text-xl font-light active:bg-zinc-800 transition-colors select-none">{k}</button>
          ))}
          <button onClick={handleBackspace} disabled={loading} className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-400 active:bg-zinc-800 transition-colors flex items-center justify-center select-none">
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-2 px-1">Nota opcional</p>
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={80} placeholder="Ej: Cena con Juan" className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
        </div>

        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3 px-1">Categoría</p>
          <div className="grid grid-cols-3 gap-3 mb-3 px-1">
            {categorias.map((cat) => (
              <CategoryButton
                key={cat.id}
                cat={cat}
                onPress={onCategoryClick}
                loading={loading || display === "0" || display === "0."}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryButton({
  cat,
  onPress,
  loading,
}: {
  cat: (typeof DEFAULT_CATEGORIAS)[0]
  onPress: (id: string) => void
  loading: boolean
}) {
  return (
    <button
      onClick={() => onPress(cat.id)}
      disabled={loading}
      className="h-20 w-full rounded-2xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 select-none shadow-sm p-2"
    >
      <span className="text-2xl leading-none">{cat.emoji}</span>
      <span className="text-[13px] font-bold text-center leading-tight break-words">
        {cat.label}
      </span>
    </button>
  )
}

// ─── Historial Tab ────────────────────────────────────────────────────────────
function HistorialTab({ categorias }: { categorias: typeof DEFAULT_CATEGORIAS }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null)
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("") // NUEVO ESTADO: Dropdown
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // NUEVO FETCH: Filtra notas por texto y categorías por el dropdown
  const fetchMovimientos = useCallback(async (pageIndex: number, search: string, categoryFilter: string, isNewSearch = false) => {
    if (isNewSearch) setIsSearching(true)

    let query = supabase.from("movimientos").select("*").order("created_at", { ascending: false })

    if (search.trim() !== "") {
      query = query.ilike('nota', `%${search}%`) // Solo busca en la nota
    }

    if (categoryFilter !== "") {
      query = query.eq('categoria', categoryFilter) // Filtrado exacto por categoría
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
    // 1. Limpiamos la nota. Si está en blanco, le pasamos 'null' a la base de datos.
    const notaFinal = updatedMov.nota?.trim() === "" ? null : updatedMov.nota?.trim();

    // 2. Enviamos los datos actualizados a Supabase
    const { error } = await supabase
      .from("movimientos")
      .update({
        cantidad: updatedMov.cantidad,
        categoria: updatedMov.categoria,
        nota: notaFinal,
        is_recurring: updatedMov.is_recurring
      })
      .eq("id", updatedMov.id);

    // 3. Si hay error, avisamos. Si no, actualizamos la lista visual.
    if (error) {
      alert("Error al actualizar el gasto: " + error.message);
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

        {/* NUEVO DROPDOWN DE CATEGORÍAS */}
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

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#64748b"]

function DashboardTab({ categorias, session }: { categorias: typeof DEFAULT_CATEGORIAS; session: Session }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // AHORA LEEMOS EL PRESUPUESTO DE LA NUBE (METADATOS DEL USUARIO)
  const presupuesto = session?.user?.user_metadata?.presupuesto || null

  useEffect(() => {
    async function fetchMovimientos() {
      const { data } = await supabase.from("movimientos").select("*").order("created_at", { ascending: false })
      setMovimientos(data ?? []); setLoading(false)
    }
    fetchMovimientos()
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>

  const selectedMonth = selectedDate.getMonth(); const selectedYear = selectedDate.getFullYear()
  const monthMovimientos = movimientos.filter((m) => { const d = new Date(m.created_at); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
  const totalThisMonth = monthMovimientos.reduce((acc, m) => acc + m.cantidad, 0)
  const percentUsed = presupuesto ? (totalThisMonth / presupuesto) * 100 : 0

  const categoryTotals = monthMovimientos.reduce((acc, m) => { acc[m.categoria] = (acc[m.categoria] || 0) + m.cantidad; return acc }, {} as Record<string, number>)
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))

  const last6Months: { month: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(selectedYear, selectedMonth - i, 1); const monthNum = date.getMonth(); const year = date.getFullYear()
    const monthTotal = movimientos.filter((m) => { const d = new Date(m.created_at); return d.getMonth() === monthNum && d.getFullYear() === year }).reduce((acc, m) => acc + m.cantidad, 0)
    last6Months.push({ month: date.toLocaleDateString("es-ES", { month: "short" }).charAt(0).toUpperCase() + date.toLocaleDateString("es-ES", { month: "short" }).slice(1), total: Math.round(monthTotal * 100) / 100 })
  }

  const handlePrevMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth - 1, 1))
  const handleNextMonth = () => setSelectedDate(new Date(selectedYear, selectedMonth + 1, 1))
  const monthLabel = selectedDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={handlePrevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-sm font-medium text-zinc-300 capitalize flex-1 text-center">{monthLabel}</p>
        <button onClick={handleNextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Gasto Total</p>
          <p className="text-4xl font-light text-zinc-100 tabular-nums">
            {totalThisMonth.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-zinc-500 text-2xl ml-1">€</span>
          </p>
        </div>
        {presupuesto && (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><p className="text-xs text-zinc-500">Presupuesto: {presupuesto.toFixed(2)}€</p><p className="text-xs text-zinc-500">{Math.round(percentUsed)}%</p></div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div className={`h-full transition-all duration-300 ${percentUsed > 100 ? "bg-red-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Distribución por Categoría</p>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2"><Package className="w-8 h-8 text-zinc-700" /><p className="text-sm text-zinc-600">Sin gastos este mes</p></div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#f4f4f5" }}
                  formatter={(value: any, name: any) => {
                    const cat = getCatConfig(name, categorias);
                    return [`${Number(value).toFixed(2)}€`, cat.label];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {pieData.map((entry, index) => {
                const cat = getCatConfig(entry.name, categorias)
                return (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="text-xs text-zinc-300 font-medium">{cat.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Últimos 6 Meses</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }} itemStyle={{ color: "#f4f4f5" }} formatter={(value: any) => [`${Number(value).toFixed(2)}€`, "Total"]} />
            <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<"ingreso" | "historial" | "dashboard">("ingreso")
  const [showSettings, setShowSettings] = useState(false)

  // INICIALIZAMOS CON LAS CATEGORIAS DE LA NUBE (O LAS POR DEFECTO)
  const [categorias, setCategorias] = useState<typeof DEFAULT_CATEGORIAS>(
    session?.user?.user_metadata?.categorias_custom || DEFAULT_CATEGORIAS
  )
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Si la sesión se actualiza (ej: al guardar ajustes), actualizamos las categorías en pantalla
  useEffect(() => {
    if (session?.user?.user_metadata?.categorias_custom) {
      setCategorias(session?.user?.user_metadata.categorias_custom)
    }
  }, [session])

  const handleCategoriesChange = (cats: typeof DEFAULT_CATEGORIAS) => { setCategorias(cats) }
  async function handleLogout() { await supabase.auth.signOut() }

  const handleExportCSV = async () => {
    const { data } = await supabase.from("movimientos").select("*").order("created_at", { ascending: false });
    if (!data || data.length === 0) return alert("No hay gastos para exportar");
    const headers = ["ID", "Fecha", "Categoria", "Cantidad", "Nota"];
    const rows = data.map(m => [m.id, new Date(m.created_at).toLocaleString(), m.categoria, m.cantidad, m.nota || ""]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "mis_gastos.csv"; link.click();
    setIsMenuOpen(false);
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
      {/* Cierra el menú si haces clic fuera */}
      {isMenuOpen && <div className="absolute inset-0 z-40" onClick={() => setIsMenuOpen(false)} />}

      <header className="border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-5 py-4 flex items-center justify-between relative z-50">
        <h1 className="text-lg font-semibold text-zinc-100">GastOS</h1>

        {/* El nuevo botón de menú hamburguesa */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-zinc-900 transition-all text-zinc-400 hover:text-zinc-200">
          <Menu className="w-6 h-6" />
        </button>

        {/* El menú desplegable */}
        {isMenuOpen && (
          <div className="absolute top-16 right-4 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col p-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <button onClick={() => { setShowSettings(true); setIsMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Settings className="w-4 h-4" /> Ajustes
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Download className="w-4 h-4" /> Exportar a CSV
            </button>
            <label className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" /> Importar CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { alert("Función de importación próximamente..."); setIsMenuOpen(false); }} />
            </label>
            <div className="h-px bg-zinc-800 my-1 mx-2" />
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-left">
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === "ingreso" && <IngresoTab categorias={categorias} />}
        {tab === "historial" && <HistorialTab categorias={categorias} />}
        {tab === "dashboard" && <DashboardTab categorias={categorias} session={session} />}
      </main>

      <nav className="border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-end justify-around relative">
          <button onClick={() => setTab("ingreso")} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${tab === "ingreso" ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"}`}><WalletCards className="w-5 h-5" /><span className="text-[11px] font-medium">Ingreso</span>{tab === "ingreso" && <span className="absolute bottom-0 block w-8 h-0.5 bg-emerald-400 rounded-full" />}</button>
          <button onClick={() => setTab("historial")} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${tab === "historial" ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"}`}><History className="w-5 h-5" /><span className="text-[11px] font-medium">Historial</span>{tab === "historial" && <span className="absolute bottom-0 block w-8 h-0.5 bg-emerald-400 rounded-full" />}</button>
          <button onClick={() => setTab("dashboard")} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${tab === "dashboard" ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"}`}><BarChart3 className="w-5 h-5" /><span className="text-[11px] font-medium">Dashboard</span>{tab === "dashboard" && <span className="absolute bottom-0 block w-8 h-0.5 bg-emerald-400 rounded-full" />}</button>
        </div>
      </nav>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} categorias={categorias} onCategoriesChange={handleCategoriesChange} session={session} />
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    async function checkSession() { const { data } = await supabase.auth.getSession(); setSession(data.session); setLoading(false) }
    checkSession()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session) })
    return () => data.subscription.unsubscribe()
  }, [mounted])
  if (!mounted || loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
  return session ? <MainApp session={session} /> : <AuthScreen />
}