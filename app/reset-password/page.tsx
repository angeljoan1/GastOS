"use client"

// app/reset-password/page.tsx
// ─── Fix en este archivo ──────────────────────────────────────────────────────
// BUG #7: Tenía su propio createClient() rompiendo el patrón Singleton.
//         Ahora importa el cliente compartido de lib/supabase.ts.

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"          // ← Singleton compartido
import { Loader2, CheckCircle2, Lock, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const t = useTranslations()
  const [password,        setPassword]        = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)
  const [isVerifying,     setIsVerifying]     = useState(true)
  const [hasSession,      setHasSession]      = useState(false)

  useEffect(() => {
    async function initializeSecureSession() {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams   = new URLSearchParams(window.location.hash.replace("#", "?"))

      const code        = searchParams.get("code")
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const errorDesc   = searchParams.get("error_description") || hashParams.get("error_description")

      if (errorDesc) {
        setError(t("reset_password.errorLinkInvalid"))
        setIsVerifying(false)
        return
      }

      let sessionEstablished = false

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        if (!error) sessionEstablished = true
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) sessionEstablished = true
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) sessionEstablished = true
      }

      if (sessionEstablished) {
        setHasSession(true)
        // Limpiar la URL para que no quede rastro del token
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        setError(t("reset_password.errorNoSession"))
      }

      setIsVerifying(false)
    }

    initializeSecureSession()
  }, [])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) return setError(t("reset_password.errorPasswordMismatch"))
  
    const tieneLetras  = /[a-zA-Z]/.test(password)
    const tieneNumeros = /[0-9]/.test(password)
    if (password.length < 8 || !tieneLetras || !tieneNumeros) {
      return setError(t("reset_password.errorPasswordWeak"))
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(t("reset_password.errorUpdate", { message: updateError.message }))
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
          <h1 className="text-xl font-bold text-zinc-100">{t("reset_password.title")}</h1>
        </div>

        {isVerifying && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <p className="text-zinc-400 text-sm">{t("reset_password.validating")}</p>
          </div>
        )}

        {!isVerifying && !hasSession && (
          <div className="flex flex-col items-center animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400 text-center mb-6">
              {error}
            </div>
            <button
              onClick={() => window.location.href = "/"}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {t("reset_password.backToHome")}
            </button>
          </div>
        )}

        {!isVerifying && hasSession && success && (
          <div className="flex flex-col items-center py-4 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-medium">{t("reset_password.successMsg")}</p>
          </div>
        )}

        {!isVerifying && hasSession && !success && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in">
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                {t("reset_password.labelNewPassword")}
              </label>
              <input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t("reset_password.placeholderNewPassword")}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                {t("reset_password.labelConfirmPassword")}
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("reset_password.placeholderConfirmPassword")}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

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
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : t("reset_password.submit")
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}