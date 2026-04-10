"use client"

// components/auth/PinPadScreen.tsx
// Extraído de app/page.tsx para mejorar legibilidad.
//
// Cambios respecto a la versión original en page.tsx:
//   - PBKDF2 con salt aleatorio: lee kdf_salt de user_vault, lo genera si es primera vez
//   - deriveKeyFromPin ahora recibe Uint8Array salt (no lo deriva del userId)
//   - generateVerificationToken e isKeyValid son async → se usa await
//   - Vault query incluye .eq("user_id", ...) explícito (no solo confiamos en RLS)
//   - handleCobrarSub: insert con created_at calculado en un solo paso, sin UPDATE posterior
//   - console.log eliminados, se mantienen console.error en catch
//   - Advertencia de pérdida de datos en recuperación visible ANTES del botón de envío

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { supabase } from "@/lib/supabase"
import { Loader2, Lock, Delete, KeyRound } from "lucide-react"
import type { Session } from "@supabase/supabase-js"
import EncryptionBadge from "@/components/ui/Encryptionbadge"
import {
    deriveKeyFromPin,
    saveKey,
    generateSalt,
    generateVerificationToken,
    isKeyValid,
    isBiometricAvailable,
    hasBiometricKey,
    loadBiometricKey,
    saveBiometricKey,
    clearBiometricKey,
  } from "@/lib/crypto"

const LOCKOUT_KEY = "gastos_pin_lockout"
const MAX_ATTEMPTS = 5

function getLockout(): { attempts: number; lockedUntil: number } {
  try {
    return JSON.parse(localStorage.getItem(LOCKOUT_KEY) ?? '{"attempts":0,"lockedUntil":0}')
  } catch { return { attempts: 0, lockedUntil: 0 } }
}

function setLockout(attempts: number, lockedUntil: number) {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, lockedUntil }))
  } catch { }
}

function clearLockout() {
  try { localStorage.removeItem(LOCKOUT_KEY) } catch { }
}

function triggerHaptic(duration?: number | number[]) {
  if (!navigator.vibrate) return
  if (Array.isArray(duration)) navigator.vibrate(duration)
  else navigator.vibrate(duration ?? 30)
}

export default function PinPadScreen({
  session,
  onUnlocked,
}: {
  session: Session
  onUnlocked: () => void
}) {
    const t = useTranslations()
    const [pinInput, setPinInput]           = useState("")
  const [pinToConfirm, setPinToConfirm]   = useState<string | null>(null)
  const [vaultToken, setVaultToken]       = useState<string | null>(null)
  const [vaultSalt, setVaultSalt]         = useState<string | null>(null)   // base64 del salt
  const [isFirstTime, setIsFirstTime]     = useState<boolean | null>(null)
  const [vaultError, setVaultError]       = useState<string | null>(null)
  const [isUnlocking, setIsUnlocking]     = useState(false)
  const [showRecovery, setShowRecovery]   = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoverySuccess, setRecoverySuccess]   = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled]     = useState(false)
  const [biometricLoading, setBiometricLoading]     = useState(false)
  const [showBiometricOffer, setShowBiometricOffer] = useState(false)
  const [biometricError, setBiometricError]         = useState<string | null>(null)
  const [lockoutUntil, setLockoutUntil] = useState<number>(0)

  // ─── Carga del vault ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return

    async function loadVault() {
      try {
        // Procesamos parámetros de recuperación de vault
        const params     = new URLSearchParams(window.location.search)
        const resetVault = params.get("reset_vault") === "1"
        const resetToken = params.get("reset_token")
        window.history.replaceState({}, "", window.location.pathname)

        if (resetVault && resetToken) {
          const { data: vaultCheck } = await supabase
            .from("user_vault")
            .select("reset_token, reset_token_expires_at")
            .eq("user_id", session.user.id)   // explícito, no solo RLS
            .maybeSingle()

          const ahora   = new Date()
          const tokenOk = vaultCheck?.reset_token === resetToken
          const noExpira = vaultCheck?.reset_token_expires_at
            && new Date(vaultCheck.reset_token_expires_at) > ahora

            if (tokenOk && noExpira) {
                await supabase
                  .from("user_vault")
                  .update({ reset_token: null, reset_token_expires_at: null })
                  .eq("user_id", session.user.id)
              } else {
                setVaultError(t("pin.errorLinkExpired"))
          }
        }

        // Consulta explícita con user_id — no dependemos solo de RLS
        const { data: vault, error } = await supabase
          .from("user_vault")
          .select("verification_token, kdf_salt")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (error) throw error

        if (vault?.verification_token) {
          setVaultToken(vault.verification_token)
          setVaultSalt(vault.kdf_salt ?? null)
          setIsFirstTime(false)
        } else {
          setIsFirstTime(true)
        }
      } catch (e) {
        console.error("loadVault error:", e)
        setIsFirstTime(true)
      }
    }

    // Leer lockout existente
    const existing = getLockout()
    if (existing.lockedUntil > Date.now()) setLockoutUntil(existing.lockedUntil)

    loadVault()

    // Comprobar soporte biométrico
    isBiometricAvailable().then(available => {
      setBiometricAvailable(available)
      setBiometricEnabled(hasBiometricKey())
    })
  }, [session])

  // ─── Intento biométrico automático ──────────────────────────────────────────
  useEffect(() => {
    if (isFirstTime !== false) return   // solo si vault ya existe
    if (!hasBiometricKey()) return      // solo si biometría activada

    async function tryBiometric() {
      setBiometricLoading(true)
      const result = await loadBiometricKey(session.user.id)
      setBiometricLoading(false)
      if (result === 'ok') {
        onUnlocked()
      } else if (result === 'key_invalid') {
        clearBiometricKey()
        setBiometricEnabled(false)
      }
      // 'user_cancel': cara/empremta no llegida, no fer res — l'usuari entra amb PIN
    }

    tryBiometric()
  }, [isFirstTime, session.user.id, onUnlocked])

  // ─── Teclado ────────────────────────────────────────────────────────────────
  const handleKeyPress = (num: string) => {
    if (lockoutUntil > Date.now()) return
    if (pinInput.length >= 6 || isUnlocking) return
    triggerHaptic(30)
    const newPin = pinInput + num
    setPinInput(newPin)

    if (newPin.length === 6) {
      if (isFirstTime) {
        if (pinToConfirm === null) {
          setTimeout(() => { setPinToConfirm(newPin); setPinInput("") }, 250)
        } else {
          setTimeout(() => {
            if (newPin === pinToConfirm) {
              processUnlock(newPin)
            } else {
              triggerHaptic([50, 50, 50])
              setVaultError(t("pin.errorPinMismatch"))
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
      if (isFirstTime && pinToConfirm !== null && prev.length === 0) {
        setPinToConfirm(null)
        setVaultError(null)
        return ""
      }
      return prev.slice(0, -1)
    })
  }

  // ─── Desbloqueo / Creación de vault ─────────────────────────────────────────
  const processUnlock = async (pin: string) => {
    if (isUnlocking) return
    setIsUnlocking(true)
    setVaultError(null)

    try {
      if (isFirstTime) {
        // Generar salt aleatorio y derivar clave
        const saltB64    = generateSalt()
        const saltBytes  = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
        const derivedKey = await deriveKeyFromPin(pin, saltBytes)
        const newToken   = await generateVerificationToken(derivedKey)

        await supabase
          .from("user_vault")
          .delete()
          .eq("user_id", session.user.id)

        const { error: dbError } = await supabase
          .from("user_vault")
          .insert({
            user_id:            session.user.id,
            verification_token: newToken,
            kdf_salt:           saltB64,
          })

        if (dbError) {
          if (dbError.code === "23505") {
            // Carrera: vault ya existe (raro, pero posible)
            const { data: existing } = await supabase
              .from("user_vault")
              .select("verification_token, kdf_salt")
              .eq("user_id", session.user.id)
              .maybeSingle()
            if (existing) {
                setVaultToken(existing.verification_token)
                setVaultSalt(existing.kdf_salt ?? null)
                setIsFirstTime(false)
                setVaultError(t("pin.errorVaultExists"))
              setPinInput("")
              setIsUnlocking(false)
              return
            }
          }
          throw new Error(t("pin.errorVaultSave"))
        }

        saveKey(derivedKey)
        if (biometricAvailable && !biometricEnabled) {
          setShowBiometricOffer(true)
        } else {
          onUnlocked()
        }

      } else if (vaultToken) {
        if (!vaultSalt) {
          // Vault antiguo sin salt (pre-migración) — no debería ocurrir tras el vaciado
          throw new Error(t("pin.errorVaultNoSalt"))
        }

        const saltBytes  = Uint8Array.from(atob(vaultSalt), c => c.charCodeAt(0))
        const derivedKey = await deriveKeyFromPin(pin, saltBytes)
        const valid      = await isKeyValid(derivedKey, vaultToken)

        if (valid) {
          clearLockout()
          setLockoutUntil(0)
          saveKey(derivedKey)
          onUnlocked()
        } else {
          triggerHaptic([50, 50, 50])
          const lockout = getLockout()
          const newAttempts = lockout.attempts + 1
          const waitMs = newAttempts >= MAX_ATTEMPTS
            ? Math.pow(2, newAttempts - MAX_ATTEMPTS) * 30000
            : 0
          const lockedUntil = waitMs > 0 ? Date.now() + waitMs : 0
          setLockout(newAttempts, lockedUntil)
          if (lockedUntil > 0) setLockoutUntil(lockedUntil)
          setVaultError(
            lockedUntil > 0
              ? t("pin.errorPinLocked", { seconds: Math.ceil(waitMs / 1000) })
              : t("pin.errorPinIncorrect")
          )
          setPinInput("")
        }
      }
    } catch (e: unknown) {
      console.error("processUnlock error:", e)
      setVaultError(e instanceof Error ? e.message : t("pin.errorSecurityGeneric"))
      setPinInput("")
    } finally {
      setIsUnlocking(false)
    }
  }

  // ─── Recuperación via email ──────────────────────────────────────────────────
  const handleRecovery = async () => {
    setRecoveryLoading(true)
    setVaultError(null)
  
    const resetToken = crypto.randomUUID()
    const expiresAt  = new Date(Date.now() + 1000 * 60 * 30).toISOString()
  
    const { error: tokenError } = await supabase
      .from("user_vault")
      .update({ reset_token: resetToken, reset_token_expires_at: expiresAt })
      .eq("user_id", session.user.id)
  
    if (tokenError) {
      setVaultError(t("pin.errorRecoveryGenerate"))
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
    else setVaultError(t("pin.errorRecoveryEmail"))
  }

  // ─── Biometría ───────────────────────────────────────────────────────────────
  const handleActivateBiometric = async () => {
    setBiometricLoading(true)
    setBiometricError(null)
    const ok = await saveBiometricKey(session.user.id)
    setBiometricLoading(false)
    if (ok) {
        setBiometricEnabled(true)
        onUnlocked()
      } else {
        setBiometricError(t("pin.biometricErrorActivate"))
      }
  }

  const handleRetryBiometric = async () => {
    setBiometricLoading(true)
    setBiometricError(null)
    const result = await loadBiometricKey(session.user.id)
    setBiometricLoading(false)
    if (result === 'ok') {
      onUnlocked()
    } else if (result === 'key_invalid') {
      clearBiometricKey()
      setBiometricEnabled(false)
      setBiometricError(t("pin.biometricErrorRetry"))
    } else {
      // user_cancel: el lector ha fallat, mostrar error lleu sense netejar res
      setBiometricError(t("pin.biometricErrorRetry"))
    }
  }

  // ─── Renders ────────────────────────────────────────────────────────────────
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
        <h2 className="text-xl font-bold text-zinc-100 mb-3">{t("pin.recoveryTitle")}</h2>

        {recoverySuccess ? (
          <div className="space-y-4 max-w-xs">
            <p className="text-zinc-400 text-sm leading-relaxed">
            {t.rich("pin.recoverySuccessIntro", { email: () => <strong className="text-zinc-200">{session.user.email}</strong> })}
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              {t("pin.recoverySuccessWarning")}
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {t("pin.recoverySuccessSignOut")}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-xs">
            <p className="text-zinc-400 text-sm leading-relaxed">
            {t.rich("pin.recoveryIntro", { email: () => <strong className="text-zinc-200">{session.user.email}</strong> })}
            </p>

            <div className="bg-yellow-950/30 border border-yellow-900/40 rounded-xl px-4 py-3 text-xs text-yellow-400/90 text-left">
              <strong className="font-semibold">{t("pin.recoveryWarningLabel")}</strong>{" "}
              {t("pin.recoveryWarning")}
            </div>

            {vaultError && (
              <p className="text-xs text-red-400 bg-red-950/30 rounded-xl px-4 py-3">
                {vaultError}
              </p>
            )}

            <button
              onClick={handleRecovery}
              disabled={recoveryLoading}
              className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {recoveryLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("common.sending")}</>
                : t("pin.recoverySendButton")
              }
            </button>
            <button
              onClick={() => { setShowRecovery(false); setVaultError(null) }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {t("pin.recoveryBackToPin")}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (showBiometricOffer) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center py-12 px-8 text-center gap-6">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
          <Lock className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-bold text-zinc-100">{t("pin.biometricOfferTitle")}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t("pin.biometricOfferDesc")}
          </p>
        </div>
        {biometricError && (
          <p className="text-xs text-red-400 bg-red-950/30 rounded-xl px-4 py-3 max-w-xs">
            {biometricError}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleActivateBiometric}
            disabled={biometricLoading}
            className="w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {biometricLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : t("pin.biometricActivate")
            }
          </button>
          <button
            onClick={onUnlocked}
            className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-all"
          >
            {t("pin.biometricSkip")}
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 max-w-xs">
          {t("pin.biometricSettingsHint")}
        </p>
      </div>
    )
  }

  if (biometricLoading && isFirstTime === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-zinc-500">{t("common.verifying")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-between py-12 px-8 text-center select-none overflow-hidden">
      <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${
          vaultError ? "bg-red-500/10" : "bg-emerald-500/10"
        }`}>
          <Lock className={`w-6 h-6 ${vaultError ? "text-red-400" : "text-emerald-400"}`} />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">
          {isFirstTime
            ? pinToConfirm !== null ? t("pin.titleConfirm") : t("pin.titleCreate")
            : t("pin.titleUnlock")
          }
        </h2>
        <p className="text-zinc-500 text-xs max-w-[240px] mx-auto leading-relaxed">
          {isFirstTime
            ? pinToConfirm !== null
              ? vaultError || t("pin.subtitleConfirm")
              : t("pin.subtitleCreate")
            : vaultError || t("pin.subtitleUnlock")
          }
        </p>
      </div>

      {/* Indicadores de dígitos */}
      <div className="flex gap-4 my-10" aria-label={t("pin.ariaPin")}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
              i < pinInput.length
                ? "bg-emerald-500 border-emerald-500 scale-125 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "border-zinc-800 bg-transparent"
            }`}
          />
        ))}
      </div>
      {/* Anuncio para screen readers - visualmente oculto */}
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {pinInput.length > 0 ? `${pinInput.length} de 6` : ""}
      </span>

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-6 max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        {["1","2","3","4","5","6","7","8","9"].map(num => (
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
          className="w-20 h-20 rounded-full bg-zinc-900/40 text-2xl font-light text-zinc-200 border border-zinc-800/50 active:bg-emerald-500/20 active:scale-90 transition-all flex items-center justify-center tabular-nums"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={isUnlocking || pinInput.length === 0}
          aria-label={t("pin.ariaDeleteDigit")}
          className="w-20 h-20 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 active:scale-75 transition-all"
        >
          <Delete className="w-7 h-7" />
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <EncryptionBadge />
        {!isFirstTime && biometricEnabled && (
          <button
            onClick={handleRetryBiometric}
            disabled={biometricLoading}
            className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] hover:text-zinc-300 transition-colors"
          >
            {biometricLoading ? t("pin.biometricVerifying") : t("pin.biometricUse")}
          </button>
        )}
        {biometricError && (
          <p className="text-xs text-red-400">{biometricError}</p>
        )}
        {!isFirstTime && (
          <button
            onClick={() => setShowRecovery(true)}
            className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] hover:text-zinc-400 transition-colors"
          >
            {t("pin.forgotPin")}
          </button>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors"
        >
          {t("pin.signOut")}
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