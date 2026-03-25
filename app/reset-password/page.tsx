"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2, CheckCircle2, Lock } from "lucide-react"

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
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    // Escuchamos el estado de auth para atrapar la sesión del link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setIsVerifying(false)
      }
    })

    // Comprobación inicial por si ya entró
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsVerifying(false)
      // Si pasan 5 segundos y no hay sesión, avisamos
      setTimeout(() => setIsVerifying(false), 5000)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.")
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message === "Auth session missing!" 
        ? "La sesión ha caducado. Por seguridad, pide un nuevo correo." 
        : updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => { window.location.href = "/" }, 2000)
    }
    setLoading(false)
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Validando tu enlace de seguridad...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Nueva Contraseña</h1>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-4 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-medium">¡Contraseña cambiada!</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Nueva contraseña" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" 
            />
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Repite la contraseña" 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" 
            />
            
            {error && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Guardar y acceder"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}