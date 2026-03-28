"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ShieldCheck, X } from "lucide-react"

export default function EncryptionBadge() {
  const [showInfo, setShowInfo]   = useState(false)
  const [mounted,  setMounted]    = useState(false)

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef     = useRef<HTMLButtonElement>(null)

  // Necesario para que createPortal funcione en SSR (Next.js)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (showInfo) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50)
      return () => clearTimeout(t)
    } else {
      triggerRef.current?.focus()
    }
  }, [showInfo])

  useEffect(() => {
    if (!showInfo) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfo(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showInfo])

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="e2ee-dialog-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={() => setShowInfo(false)}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-sm bg-zinc-900 border border-zinc-800/70 rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          </div>
          <button
            ref={closeButtonRef}
            onClick={() => setShowInfo(false)}
            aria-label="Cerrar información de seguridad"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          </button>
        </div>

        <h3 id="e2ee-dialog-title" className="text-base font-semibold text-zinc-100 mb-2">
          Encriptación de extremo a extremo
        </h3>

        <div className="space-y-3 text-sm text-zinc-400 leading-relaxed">
          <p>
            Tu PIN genera una clave criptográfica que nunca sale de tu dispositivo.
            Cantidades, notas, nombres de cuentas y presupuestos se cifran con ella
            antes de enviarse al servidor.
          </p>
          <p>
            Ni el servidor, ni los administradores, ni nadie con acceso a la base de
            datos puede leer tus datos financieros. Solo tu PIN los descifra.
          </p>
          <div className="bg-yellow-950/30 border border-yellow-900/40 rounded-xl px-4 py-3 text-xs text-yellow-400/90">
            <strong className="font-semibold">Importante:</strong> Si pierdes tu PIN,
            tus datos cifrados son irrecuperables. Guárdalo en un lugar seguro.
          </div>
        </div>

        <button
          onClick={() => setShowInfo(false)}
          className="w-full mt-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setShowInfo(true)}
        aria-label="Ver información de seguridad E2EE"
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-500 transition-colors opacity-60 hover:opacity-100"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" aria-hidden="true" />
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-[10px] font-medium tracking-wide hidden sm:inline">E2EE</span>
      </button>

      {/* Portal: el modal se monta directamente en document.body,
          fuera del stacking context del header */}
      {mounted && showInfo && createPortal(modal, document.body)}
    </>
  )
}