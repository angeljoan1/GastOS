"use client"

// components/auth/AuthScreen.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #16: Los labels del formulario usaban text-zinc-400 sobre bg-zinc-900,
//          generando un contraste ~3:1 para texto de 10px — por debajo del
//          mínimo WCAG AA (4.5:1 para texto pequeño).
//          FIX: subimos a text-zinc-300 y aumentamos el tamaño a text-xs (12px)
//          con tracking normal. También añadimos htmlFor en cada label para
//          asociarlos correctamente con su input.

import { useState } from "react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function AuthScreen() {
    const t = useTranslations()
    const [email,              setEmail]              = useState("")
  const [password,           setPassword]           = useState("")
  const [confirmPassword,    setConfirmPassword]    = useState("")
  const [isLogin,            setIsLogin]            = useState(true)
  const [isResettingPassword,setIsResettingPassword]= useState(false)
  const [loading,            setLoading]            = useState(false)
  const [error,              setError]              = useState<string | null>(null)
  const [success,            setSuccess]            = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!isLogin) {
        if (password !== confirmPassword) {
            setError(t("auth.errorPasswordMismatch"))
        setLoading(false)
        return
      }
      const tieneLetras  = /[a-zA-Z]/.test(password)
      const tieneNumeros = /[0-9]/.test(password)
      if (password.length < 8 || !tieneLetras || !tieneNumeros) {
        setError(t("auth.errorPasswordWeak"))
        setLoading(false)
        return
      }
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(t("auth.errorLoginFailed"))
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
        else setSuccess(t("auth.successRegister"))
    }

    setLoading(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
        setError(t("auth.errorEmailRequired"))
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) setError(error.message)
        else setSuccess(t("auth.successResetLink"))
    setLoading(false)
  }

  const resetModeState = () => {
    setError(null)
    setSuccess(null)
    setConfirmPassword("")
    setPassword("")
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">

        {/* Logo + título */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4">
            <img
              src="/icon.png"
              alt={t("auth.logoAlt")}
              className="w-20 h-20 rounded-3xl shadow-lg shadow-emerald-400/30"
            />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">GastOS</h1>
          <p className="text-sm text-zinc-400 mt-1">{t("auth.appTagline")}</p>
        </div>

        {/* Tabs login / registro — ocultos en modo recuperación */}
        {!isResettingPassword && (
          <div className="flex rounded-xl bg-zinc-900 p-1 mb-6 border border-zinc-800" role="tablist">
            <button
              role="tab"
              aria-selected={isLogin}
              onClick={() => { setIsLogin(true);  resetModeState() }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isLogin
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              >
              {t("auth.tabLogin")}
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              onClick={() => { setIsLogin(false); resetModeState() }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                !isLogin
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t("auth.tabRegister")}
            </button>
          </div>
        )}

        {/* Formulario */}
        <form
          onSubmit={isResettingPassword ? handleResetPassword : handleSubmit}
          className="space-y-4"
          aria-label={
            isResettingPassword
              ? t("auth.ariaFormReset")
              : isLogin
              ? t("auth.ariaFormLogin")
              : t("auth.ariaFormRegister")
          }
        >
          {/* BUG #16 FIX: label con contraste suficiente (text-zinc-300, text-xs)
              y htmlFor vinculado al id del input correspondiente */}
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide"
              >
              {t("auth.labelEmail")}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t("auth.placeholderEmail")}
              autoComplete="email"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {!isResettingPassword && (
            <>
              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide"
                  >
                  {t("auth.labelPassword")}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("auth.placeholderPassword")}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setIsResettingPassword(true); resetModeState() }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              )}

              {!isLogin && (
                <div className="animate-in fade-in duration-300">
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-xs font-medium text-zinc-300 mb-1.5 tracking-wide"
>
                    {t("auth.labelConfirmPassword")}
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.placeholderPassword")}
                    autoComplete="new-password"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <div role="alert" className="bg-red-950/50 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="bg-emerald-950/50 border border-emerald-900/50 rounded-xl px-4 py-3 text-sm text-emerald-400">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-3 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isResettingPassword
              ? t("auth.submitResetLink")
              : isLogin
              ? t("auth.submitLogin")
              : t("auth.submitRegister")
            }
          </button>

          {isResettingPassword && (
            <button
              type="button"
              onClick={() => { setIsResettingPassword(false); resetModeState() }}
              className="w-full text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-2"
            >
              {t("auth.backToLogin")}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}