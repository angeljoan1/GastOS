"use client"

// app/page.tsx
// Versión limpia tras extraer PinPadScreen a components/auth/PinPadScreen.tsx

import { useState, useEffect, useCallback, useRef } from "react"
import FeedbackWidget from "@/components/FeedbackWidget"
import ImportCSVModal from "@/components/modals/ImportCSVModal"
import {
  LogOut, Loader2, WalletCards, History,
  BarChart3, Settings, Menu, Download, Upload, Landmark, RefreshCw,
} from "lucide-react"
import AuthScreen from "@/components/auth/AuthScreen"
import PinPadScreen from "@/components/auth/PinPadScreen"
import SettingsModal from "@/components/modals/SettingsModal"
import CuentasModal from "@/components/modals/CuentasModal"
import IngresoTab from "@/components/tabs/IngresoTab"
import HistorialTab from "@/components/tabs/HistorialTab"
import DashboardTab from "@/components/tabs/DashboardTab"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import type { Categoria, Cuenta, Presupuesto, Objetivo } from "@/types"
import EncryptionBadge from "@/components/ui/Encryptionbadge"
import { clearKey, getMasterKey, decryptData, clearBiometricKey } from "@/lib/crypto"

const APP_VERSION = 15

// ─── MainApp ─────────────────────────────────────────────────────────────────
function MainApp({ session }: { session: Session }) {
  const [tab, setTab]                   = useState<"ingreso" | "historial" | "dashboard">("ingreso")
  const [categorias, setCategorias]     = useState<Categoria[]>([])
  const [cuentas, setCuentas]           = useState<Cuenta[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [objetivos, setObjetivos]       = useState<Objetivo[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showCuentas, setShowCuentas]   = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [isMenuOpen, setIsMenuOpen]     = useState(false)
  const [historialKey, setHistorialKey] = useState(0)

  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  // Carga inicial de datos
  useEffect(() => {
    supabase
      .from("categorias")
      .select("*")
      .eq("user_id", session.user.id)
      .order("label")
      .then(({ data }) => { if (data) setCategorias(data) })

    supabase
      .from("cuentas")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at")
      .then(async ({ data }) => {
        if (!data) return
        const decrypted = await Promise.all(
          data.map(async c => ({
            ...c,
            nombre:        await decryptData(c.nombre),
            saldo_inicial: parseFloat(await decryptData(String(c.saldo_inicial))) || 0,
          }))
        )
        setCuentas(decrypted)
      })

      supabase
      .from("presupuestos")
      .select("*")
      .eq("user_id", session.user.id)
      .then(async ({ data }) => {
        if (!data) return
        const decrypted = await Promise.all(
          data.map(async p => ({
            ...p,
            cantidad: parseFloat(await decryptData(String(p.cantidad))) || 0,
          }))
        )
        setPresupuestos(decrypted)
      })

    supabase
      .from("objetivos")
      .select("*")
      .eq("user_id", session.user.id)
      .then(async ({ data }) => {
        if (!data) return
        const decrypted = await Promise.all(
          data.map(async o => ({
            ...o,
            cantidad: parseFloat(await decryptData(String(o.cantidad))) || 0,
          }))
        )
        setObjetivos(decrypted)
      })
  }, [session.user.id])

  const handleExportCSV = async () => {
    const { data } = await supabase
      .from("movimientos")
      .select("*")
      .order("created_at", { ascending: false })

    if (!data || data.length === 0) {
      alert("No hay movimientos para exportar")
      setIsMenuOpen(false)
      return
    }

    const dec = await Promise.all(
      data.map(async m => ({
        ...m,
        cantidad: parseFloat(await decryptData(m.cantidad)) || 0,
        nota:     m.nota ? await decryptData(m.nota) : "",
      }))
    )

    // Resolvemos cuenta_id a nombre de cuenta para que el CSV sea legible
    const cuentaMap = Object.fromEntries(cuentas.map(c => [c.id, c.nombre]))

    const headers = ["ID", "Fecha", "Tipo", "Categoria", "Cantidad", "Nota", "Cuenta"]
    const rows = dec.map(m => [
      m.id,
      new Date(m.created_at).toLocaleString("es-ES"),
      m.tipo ?? "gasto",
      m.categoria,
      m.cantidad,
      (m.nota || "").replace(/,/g, ";"),
      cuentaMap[m.cuenta_id] || m.cuenta_id || "",
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }))
    const a   = document.createElement("a")
    a.href     = url
    a.download = "gastos_export.csv"
    a.click()
    URL.revokeObjectURL(url)
    setIsMenuOpen(false)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 w-full max-w-md mx-auto relative overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-safe-top pb-0.5 min-h-10 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm relative z-20">
        <div className="flex items-center gap-2">
        <img src="/logo.png" alt="GastOS" className="w-8 h-8 rounded-lg" />
        <span className="text-lg font-bold tracking-tight text-zinc-100">GastOS</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCuentas(true)}
            aria-label="Mis cuentas"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <Landmark className="w-5 h-5 text-zinc-400" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(o => !o)}
              aria-label="Menú principal"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-zinc-400" />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  role="menuitem"
                  onClick={() => { setShowSettings(true); setIsMenuOpen(false) }}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors w-full"
                >
                  <Settings className="w-4 h-4" /> Configuración
                </button>
                <button
                  role="menuitem"
                  onClick={handleExportCSV}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors w-full"
                >
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setShowImport(true); setIsMenuOpen(false) }}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors w-full"
                >
                  <Upload className="w-4 h-4" /> Importar CSV
                </button>
                <div className="h-px bg-zinc-800 my-1 mx-2" />
                <button
                  role="menuitem"
                  onClick={() => { clearKey(); clearBiometricKey(); supabase.auth.signOut(); setIsMenuOpen(false) }}
                  className="flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === "ingreso"   && <IngresoTab categorias={categorias} cuentas={cuentas} />}
        {tab === "historial" && <HistorialTab key={historialKey} categorias={categorias} cuentas={cuentas} />}
        {tab === "dashboard" && <DashboardTab categorias={categorias} cuentas={cuentas} presupuestos={presupuestos} objetivos={objetivos} onObjetivosChange={setObjetivos} />}
      </main>

      <nav className="border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-4 py-1">
        <div className="flex items-end justify-around">
          {[
            { id: "ingreso",    Icon: WalletCards, label: "Registrar"  },
            { id: "historial",  Icon: History,     label: "Historial"  },
            { id: "dashboard",  Icon: BarChart3,   label: "Dashboard"  },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id as "ingreso" | "historial" | "dashboard")}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 relative ${
                tab === id ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {tab === id && (
                <span className="absolute bottom-0 block w-10 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        categorias={categorias}
        onCategoriesChange={setCategorias}
        presupuestos={presupuestos}
        onPresupuestosChange={setPresupuestos}
        objetivos={objetivos}
        onObjetivosChange={setObjetivos}
        session={session}
        userId={session.user.id}
      />
      <CuentasModal
        isOpen={showCuentas}
        onClose={() => setShowCuentas(false)}
        cuentas={cuentas}
        onCuentasChange={setCuentas}
      />
      <ImportCSVModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        categorias={categorias}
        cuentas={cuentas}
        onSuccess={() => {
          setTab("historial")
          setHistorialKey(k => k + 1)
        }}
      />
      <FeedbackWidget userId={session.user.id} />
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  const [session,     setSession]     = useState<Session | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [mounted,     setMounted]     = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [hasKey,      setHasKey]      = useState(false)

  useEffect(() => {
    setMounted(true)

    async function initApp() {
      try {
        const { data: config } = await supabase
          .from("app_config")
          .select("min_version")
          .eq("id", 1)
          .maybeSingle()
        if (config && config.min_version > APP_VERSION) setNeedsUpdate(true)

        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)

        // Si hay clave en memoria (módulo no descargado), marcar como desbloqueado
        if (s && getMasterKey()) setHasKey(true)
      } catch (e) {
        console.error("initApp error:", e)
      } finally {
        setLoading(false)
      }
    }

    initApp()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        clearKey()
        setHasKey(false)
      }
    })

    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const { data: config } = await supabase
          .from("app_config")
          .select("min_version")
          .eq("id", 1)
          .maybeSingle()
        if (config && config.min_version > APP_VERSION) setNeedsUpdate(true)
      } catch { }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      authListener.subscription.unsubscribe()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  const handleUnlocked = useCallback(() => setHasKey(true), [])

  if (!mounted || loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
  )

  if (needsUpdate) return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
        <RefreshCw className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">Actualización Necesaria</h2>
      <button
        onClick={() => window.location.reload()}
        className="bg-emerald-500 text-zinc-950 font-bold py-3 px-8 rounded-xl w-full max-w-sm transition-all"
      >
        Actualizar ahora
      </button>
    </div>
  )

  if (!session)  return <AuthScreen />
  if (!hasKey)   return <PinPadScreen session={session} onUnlocked={handleUnlocked} />
  return <MainApp session={session} />
}