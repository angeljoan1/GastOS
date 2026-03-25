"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2, CheckCircle2, Lock, AlertCircle } from "lucide-react"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // ESTADOS ESTRICTOS DE VERIFICACIÓN
  const [isVerifying, setIsVerifying] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function initializeSession() {
      // 1. Si Supabase envía el link con el sistema nuevo (?code=)
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      // 2. Le damos 1 segundo de margen a la librería para procesar la URL
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (isMounted) {
          if (session) {
            setHasSession(true)
          } else {
            setError("No hemos detectado una llave de seguridad válida. El enlace puede haber caducado o ha sido bloqueado por el correo. Solicita uno nuevo.")
          }
          setIsVerifying(false)
        }
      }, 1000)
    }

    initializeSession()

    // 3. Un "escuchador" de emergencia por si la sesión entra más tarde
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted) {
        setHasSession(true)
        setIsVerifying(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.")
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => { window.location.href = "/" }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Nueva Contraseña</h1>
        </div>

        {/* PANTALLA 1: CARGANDO */}
        {isVerifying && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-zinc-400 text-sm">Abriendo puerta segura...</p>
          </div>
        )}

        {/* PANTALLA 2: ERROR DE ENLACE */}
        {!isVerifying && !hasSession && (
          <div className="flex flex-col items-center animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400 text-center mb-6">
              {error}
            </div>
            <button onClick={() => window.location.href = "/"} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Volver al inicio
            </button>
          </div>
        )}

        {/* PANTALLA 3: ÉXITO */}
        {!isVerifying && hasSession && success && (
          <div className="flex flex-col items-center py-4 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-medium">¡Contraseña cambiada!</p>
            <p className="text-xs text-zinc-500 mt-2">Redirigiendo a la app...</p>
          </div>
        )}

        {/* PANTALLA 4: EL FORMULARIO (Solo si hay sesión y no hemos terminado) */}
        {!isVerifying && hasSession && !success && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in">
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Nueva contraseña" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" 
            />
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Repite la contraseña" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" 
            />
            
            {error && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-400 text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar y acceder"}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}