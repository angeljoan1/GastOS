export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-zinc-950 text-zinc-100 gap-4 px-6 text-center">
      <span className="text-5xl">📡</span>
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-zinc-400 max-w-xs">
        GastOS necesita conexión para descifrar tus datos. Conéctate a internet e inténtalo de nuevo.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-3 bg-emerald-500 text-zinc-950 font-semibold rounded-xl text-sm hover:bg-emerald-400 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
