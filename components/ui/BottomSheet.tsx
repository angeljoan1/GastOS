"use client"

import { X } from "lucide-react"
import { getIcon } from "@/lib/icons"

export interface SheetOption {
  value: string
  label: string
  icono?: string
  color?: string
  sublabel?: string
  tipo?: "gasto" | "ingreso" | "ambos" | "transferencia"
}

function iconColor(opt: SheetOption): string {
  if (opt.color) return opt.color
  if (opt.tipo === "ingreso")      return "#10b981"
  if (opt.tipo === "gasto")        return "#ef4444"
  if (opt.tipo === "transferencia") return "#3b82f6"
  return "#71717a" // ambos / sin tipo
}

export default function BottomSheet({ isOpen, onClose, title, options, value, onChange }: {
  isOpen: boolean
  onClose: () => void
  title: string
  options: SheetOption[]
  value: string
  onChange: (value: string) => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-2">
          {options.map(opt => {
            const selected = value === opt.value
            const Icon = opt.icono ? getIcon(opt.icono) : null
            return (
              <button key={opt.value} onClick={() => { onChange(opt.value); onClose() }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
                  selected
                    ? "border-emerald-500/50 bg-emerald-950/30"
                    : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                }`}>
 {Icon && (
  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
    style={{ backgroundColor: iconColor(opt) + "22" }}>
    <Icon className="w-4 h-4" style={{ color: iconColor(opt) }} />
  </div>
)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${selected ? "text-emerald-400" : "text-zinc-200"}`}>{opt.label}</p>
                  {opt.sublabel && <p className="text-xs text-zinc-500 mt-0.5">{opt.sublabel}</p>}
                </div>
                {selected && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function SheetTrigger({ label, sublabel, icono, color, onClick, placeholder }: {
  label?: string; sublabel?: string; icono?: string; color?: string
  onClick: () => void; placeholder: string
}) {
  const Icon = icono ? getIcon(icono) : null
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 transition-all hover:border-zinc-600 text-left">
      {Icon && label && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: (color ?? "#10b981") + "22" }}>
          <Icon className="w-4 h-4" style={{ color: color ?? "#10b981" }} />
        </div>
      )}
      <span className={`flex-1 text-sm ${label ? "text-zinc-200" : "text-zinc-500"}`}>
        {label ?? placeholder}
      </span>
      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}