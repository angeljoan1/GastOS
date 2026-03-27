"use client"

import { useState, useRef } from "react"
import { X, Upload, AlertTriangle, CheckCircle2, Loader2, FileText, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Categoria, Cuenta } from "@/types"

interface FilaParseada {
  index:      number
  fecha:      string
  tipo:       string
  categoria:  string
  cantidad:   number
  nota:       string
  cuenta_id:  string | null
  valida:     boolean
  error?:     string
}

export default function ImportCSVModal({
  isOpen, onClose, categorias, cuentas,
}: {
  isOpen:     boolean
  onClose:    () => void
  categorias: Categoria[]
  cuentas:    Cuenta[]
}) {
  const [filas,       setFilas]       = useState<FilaParseada[]>([])
  const [importing,   setImporting]   = useState(false)
  const [imported,    setImported]    = useState(false)
  const [step,        setStep]        = useState<"upload" | "preview" | "done">("upload")
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleReset = () => {
    setFilas([]); setStep("upload"); setImported(false); setErrorGlobal(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleClose = () => { handleReset(); onClose() }

  // ── Parseo del CSV ─────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorGlobal(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return

      // Detectar separador: coma o punto y coma (Excel europeo)
      const lineas = text.replace(/\r/g, "").split("\n").filter(l => l.trim())
      if (lineas.length < 2) { setErrorGlobal("El archivo está vacío o no tiene datos."); return }

      const sep       = lineas[0].includes(";") ? ";" : ","
      const cabeceras = lineas[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""))

      // Detectar columnas — somos flexibles con el orden
      const iID       = cabeceras.indexOf("id")
      const iFecha    = cabeceras.findIndex(h => h.includes("fecha"))
      const iTipo     = cabeceras.findIndex(h => h.includes("tipo"))
      const iCat      = cabeceras.findIndex(h => h.includes("categor"))
      const iCantidad = cabeceras.findIndex(h => h.includes("cantidad") || h.includes("importe"))
      const iNota     = cabeceras.findIndex(h => h.includes("nota") || h.includes("descripci"))
      const iCuenta   = cabeceras.findIndex(h => h.includes("cuenta"))

      if (iCantidad === -1 || iCat === -1) {
        setErrorGlobal("No se encontraron las columnas 'Categoria' y 'Cantidad'. ¿Es un CSV exportado desde GastOS?")
        return
      }

      const parsed: FilaParseada[] = lineas.slice(1).map((linea, idx) => {
        const cols     = linea.split(sep).map(c => c.trim().replace(/^"|"$/g, ""))
        const cantidad = parseFloat(cols[iCantidad]?.replace(",", ".") ?? "")
        const tipo     = (iTipo !== -1 ? cols[iTipo] : "gasto").toLowerCase()
        const catRaw   = iCat !== -1 ? cols[iCat] : ""
        const fechaRaw = iFecha !== -1 ? cols[iFecha] : ""
        const nota     = iNota !== -1 ? cols[iNota] ?? "" : ""

        // Buscar cuenta por id o por nombre
        const cuentaRaw = iCuenta !== -1 ? cols[iCuenta] ?? "" : ""
        const cuenta    = cuentas.find(c => c.id === cuentaRaw || c.nombre.toLowerCase() === cuentaRaw.toLowerCase())

        // Validaciones
        if (isNaN(cantidad) || cantidad <= 0) {
          return { index: idx + 2, fecha: fechaRaw, tipo, categoria: catRaw, cantidad: 0, nota, cuenta_id: null, valida: false, error: "Cantidad inválida" }
        }
        if (!["gasto", "ingreso", "transferencia"].includes(tipo)) {
          return { index: idx + 2, fecha: fechaRaw, tipo, categoria: catRaw, cantidad, nota, cuenta_id: null, valida: false, error: `Tipo desconocido: "${tipo}"` }
        }

        // Intentar parsear fecha
        let fechaISO = new Date().toISOString()
        if (fechaRaw) {
          const d = new Date(fechaRaw)
          if (!isNaN(d.getTime())) fechaISO = d.toISOString()
        }

        return {
          index:     idx + 2,
          fecha:     fechaISO,
          tipo,
          categoria: catRaw,
          cantidad,
          nota,
          cuenta_id: cuenta?.id ?? null,
          valida:    true,
        }
      }).filter(f => f.tipo !== "" || f.cantidad > 0) // ignorar líneas completamente vacías

      setFilas(parsed)
      setStep("preview")
    }
    reader.readAsText(file, "UTF-8")
  }

  const eliminarFila = (index: number) => setFilas(prev => prev.filter(f => f.index !== index))

  // ── Importación a Supabase ─────────────────────────────────────────────────
  const handleImport = async () => {
    const validas = filas.filter(f => f.valida)
    if (validas.length === 0) return
    setImporting(true); setErrorGlobal(null)

    const rows = validas.map(f => ({
      cantidad:    f.cantidad,
      categoria:   f.categoria || "Otros",
      nota:        f.nota || null,
      tipo:        f.tipo,
      cuenta_id:   f.cuenta_id,
      created_at:  f.fecha,
      is_recurring: false,
    }))

    // Insertar en batches de 50 para no saturar
    const BATCH = 50
    let errorOcurrido = false
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase.from("movimientos").insert(rows.slice(i, i + BATCH))
      if (error) { setErrorGlobal(`Error en lote ${Math.floor(i / BATCH) + 1}: ${error.message}`); errorOcurrido = true; break }
    }

    setImporting(false)
    if (!errorOcurrido) { setImported(true); setStep("done") }
  }

  const validas   = filas.filter(f => f.valida)
  const invalidas = filas.filter(f => !f.valida)

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Importar CSV</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* ── STEP: Upload ─────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-5">
            <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-2xl p-4 space-y-2">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Formato aceptado</p>
              <p className="text-xs text-zinc-500">CSV con columnas: <span className="text-zinc-300 font-mono">Fecha, Tipo, Categoria, Cantidad, Nota, Cuenta</span></p>
              <p className="text-xs text-zinc-500">Compatible con el CSV exportado por GastOS y con separador <span className="font-mono text-zinc-300">,</span> o <span className="font-mono text-zinc-300">;</span></p>
            </div>

            {errorGlobal && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {errorGlobal}
              </div>
            )}

            <label className="flex flex-col items-center justify-center gap-3 w-full py-10 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-zinc-600" />
              <span className="text-sm text-zinc-500">Pulsa para seleccionar un archivo .csv</span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {/* ── STEP: Preview ────────────────────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3 text-center">
                <p className="text-2xl font-light text-emerald-400">{validas.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">filas válidas</p>
              </div>
              <div className={`rounded-xl p-3 text-center border ${invalidas.length > 0 ? "bg-red-950/30 border-red-900/40" : "bg-zinc-800/50 border-zinc-700/40"}`}>
                <p className={`text-2xl font-light ${invalidas.length > 0 ? "text-red-400" : "text-zinc-600"}`}>{invalidas.length}</p>
                <p className="text-xs text-zinc-500 mt-0.5">filas con error</p>
              </div>
            </div>

            {errorGlobal && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">
                {errorGlobal}
              </div>
            )}

            {/* Lista de filas */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filas.map(f => (
                <div key={f.index}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-xs ${
                    f.valida
                      ? "bg-zinc-800/60 border-zinc-700/50"
                      : "bg-red-950/20 border-red-900/40"
                  }`}>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold px-1.5 py-0.5 rounded ${
                        f.tipo === "ingreso" ? "bg-emerald-500/15 text-emerald-400"
                        : f.tipo === "transferencia" ? "bg-blue-500/15 text-blue-400"
                        : "bg-red-500/15 text-red-400"
                      }`}>{f.tipo}</span>
                      <span className="text-zinc-300 font-medium">{f.cantidad.toFixed(2)}€</span>
                      <span className="text-zinc-500 truncate">{f.categoria}</span>
                    </div>
                    {f.nota && <p className="text-zinc-600 truncate">{f.nota}</p>}
                    {!f.valida && <p className="text-red-400">{f.error}</p>}
                  </div>
                  <button onClick={() => eliminarFila(f.index)}
                    className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleReset}
                className="flex-1 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all">
                Cambiar archivo
              </button>
              <button onClick={handleImport} disabled={importing || validas.length === 0}
                className="flex-1 py-3 text-sm bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                  : <><FileText className="w-4 h-4" /> Importar {validas.length} filas</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Done ───────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
            <div>
              <p className="text-lg font-semibold text-zinc-100">{validas.length} movimientos importados</p>
              <p className="text-sm text-zinc-500 mt-1">Ve al Historial para verlos.</p>
            </div>
            <button onClick={handleClose}
              className="mt-2 w-full py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}