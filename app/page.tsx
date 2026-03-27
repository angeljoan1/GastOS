"use client"

import { useState, useEffect, useRef } from "react"
import FeedbackWidget   from "@/components/FeedbackWidget"
import ImportCSVModal   from "@/components/modals/ImportCSVModal"
import {
  LogOut, Loader2, WalletCards, History,
  BarChart3, Settings, Menu, Download, Upload, Landmark,
} from "lucide-react"
import AuthScreen    from "@/components/auth/AuthScreen"
import SettingsModal from "@/components/modals/SettingsModal"
import CuentasModal  from "@/components/modals/CuentasModal"
import IngresoTab    from "@/components/tabs/IngresoTab"
import HistorialTab  from "@/components/tabs/HistorialTab"
import DashboardTab  from "@/components/tabs/DashboardTab"
import type { Categoria, Cuenta, Presupuesto } from "@/types"
import { supabase } from "@/lib/supabase"

const APP_VERSION = 0

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

// Categorías por defecto — solo para seed inicial de usuarios nuevos
const SEED_CATEGORIAS: Omit<Categoria, "id" | "user_id" | "created_at">[] = [
  { label: "Comida",         icono: "UtensilsCrossed",  tipo: "gasto",   orden: 0 },
  { label: "Transporte",     icono: "Bus",              tipo: "gasto",   orden: 1 },
  { label: "Suscripciones",  icono: "CalendarDays",     tipo: "gasto",   orden: 2 },
  { label: "Otros",          icono: "Package",          tipo: "ambos",   orden: 3 },
  { label: "Nómina",         icono: "Briefcase",        tipo: "ingreso", orden: 4 },
  { label: "Freelance",      icono: "Laptop",           tipo: "ingreso", orden: 5 },
  { label: "Ahorro",         icono: "PiggyBank",        tipo: "ingreso", orden: 6 },
  { label: "Rendimiento",    icono: "Repeat2",          tipo: "ingreso", orden: 7 },
  { label: "Otros ingresos", icono: "CircleDollarSign", tipo: "ingreso", orden: 8 },
]

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp({ session }: { session: Session }) {
  const [tab,           setTab]           = useState<"ingreso" | "historial" | "dashboard">("ingreso")
  const [showSettings,  setShowSettings]  = useState(false)
  const [showCuentas,   setShowCuentas]   = useState(false)
  const [showImport,    setShowImport]    = useState(false)
  const [isMenuOpen,    setIsMenuOpen]    = useState(false)
  const [categorias,    setCategorias]    = useState<Categoria[]>([])
  const [cuentas,       setCuentas]       = useState<Cuenta[]>([])
  const [presupuestos,  setPresupuestos]  = useState<Presupuesto[]>([])
  const [catsLoading,   setCatsLoading]   = useState(true)

  // ── Categorías: fetch + seed automático ───────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    async function cargarCategorias() {
      const { data } = await supabase
        .from("categorias").select("*").order("orden", { ascending: true })

      if (data && data.length > 0) {
        setCategorias(data)
      } else {
        const userId    = session!.user.id
        const legacy    = session?.user?.user_metadata?.categorias_custom
        const toInsert  = legacy?.every((c: any) => c.icono && c.label && c.tipo)
          ? legacy.map((c: any, i: number) => ({ user_id: userId, label: c.label, icono: c.icono, tipo: c.tipo, orden: i }))
          : SEED_CATEGORIAS.map(c => ({ ...c, user_id: userId }))
        const { data: inserted } = await supabase.from("categorias").insert(toInsert).select()
        if (inserted) setCategorias(inserted)
      }
      setCatsLoading(false)
    }
    cargarCategorias()
  }, [session?.user?.id])

  // ── Cuentas ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("cuentas").select("*").order("created_at")
      .then(({ data }) => { if (data) setCuentas(data) })
  }, [])

  // ── Presupuestos ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("presupuestos").select("*")
      .then(({ data }) => { if (data) setPresupuestos(data) })
  }, [])

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const { data } = await supabase
      .from("movimientos").select("*").order("created_at", { ascending: false })
    if (!data || data.length === 0) return alert("No hay movimientos para exportar")
    const headers = ["ID", "Fecha", "Tipo", "Categoria", "Cantidad", "Nota", "Cuenta"]
    const rows    = data.map(m => [
      m.id,
      new Date(m.created_at).toLocaleString("es-ES"),
      m.tipo ?? "gasto",
      m.categoria,
      m.cantidad,
      (m.nota || "").replace(/,/g, ";"), // escapar comas en notas
      m.cuenta_id || "",
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }))
    const a   = document.createElement("a"); a.href = url; a.download = "gastos_export.csv"; a.click()
    setIsMenuOpen(false)
  }

  if (catsLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  )

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden relative">
      {isMenuOpen && <div className="absolute inset-0 z-40" onClick={() => setIsMenuOpen(false)} />}

      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-5 py-4 flex items-center justify-between relative z-50">
        <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">GastOS</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-zinc-900 transition-all text-zinc-400 hover:text-zinc-200">
          <Menu className="w-6 h-6" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-16 right-4 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col p-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <button onClick={() => { setShowCuentas(true); setIsMenuOpen(false) }}
              className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Landmark className="w-4 h-4" /> Mis Cuentas
            </button>
            <button onClick={() => { setShowSettings(true); setIsMenuOpen(false) }}
              className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Settings className="w-4 h-4" /> Ajustes
            </button>
            <button onClick={handleExportCSV}
              className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button onClick={() => { setShowImport(true); setIsMenuOpen(false) }}
              className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-left">
              <Upload className="w-4 h-4" /> Importar CSV
            </button>
            <div className="h-px bg-zinc-800 my-1 mx-2" />
            <button onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-left">
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === "ingreso"   && <IngresoTab   categorias={categorias} cuentas={cuentas} />}
        {tab === "historial" && <HistorialTab  categorias={categorias} cuentas={cuentas} />}
        {tab === "dashboard" && (
          <DashboardTab
            categorias={categorias}
            cuentas={cuentas}
            presupuestos={presupuestos}
          />
        )}
      </main>

      {/* Nav */}
      <nav className="border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-end justify-around">
          {([
            { id: "ingreso",   Icon: WalletCards, label: "Registrar" },
            { id: "historial", Icon: History,     label: "Historial" },
            { id: "dashboard", Icon: BarChart3,   label: "Dashboard" },
          ] as const).map(({ id, Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 relative ${
                tab === id ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
              }`}>
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{label}</span>
              {tab === id && <span className="absolute bottom-0 block w-8 h-0.5 bg-emerald-400 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>

      <SettingsModal
        isOpen={showSettings} onClose={() => setShowSettings(false)}
        categorias={categorias} onCategoriesChange={setCategorias}
        presupuestos={presupuestos} onPresupuestosChange={setPresupuestos}
        session={session} userId={session!.user.id} />

      <CuentasModal
        isOpen={showCuentas} onClose={() => setShowCuentas(false)}
        cuentas={cuentas} onCuentasChange={setCuentas} />

      <ImportCSVModal
        isOpen={showImport} onClose={() => setShowImport(false)}
        categorias={categorias} cuentas={cuentas} />

      {session?.user?.id && <FeedbackWidget userId={session.user.id} />}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,     setSession]     = useState<Session | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [mounted,     setMounted]     = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  useEffect(() => {
    supabase.from("app_config").select("min_version").eq("id", 1).single()
      .then(({ data }) => { if (data && data.min_version > APP_VERSION) setNeedsUpdate(true) })
  }, [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [mounted])

  const forceUpdate = async () => {
    try {
      // 1. Limpiar caché de la aplicación (Cache Storage)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
  
      // 2. Desregistrar Service Workers (el culpable habitual en móviles)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
  
      // 3. Forzar recarga omitiendo la caché del navegador
      // Añadimos un timestamp a la URL para que el servidor crea que es una página nueva
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.href = url.toString();
      
    } catch (error) {
      console.error("Fallo al forzar actualización:", error);
      // Fallback por si falla lo anterior
      window.location.reload();
    }
  };

  if (needsUpdate) return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">Actualización Importante</h2>
      <p className="text-zinc-400 mb-8 max-w-sm">Hemos mejorado GastOS. Necesitas recargar para continuar.</p>
      <button onClick={forceUpdate}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl w-full max-w-sm transition-all">
        Actualizar ahora
      </button>
    </div>
  )

  if (!mounted || loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  )

  return session ? <MainApp session={session} /> : <AuthScreen />
}