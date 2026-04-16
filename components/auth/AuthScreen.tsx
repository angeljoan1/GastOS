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
import { Loader2, ArrowLeft } from "lucide-react"

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

  const inputClass = "w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-200 focus:outline-none focus:border-emerald-500/50 focus:bg-zinc-900"

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
        <div className="w-[600px] h-[300px] rounded-full bg-emerald-500/5 blur-[100px] -translate-y-1/2 mt-20" />
      </div>

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-500 relative">

        {/* Logo + title */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl scale-110" />
            <img
              src="/icon.png"
              alt={t("auth.logoAlt")}
              className="relative w-20 h-20 rounded-3xl ring-1 ring-white/10"
            />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-[-0.02em]">GastOS</h1>
          <p className="text-sm text-zinc-500 mt-1.5">{t("auth.appTagline")}</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm shadow-xl shadow-black/20">

          {/* Tabs login / registro */}
          {!isResettingPassword && (
            <div className="flex rounded-xl bg-zinc-950/60 p-1 mb-6 border border-zinc-800/60 gap-1" role="tablist">
              <button
                role="tab"
                aria-selected={isLogin}
                onClick={() => { setIsLogin(true);  resetModeState() }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isLogin
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
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
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t("auth.tabRegister")}
              </button>
            </div>
          )}

          {/* Recovery mode header */}
          {isResettingPassword && (
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => { setIsResettingPassword(false); resetModeState() }}
                className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-zinc-300">{t("auth.forgotPassword")}</span>
            </div>
          )}

          {/* Form */}
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
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wide">
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
                className={inputClass}
              />
            </div>

            {!isResettingPassword && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-400 tracking-wide">
                      {t("auth.labelPassword")}
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setIsResettingPassword(true); resetModeState() }}
                        className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t("auth.placeholderPassword")}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className={inputClass}
                  />
                </div>

                {!isLogin && (
                  <div className="animate-in fade-in duration-300">
                    <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-zinc-400 mb-1.5 tracking-wide">
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
                      className={inputClass}
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}
            {success && (
              <div role="status" className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-500">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 btn-shadow active:translate-y-px"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {isResettingPassword
                ? t("auth.submitResetLink")
                : isLogin
                ? t("auth.submitLogin")
                : t("auth.submitRegister")
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
