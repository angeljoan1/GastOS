'use client'

import { useState } from 'react'

export default function FeedbackWidget({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tipo, setTipo] = useState<'Bug' | 'Idea'>('Idea')
  const [mensaje, setMensaje] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mensaje.trim()) return
    
    setIsSubmitting(true)
    
    try {
      // Llamamos a nuestra nueva ruta de API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          tipo,
          mensaje
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          setIsOpen(false)
          setSuccess(false)
          setMensaje('')
        }, 3000)
      } else {
        alert("Hubo un problema al enviar el mensaje. Inténtalo de nuevo más tarde.")
      }
    } catch (error) {
      alert("Error de conexión al enviar el ticket.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Botón flotante cerrado
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-full shadow-lg border border-zinc-700 transition-all z-50 flex items-center justify-center"
        title="Enviar sugerencia o error"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
    )
  }

  // Modal del formulario abierto
  return (
    <div className="fixed bottom-6 right-6 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="bg-zinc-800 px-4 py-3 flex justify-between items-center border-b border-zinc-700">
        <h3 className="font-medium text-zinc-100">Buzón de Sugerencias</h3>
        <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      
      {success ? (
        <div className="p-6 text-center text-emerald-400">
          <p>¡Gracias por tu aportación!</p>
          <p className="text-xs mt-2 text-zinc-500">Tomamos nota para mejorar GastOS.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setTipo('Idea')}
              className={`flex-1 py-1 text-sm rounded-md transition-all ${tipo === 'Idea' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
            >
              💡 Idea
            </button>
            <button
              type="button"
              onClick={() => setTipo('Bug')}
              className={`flex-1 py-1 text-sm rounded-md transition-all ${tipo === 'Bug' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
            >
              🐛 Error
            </button>
          </div>
          
          <textarea
            required
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder={tipo === 'Idea' ? "¿Qué nueva función te gustaría ver?" : "¿Qué no funciona correctamente?"}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar ticket'}
          </button>
        </form>
      )}
    </div>
  )
}