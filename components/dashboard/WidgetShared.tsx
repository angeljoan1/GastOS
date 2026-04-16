"use client"

// components/dashboard/WidgetShared.tsx
// Componentes de UI compartidos entre widgets del dashboard.

import { createContext, useContext, useRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

// ── Constantes ────────────────────────────────────────────────────────────────
export const CHART_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b", "#10b981",
]

export function heatColor(intensity: number): string {
  if (intensity === 0) return "#18181b"
  if (intensity < 0.4) return `rgba(251,191,36,${0.15 + intensity * 0.5})`
  if (intensity < 0.75) return `rgba(249,115,22,${0.2 + intensity * 0.4})`
  return `rgba(239,68,68,${0.25 + intensity * 0.45})`
}

// ── Widget visibility context ─────────────────────────────────────────────────
export const WidgetHiddenCtx = createContext<{ hidden: boolean; toggle: () => void; contentId: string }>({
  hidden: true,
  toggle: () => { },
  contentId: "",
})

export function WidgetCard({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true)
  const contentId = useRef(`widget-content-${Math.random().toString(36).slice(2, 9)}`).current
  return (
    <WidgetHiddenCtx.Provider value={{ hidden, toggle: () => setHidden(h => !h), contentId }}>
      {children}
    </WidgetHiddenCtx.Provider>
  )
}

export function WidgetEyeButton({ labelShow, labelHide }: { labelShow: string; labelHide: string }) {
  const { hidden, toggle, contentId } = useContext(WidgetHiddenCtx)
  return (
    <button
      onClick={toggle}
      aria-pressed={!hidden}
      aria-controls={contentId}
      aria-label={hidden ? labelShow : labelHide}
      className="text-zinc-600 hover:text-zinc-400 transition-colors"
    >
      {hidden
        ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
        : <Eye className="w-3.5 h-3.5" aria-hidden="true" />
      }
    </button>
  )
}

export function HidableAmount({
  value, className = "", prefix = "", suffix = "€", decimals = 2,
}: {
  value: number; className?: string; prefix?: string
  suffix?: string; decimals?: number
}) {
  const { hidden } = useContext(WidgetHiddenCtx)
  const fmt = value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span className={`tabular-nums ${className}`}>
      {hidden ? "••••••" : `${prefix}${fmt}${suffix}`}
    </span>
  )
}
