"use client"

import { useState, useEffect, useCallback } from "react"
import FeedbackWidget from '@/components/FeedbackWidget'
import { createClient } from "@supabase/supabase-js"
import {
  UtensilsCrossed,
  Beer,
  Bus,
  CalendarDays,
  Package,
  LogOut,
 
  Loader2,
  WalletCards,
  History,
  BarChart3,
  Settings,

  Menu,
  Download,
  Upload,
  Search,
} from "lucide-react"
import AuthScreen from '@/components/auth/AuthScreen'
import SettingsModal from '@/components/modals/SettingsModal'
import EditMovimientoModal from '@/components/modals/EditMovimientoModal'
import IngresoTab from '@/components/tabs/IngresoTab'
import HistorialTab from '@/components/tabs/HistorialTab'
import DashboardTab from '@/components/tabs/DashboardTab'

// ─── Supabase Client ────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const APP_VERSION = 2;

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
      {session?.user?.id && (
        <FeedbackWidget userId={session.user.id} />
      )}
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  // 1. TODOS LOS ESTADOS
  const [session, setSession] = useState<Session | null>(null); 
  const [loading, setLoading] = useState(true); 
  const [mounted, setMounted] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  // 2. TODOS LOS EFECTOS (HOOKS)
  useEffect(() => {
    async function checkVersion() {
      const { data } = await supabase.from('app_config').select('min_version').eq('id', 1).single()
      if (data && data.min_version > APP_VERSION) {
        setNeedsUpdate(true)
      }
    }
    checkVersion()
  }, [])

  useEffect(() => { setMounted(true) }, [])
  
  useEffect(() => {
    if (!mounted) return
    async function checkSession() { const { data } = await supabase.auth.getSession(); setSession(data.session); setLoading(false) }
    checkSession()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session) })
    return () => data.subscription.unsubscribe()
  }, [mounted])

  // 3. FUNCIONES
  const forceUpdate = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (let name of cacheNames) {
        await caches.delete(name)
      }
    }
    window.location.reload()
  }

  // 4. LOS RETURNS VISUALES (Siempre al final, ¡orden estricto!)
  
  // A. El Bloqueador Prioritario
  if (needsUpdate) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">Actualización Importante</h2>
        <p className="text-zinc-400 mb-8 max-w-sm">
          Hemos mejorado GastOS y añadido nuevas funciones de seguridad. Necesitas recargar la aplicación para continuar.
        </p>
        <button 
          onClick={forceUpdate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl w-full max-w-sm transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          Actualizar ahora
        </button>
      </div>
    )
  }

  // B. Pantalla de carga normal
  if (!mounted || loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
  }
  
  // C. La Aplicación Real
  return session ? <MainApp session={session} /> : <AuthScreen />
}