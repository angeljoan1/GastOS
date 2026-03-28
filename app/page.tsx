"use client"

// app/page.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #6:  Descifrado de cuentas ahora es seguro (guarda el parseFloat
//          en el mismo map, no en un segundo paso donde la key podría no estar)
// BUG #28: El menú hamburguesa ahora se cierra al hacer clic fuera

import { useState, useEffect, useCallback, useRef } from "react"
import FeedbackWidget from "@/components/FeedbackWidget"
import ImportCSVModal from "@/components/modals/ImportCSVModal"
import {
  LogOut, Loader2, WalletCards, History,
  BarChart3, Settings, Menu, Download, Upload, Landmark, Lock, Delete, RefreshCw,
  KeyRound,
} from "lucide-react"
import AuthScreen from "@/components/auth/AuthScreen"
import SettingsModal from "@/components/modals/SettingsModal"
import CuentasModal from "@/components/modals/CuentasModal"
import IngresoTab from "@/components/tabs/IngresoTab"
import HistorialTab from "@/components/tabs/HistorialTab"
import DashboardTab from "@/components/tabs/DashboardTab"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import type { Categoria, Cuenta, Presupuesto } from "@/types"
import EncryptionBadge from "@/components/ui/Encryptionbadge"
import {
  deriveKeyFromPin, saveKey, clearKey, getMasterKey,
  generateVerificationToken, isKeyValid, decryptData,
} from "@/lib/crypto"

const APP_VERSION = 6

function triggerHaptic(duration?: number | number[]) {
  if (!navigator.vibrate) return
  if (Array.isArray(duration)) navigator.vibrate(duration)
  else navigator.vibrate(duration ?? 30)
}

// ─── MainApp ─────────────────────────────────────────────────────────────────
function MainApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<"ingreso" | "historial" | "dashboard">("ingreso")
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showCuentas, setShowCuentas] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [historialKey, setHistorialKey] = useState(0)

  // BUG #28 FIX: ref al botón de menú para que el listener de clic exterior
  // no lo trate como "clic fuera" cuando el propio botón lo abre
  const menuRef = useRef<HTMLDivElement>(null)

  // BUG #28 FIX: cerrar menú al hacer clic fuera
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
      .then(({ data }) => {
        if (data) {
          // BUG #6 FIX: Descifrado completo y seguro en un solo map.
          // Usamos parseFloat con fallback a 0 para saldo_inicial.
          // Si la key no está disponible, decryptData devuelve '' y parseFloat('') = NaN → 0.
          setCuentas(
            data.map(c => ({
              ...c,
              nombre: decryptData(c.nombre),
              saldo_inicial: parseFloat(decryptData(String(c.saldo_inicial))) || 0,
            }))
          )
        }
      })

    supabase
      .from("presupuestos")
      .select("*")
      .eq("user_id", session.user.id)
      .then(({ data }) => { if (data) setPresupuestos(data) })
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

    const dec = data.map(m => ({
      ...m,
      cantidad: parseFloat(decryptData(m.cantidad)) || 0,
      nota: m.nota ? decryptData(m.nota) : "",
    }))

    const headers = ["ID", "Fecha", "Tipo", "Categoria", "Cantidad", "Nota", "Cuenta"]
    const rows = dec.map(m => [
      m.id,
      new Date(m.created_at).toLocaleString("es-ES"),
      m.tipo ?? "gasto",
      m.categoria,
      m.cantidad,
      (m.nota || "").replace(/,/g, ";"),
      m.cuenta_id || "",
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "gastos_export.csv"
    a.click()
    URL.revokeObjectURL(url) // liberar memoria
    setIsMenuOpen(false)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 w-full max-w-md mx-auto relative overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-safe-top pb-3 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm relative z-20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GastOS" className="w-7 h-7 rounded-lg" />
          <span className="text-base font-bold tracking-tight text-zinc-100">GastOS</span>
          <EncryptionBadge />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCuentas(true)}
            aria-label="Mis cuentas"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <Landmark className="w-4 h-4 text-zinc-400" />
          </button>

          {/* BUG #28 FIX: envolvemos el botón + menú en un ref para detectar clics exteriores */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(o => !o)}
              aria-label="Menú principal"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-4 h-4 text-zinc-400" />
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
                  onClick={() => { clearKey(); supabase.auth.signOut(); setIsMenuOpen(false) }}
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
        {tab === "ingreso" && <IngresoTab categorias={categorias} cuentas={cuentas} />}
        {tab === "historial" && (<HistorialTab key={historialKey} categorias={categorias} cuentas={cuentas} />)}
        {tab === "dashboard" && <DashboardTab categorias={categorias} cuentas={cuentas} presupuestos={presupuestos} />}
      </main>

      <nav className="border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm px-4 py-1">
        <div className="flex items-end justify-around">
          {[
            { id: "ingreso", Icon: WalletCards, label: "Registrar" },
            { id: "historial", Icon: History, label: "Historial" },
            { id: "dashboard", Icon: BarChart3, label: "Dashboard" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id as "ingreso" | "historial" | "dashboard")}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all duration-200 relative ${tab === id ? "text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {tab === id && (
                <span className="absolute bottom-0 block w-8 h-0.5 bg-emerald-400 rounded-full" />
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
          setHistorialKey(k => k + 1)   // fuerza remontaje del HistorialTab
        }}
      />
      <FeedbackWidget userId={session.user.id} />
    </div>
  )
}

// ─── PinPadScreen ─────────────────────────────────────────────────────────────
function PinPadScreen({
  session,
  onUnlocked,
}: {
  session: Session
  onUnlocked: () => void
}) {
  const [pinInput, setPinInput] = useState("")
  const [pinToConfirm, setPinToConfirm] = useState<string | null>(null)
  const [vaultToken, setVaultToken] = useState<string | null>(null)
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  useEffect(() => {
    
    if (!session) return
    async function loadVault() {
      try {
        
        const params     = new URLSearchParams(window.location.search)
        const resetVault = params.get("reset_vault") === "1"
        const resetToken = params.get("reset_token")
  
        window.history.replaceState({}, "", window.location.pathname)
    
        if (resetVault && resetToken) {
          const { data: vault } = await supabase
            .from("user_vault")
            .select("reset_token, reset_token_expires_at")
            .eq("user_id", session.user.id)
            .maybeSingle()
    
          const ahora   = new Date()
          const tokenOk = vault?.reset_token === resetToken
          const noExpira = vault?.reset_token_expires_at
                           && new Date(vault.reset_token_expires_at) > ahora
    
          if (tokenOk && noExpira) {
            await supabase
              .from("user_vault")
              .update({ reset_token: null, reset_token_expires_at: null })
              .eq("user_id", session.user.id)
            await supabase
              .from("user_vault")
              .delete()
              .eq("user_id", session.user.id)
          } else {
            setVaultError("El enlace de recuperación ha caducado o ya fue usado.")
          }
        }
    
        const { data: vault, error } = await supabase
        .from("user_vault")
        .select("verification_token")
        .maybeSingle()

      if (vault?.verification_token) {
        setVaultToken(vault.verification_token)
        setIsFirstTime(false)
      } else {
        setIsFirstTime(true)
      }
    } catch(e) {
      console.error("loadVault crash:", e)
      setIsFirstTime(true)
    }
  }
  loadVault()
}, [session])

  
  const handleKeyPress = (num: string) => {
    if (pinInput.length >= 6 || isUnlocking) return
    triggerHaptic(30)
    const newPin = pinInput + num
    setPinInput(newPin)
    if (newPin.length === 6) {
      if (isFirstTime) {
        if (pinToConfirm === null) {
          // Paso 1: guardar el PIN y pedir confirmación
          setTimeout(() => {
            setPinToConfirm(newPin)
            setPinInput("")
          }, 250)
        } else {
          // Paso 2: comparar con el PIN del paso 1
          setTimeout(() => {
            if (newPin === pinToConfirm) {
              processUnlock(newPin)
            } else {
              triggerHaptic([50, 50, 50])
              setVaultError("Los PINs no coinciden. Vuelve a intentarlo.")
              setPinInput("")
              setPinToConfirm(null)
            }
          }, 250)
        }
      } else {
        setTimeout(() => processUnlock(newPin), 250)
      }
    }
  }

  const handleBackspace = () => {
    if (isUnlocking) return
    triggerHaptic(20)
    setPinInput(prev => {
      // Si estamos en paso 2 y el usuario borra todo, volver al paso 1
      if (isFirstTime && pinToConfirm !== null && prev.length === 0) {
        setPinToConfirm(null)
        setVaultError(null)
        return ""
      }
      return prev.slice(0, -1)
    })
  }

  const processUnlock = async (pin: string) => {
    if (isUnlocking) return
    setIsUnlocking(true)
    setVaultError(null)

    try {
      const derivedKey = deriveKeyFromPin(pin, session.user.id)

      if (isFirstTime) {
        const newToken = generateVerificationToken(derivedKey)
        const { error: dbError } = await supabase
          .from("user_vault")
          .insert({ user_id: session.user.id, verification_token: newToken })

        if (dbError) {
          if (dbError.code === "23505") {
            const { data: existing } = await supabase
              .from("user_vault")
              .select("verification_token")
              .maybeSingle()
            if (existing) {
              setVaultToken(existing.verification_token)
              setIsFirstTime(false)
              setVaultError("Ya tienes una bóveda. Introduce tu PIN original.")
              setPinInput("")
              setIsUnlocking(false)
              return
            }
          }
          throw new Error("No se pudo guardar la bóveda.")
        }

        saveKey(derivedKey)
        onUnlocked()

      } else if (vaultToken) {
        if (isKeyValid(derivedKey, vaultToken)) {
          saveKey(derivedKey)
          onUnlocked()
        } else {
          triggerHaptic([50, 50, 50])
          setVaultError("PIN incorrecto. Inténtalo de nuevo.")
          setPinInput("")
        }
      }
    } catch (e: unknown) {
      setVaultError(e instanceof Error ? e.message : "Error de seguridad. Reintenta.")
      setPinInput("")
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleRecovery = async () => {
    setRecoveryLoading(true)
  
    // Generar token aleatorio de un solo uso
    const resetToken = crypto.randomUUID()
    const expiresAt  = new Date(Date.now() + 1000 * 60 * 30).toISOString() // 30 min
  
    // Guardarlo en la bóveda del usuario
    const { error: tokenError } = await supabase
      .from("user_vault")
      .update({ reset_token: resetToken, reset_token_expires_at: expiresAt })
      .eq("user_id", session.user.id)
  
    if (tokenError) {
      setVaultError("Error al generar el enlace. Inténtalo más tarde.")
      setRecoveryLoading(false)
      return
    }
  
    await supabase.auth.signOut()
  
    const { error } = await supabase.auth.signInWithOtp({
      email: session.user.email!,
      options: {
        emailRedirectTo: `${window.location.origin}/?reset_vault=1&reset_token=${resetToken}`,
      },
    })
  
    setRecoveryLoading(false)
    if (!error) setRecoverySuccess(true)
    else setVaultError("Error al enviar el correo. Inténtalo más tarde.")
  }

  if (isFirstTime === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (showRecovery) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
          <KeyRound className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-3">Recuperar acceso</h2>

        {recoverySuccess ? (
          <div className="space-y-4 max-w-xs">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Te hemos enviado un enlace a{" "}
              <strong className="text-zinc-200">{session.user.email}</strong>.
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              ⚠️ Al usar ese enlace podrás crear un{" "}
              <strong>PIN nuevo</strong>, pero los movimientos cifrados con el PIN anterior
              ya no serán legibles. Los datos de categorías y cuentas se mantienen.
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-xs">
            <p className="text-zinc-400 text-sm leading-relaxed">
              Si has olvidado tu PIN, podemos enviarte un enlace a{" "}
              <strong className="text-zinc-200">{session.user.email}</strong> para crear uno nuevo.
            </p>
            <p className="text-zinc-600 text-xs leading-relaxed">
              Nota: los movimientos anteriores no serán legibles con el PIN nuevo,
              ya que estaban cifrados con el anterior.
            </p>
            {vaultError && (
              <p className="text-xs text-red-400 bg-red-950/30 rounded-xl px-4 py-3">
                {vaultError}
              </p>
            )}
            <button
              onClick={handleRecovery}
              disabled={recoveryLoading}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {recoveryLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                : "Enviar enlace de recuperación"
              }
            </button>
            <button
              onClick={() => { setShowRecovery(false); setVaultError(null) }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Volver al PIN
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between py-12 px-8 text-center select-none overflow-hidden">
      <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${vaultError ? "bg-red-500/10" : "bg-emerald-500/10"
          }`}>
          <Lock className={`w-6 h-6 ${vaultError ? "text-red-400" : "text-emerald-400"}`} />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">
          {isFirstTime
            ? pinToConfirm !== null ? "Confirma tu PIN" : "Crear PIN de acceso"
            : "Desbloquear GastOS"
          }
        </h2>
        <p className="text-zinc-500 text-xs max-w-[240px] mx-auto leading-relaxed">
          {isFirstTime
            ? pinToConfirm !== null
              ? vaultError || "Repite los 6 dígitos para confirmar."
              : "Elige 6 dígitos para proteger tus finanzas. Podrás recuperar el acceso via email si lo olvidas."
            : vaultError || "Introduce tu PIN de 6 dígitos."
          }
        </p>
      </div>

      {/* Indicadores de dígitos */}
      <div className="flex gap-4 my-10" aria-label="PIN introducido" aria-live="polite">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i < pinInput.length
                ? "bg-emerald-500 border-emerald-500 scale-125 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "border-zinc-800 bg-transparent"
              }`}
          />
        ))}
      </div>

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-6 max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            disabled={isUnlocking}
            aria-label={num}
            className="w-20 h-20 rounded-full bg-zinc-900/40 text-2xl font-light text-zinc-200 border border-zinc-800/50 active:bg-emerald-500/20 active:scale-90 transition-all flex items-center justify-center tabular-nums shadow-sm"
          >
            {num}
          </button>
        ))}
        <div className="w-20 h-20" />
        <button
          onClick={() => handleKeyPress("0")}
          disabled={isUnlocking}
          aria-label="0"
          className="w-20 h-20 rounded-full bg-zinc-900/40 text-2xl font-light text-zinc-200 border border-zinc-800/50 active:bg-emerald-500/20 transition-all flex items-center justify-center tabular-nums"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={isUnlocking || pinInput.length === 0}
          aria-label="Borrar dígito"
          className="w-20 h-20 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 active:scale-75 transition-all"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <EncryptionBadge />
        {!isFirstTime && (
          <button
            onClick={() => setShowRecovery(true)}
            className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] hover:text-zinc-400 transition-colors"
          >
            ¿Olvidaste tu PIN?
          </button>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      {isUnlocking && (
        <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      )}
    </div>
  )
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const [hasKey, setHasKey] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return Boolean(getMasterKey())
  })

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
    
        const { data: { session: s }, error } = await supabase.auth.getSession()
        
        setSession(s)
       
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

    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleUnlocked = useCallback(() => {
    setHasKey(true)
  }, [])

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
        className="bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl w-full max-w-sm transition-all"
      >
        Actualizar ahora
      </button>
    </div>
  )

  if (!session) return <AuthScreen />
  if (!hasKey) return <PinPadScreen session={session} onUnlocked={handleUnlocked} />
  return <MainApp session={session} />
}