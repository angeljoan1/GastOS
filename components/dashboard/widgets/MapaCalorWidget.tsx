"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { heatColor } from "@/components/dashboard/WidgetShared"

interface Props {
  gastoPorDia: Record<number, number>
  maxGastoDia: number
  diasGrid: (number | null)[]
  DIAS_SEMANA: string[]
  monthLabel: string
  esMesActual: boolean
  selectedYear: number
  selectedMonth: number
}

export default function MapaCalorWidget({
  gastoPorDia, maxGastoDia, diasGrid, DIAS_SEMANA, monthLabel, esMesActual,
  selectedYear, selectedMonth,
}: Props) {
  const t = useTranslations()
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const hoy = new Date()

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionMapaCalor")}</p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="text-xs text-zinc-600">{t("dashboard.heatLow")}</span>
          <div className="flex gap-0.5">
            {[0.1, 0.35, 0.6, 0.85, 1].map(v => (
              <span key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(v) }} />
            ))}
          </div>
          <span className="text-xs text-zinc-600">{t("dashboard.heatHigh")}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
        {DIAS_SEMANA.map((d, i) => (
          <p key={i} className="text-center text-[10px] text-zinc-600 font-medium">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t("dashboard.ariaHeatMap")}>
        {diasGrid.map((dia, i) => {
          if (dia === null) return <div key={`e-${i}`} role="gridcell" />
          const gasto = gastoPorDia[dia] ?? 0
          const intensity = gasto > 0 ? Math.min(gasto / maxGastoDia, 1) : 0
          const esHoy = esMesActual && dia === hoy.getDate()
          const esFuturo = esMesActual && dia > hoy.getDate()
          return (
            <div
              key={dia}
              role="gridcell"
              aria-label={t("dashboard.ariaDay", { day: dia, amount: gasto > 0 ? `${gasto.toFixed(2)}€` : t("dashboard.ariaDayNoExpense") })}
              tabIndex={esFuturo ? -1 : 0}
              onMouseEnter={() => setHoveredDay(dia)}
              onMouseLeave={() => setHoveredDay(null)}
              onFocus={() => setHoveredDay(dia)}
              onBlur={() => setHoveredDay(null)}
              className={`aspect-square rounded-md flex items-center justify-center transition-all duration-200 relative cursor-default ${esHoy ? "ring-1 ring-emerald-500/70" : ""
                } ${esFuturo ? "opacity-25" : ""}`}
              style={{ backgroundColor: esFuturo ? "#18181b" : heatColor(intensity) }}
            >
              <span className={`text-[10px] font-medium select-none ${esHoy ? "text-emerald-300 font-bold" : gasto > 0 ? "text-white/80" : "text-zinc-600"
                }`}>
                {dia}
              </span>
              {esHoy && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
              {hoveredDay === dia && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-center whitespace-nowrap shadow-xl">
                    <p className="text-xs font-semibold text-zinc-200">
                      {gasto > 0 ? `${gasto.toFixed(2)}€` : t("dashboard.noExpensesMonth")}
                    </p>
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent",
                        borderTop: "4px solid #3f3f46",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs text-zinc-700">
        <span className="capitalize">{monthLabel}</span>
        {Object.keys(gastoPorDia).length > 0 && (
          <span>{t("dashboard.heatPicoDia", { amount: maxGastoDia.toFixed(2) })}</span>
        )}
      </div>
    </div>
  )
}
