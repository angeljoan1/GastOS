"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2, CheckCircle2, Lock, AlertCircle } from "lucide-react"

// Usamos las llaves directas igual que en tu page.tsx principal para eliminar fallos de Vercel
const supabaseUrl = "https://hwvkfobocmzvlezjviqy.supabase.co"
const supabaseKey = "sb_publishable_s1ISa8PMnxviz21ADMtyqA_tSSdcuyA"
const supabase = createClient(supabaseUrl, supabaseKey)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [isVerifying, setIsVerifying] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    async function forceSessionExtraction() {
      // Leemos absolutamente toda la URL
      const fullUrl = window.location.href;
      const searchParams = new URLSearchParams(window.location.search);
      // Convertimos el hash en searchParams por si viene por el método antiguo
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));

      const code = searchParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

      if (errorDesc) {
         setError(`Supabase dice: ${errorDesc.replace(/\+/g, ' ')}`);
         setIsVerifying(false);
         return;
      }

      if (accessToken && refreshToken) {
         // MÉTODO 1: Forzamos la sesión a mano (Implicit Flow)
         const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
         });
         if (setErr) {
             setError("Error forzando sesión: " + setErr.message);
         } else {
             setHasSession(true);
         }
      } else if (code) {
         // MÉTODO 2: Canjeamos el código (PKCE Flow)
         const { error: excErr } = await supabase.auth.exchangeCodeForSession(code);
         if (excErr) {
             setError(`El código PKCE falló. URL recibida: ${fullUrl}`);
         } else {
             setHasSession(true);
         }
      } else {
         // MÉTODO 3: Miramos si ya hay sesión activa
         const { data: { session } } = await supabase.auth.getSession();
         if (session) {
             setHasSession(true);
         } else {
             // Si llegamos aquí, Gmail o el móvil nos ha borrado la llave de la URL
             setError(`URL recibida vacía: ${fullUrl}`);
         }
      }
      setIsVerifying(false);
    }

    forceSessionExtraction();
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
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Nueva Contraseña</h1>
        </div>

        {isVerifying && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-zinc-400 text-sm">Validando llaves de seguridad...</p>
          </div>
        )}

        {!isVerifying && !hasSession && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-400 text-left mb-6 break-words w-full">
              {error}
            </div>
            <button onClick={() => window.location.href = "/"} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Volver al inicio
            </button>
          </div>
        )}

        {!isVerifying && hasSession && success && (
          <div className="flex flex-col items-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-medium">¡Contraseña cambiada!</p>
          </div>
        )}

        {!isVerifying && hasSession && !success && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" />
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all" />
            
            {error && <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-xs text-red-400 text-center">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3.5 rounded-xl flex items-center justify-center">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar y acceder"}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}