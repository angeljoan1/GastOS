"use client"

// components/FeedbackWidget.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #13: El formulario no tenía aria-label → lector de pantalla anunciaba
//          "formulario" sin contexto.
//          FIX: añadimos aria-label al <form> y roles semánticos en los elementos.
// BUG #23: Al abrir el formulario, el botón flotante se desmontaba y al volver
//          a cerrarlo la posición de arrastre se perdía (volvía a {x:0, y:0}).
//          FIX: en lugar de renderizar alternativamente el botón O el modal,
//          mantenemos el botón siempre montado y solo mostramos/ocultamos el
//          panel del formulario. Así el estado de posición (pos) persiste.

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"

export default function FeedbackWidget({ userId }: { userId: string }) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [tipo,         setTipo]         = useState<"Bug" | "Idea">("Idea")
  const [mensaje,      setMensaje]      = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success,      setSuccess]      = useState(false)

  // Estado de arrastre del botón flotante
  const [pos,       setPos]       = useState({ x: 0, y: 0 })
  const [isDragging,setIsDragging]= useState(false)
  const [hasMoved,  setHasMoved]  = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const posStart  = useRef({ x: 0, y: 0 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mensaje.trim()) return
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? ""}` },
        body:    JSON.stringify({ userId, tipo, mensaje }),
      })
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          setIsOpen(false)
          setSuccess(false)
          setMensaje("")
        }, 3000)
      } else {
        alert("Hubo un problema al enviar el mensaje. Inténtalo de nuevo más tarde.")
      }
    } catch {
      alert("Error de conexión al enviar el ticket.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Handlers de arrastre ──────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    // Si el panel está abierto no arrastramos
    if (isOpen) return
    setIsDragging(true)
    setHasMoved(false)
    dragStart.current = { x: e.clientX, y: e.clientY }
    posStart.current  = { ...pos }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setHasMoved(true)
    setPos({ x: posStart.current.x + dx, y: posStart.current.y + dy })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleClick = () => {
    // Solo abrir si no fue un arrastre
    if (!hasMoved) setIsOpen(true)
  }

  return (
    <>
      {/* BUG #23 FIX: el botón flotante siempre está montado.
          Su visibilidad se gestiona con opacity/pointer-events para que
          la posición de arrastre (pos) persista entre aperturas del formulario. */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        aria-label="Abrir buzón de sugerencias"
        aria-expanded={isOpen}
        style={{
          transform:      `translate(${pos.x}px, ${pos.y}px)`,
          opacity:        isOpen ? 0 : undefined,
          pointerEvents:  isOpen ? "none" : undefined,
        }}
        className="fixed bottom-24 right-6 bg-zinc-800 text-zinc-300 p-3 rounded-full shadow-lg border border-zinc-700 transition-opacity duration-300 opacity-50 hover:opacity-100 z-50 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        title="Enviar sugerencia o error"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24" height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Panel del formulario — se muestra/oculta independientemente del botón */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="bg-zinc-800 px-4 py-3 flex justify-between items-center border-b border-zinc-700">
            <h3 id="feedback-title" className="font-medium text-zinc-100">
              Buzón de Sugerencias
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar buzón de sugerencias"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20" height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6"  y2="18" />
                <line x1="6"  y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="p-6 text-center text-emerald-400" role="status">
              <p>¡Gracias por tu aportación!</p>
              <p className="text-xs mt-2 text-zinc-500">Tomamos nota para mejorar GastOS.</p>
            </div>
          ) : (
            // BUG #13 FIX: aria-label en el formulario
            <form
              onSubmit={handleSubmit}
              className="p-4 flex flex-col gap-4"
              aria-label="Formulario de sugerencias y errores"
            >
              <div
                className="flex gap-2 bg-zinc-950 p-1 rounded-lg"
                role="group"
                aria-label="Tipo de mensaje"
              >
                <button
                  type="button"
                  onClick={() => setTipo("Idea")}
                  aria-pressed={tipo === "Idea"}
                  className={`flex-1 py-1 text-sm rounded-md transition-all ${
                    tipo === "Idea" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  💡 Idea
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("Bug")}
                  aria-pressed={tipo === "Bug"}
                  className={`flex-1 py-1 text-sm rounded-md transition-all ${
                    tipo === "Bug" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  🐛 Error
                </button>
              </div>

              <div>
                <label htmlFor="feedback-mensaje" className="sr-only">
                  {tipo === "Idea"
                    ? "¿Qué nueva función te gustaría ver?"
                    : "¿Qué no funciona correctamente?"
                  }
                </label>
                <textarea
                  id="feedback-mensaje"
                  required
                  rows={4}
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  placeholder={
                    tipo === "Idea"
                      ? "¿Qué nueva función te gustaría ver?"
                      : "¿Qué no funciona correctamente?"
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Enviando..." : "Enviar ticket"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}