"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"

// Importamos Supabase aquí también
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Auth Screen ─────────────────────────────────────────────────────────────
export default function AuthScreen() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLogin, setIsLogin] = useState(true)
    const [isResettingPassword, setIsResettingPassword] = useState(false) // NUEVO ESTADO
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Función para Login y Registro
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setLoading(true)

        if (!isLogin) {
            if (password !== confirmPassword) {
                setError("Las contraseñas no coinciden.")
                setLoading(false)
                return
            }

            const tieneLetras = /[a-zA-Z]/.test(password)
            const tieneNumeros = /[0-9]/.test(password)

            if (password.length < 8 || !tieneLetras || !tieneNumeros) {
                setError("La contraseña debe tener al menos 8 caracteres, incluir letras y números.")
                setLoading(false)
                return
            }
        }

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) setError("Credenciales incorrectas. Inténtalo de nuevo.")
        } else {
            const { error } = await supabase.auth.signUp({ email, password })
            if (error) setError(error.message)
            else setSuccess("Registro exitoso. Revisa tu correo para confirmar tu cuenta.")
        }

        setLoading(false)
    }

    // NUEVA FUNCIÓN: Enviar correo de recuperación
    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault()
        if (!email) {
            setError("Por favor, introduce tu correo electrónico.")
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess("Te hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada.")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-10">
                    <div className="mb-4">
                        <img src="/icon.png" alt="Logo GastOS" className="w-22 h-22 rounded-3xl shadow-lg shadow-emerald-400/80" />
                    </div>
                    <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">GastOS</h1>
                    <p className="text-sm text-zinc-500 mt-1">Registro de gastos personal</p>
                </div>

                {/* Solo mostramos las pestañas si NO estamos recuperando la contraseña */}
                {!isResettingPassword && (
                    <div className="flex rounded-xl bg-zinc-900 p-1 mb-6 border border-zinc-800">
                        <button onClick={() => { setIsLogin(true); setError(null); setSuccess(null); setConfirmPassword(""); setPassword(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isLogin ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                            Iniciar Sesión
                        </button>
                        <button onClick={() => { setIsLogin(false); setError(null); setSuccess(null); setConfirmPassword(""); setPassword(""); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${!isLogin ? "bg-zinc-700 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>
                            Registrarse
                        </button>
                    </div>
                )}

                {/* El formulario cambia su onSubmit dependiendo del modo */}
                <form onSubmit={isResettingPassword ? handleResetPassword : handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Correo electrónico</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                    </div>

                    {/* Ocultamos las contraseñas si estamos en modo recuperación */}
                    {!isResettingPassword && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
                                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                            </div>

                            {isLogin && (
                                <div className="flex justify-end mt-1">
                                    <button type="button" onClick={() => { setIsResettingPassword(true); setError(null); setSuccess(null); }} className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                                        ¿Has olvidado tu contraseña?
                                    </button>
                                </div>
                            )}

                            {!isLogin && (
                                <div className="animate-in fade-in duration-300">
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                                        Confirmar Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {error && <div className="bg-red-950/50 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
                    {success && <div className="bg-emerald-950/50 border border-emerald-900/50 rounded-xl px-4 py-3 text-sm text-emerald-400">{success}</div>}

                    {/* Botón dinámico */}
                    <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-3 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isResettingPassword ? "Enviar enlace" : (isLogin ? "Entrar" : "Crear cuenta")}
                    </button>

                    {/* Botón para volver atrás */}
                    {isResettingPassword && (
                        <button type="button" onClick={() => { setIsResettingPassword(false); setError(null); setSuccess(null); }} className="w-full text-sm text-zinc-400 hover:text-zinc-200 mt-2 transition-colors py-2">
                            Volver a Iniciar Sesión
                        </button>
                    )}
                </form>
            </div>
        </div>
    )
}
