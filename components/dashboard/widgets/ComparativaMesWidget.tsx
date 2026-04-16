"use client"

import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  totalGastos: number
  totalIngresos: number
  gastoPrevMes: number
  ingPrevMes: number
  diffGastoMes: number
  diffIngMes: number
}

export default function ComparativaMesWidget({
  totalGastos, totalIngresos, gastoPrevMes, ingPrevMes, diffGastoMes, diffIngMes,
}: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetComparativaLabel")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="space-y-3">
          {[
            { label: t("dashboard.sectionGastos"), actual: totalGastos, prev: gastoPrevMes, diff: diffGastoMes, colorActual: "text-red-400", invertir: true },
            { label: t("dashboard.sectionIngresos"), actual: totalIngresos, prev: ingPrevMes, diff: diffIngMes, colorActual: "text-emerald-400", invertir: false },
          ].map(({ label, actual, prev, diff, colorActual, invertir }) => {
            const mejor = invertir ? diff <= 0 : diff >= 0
            return (
              <div key={label} className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
                <div className="flex items-end justify-between gap-2">
                  <HidableAmount value={actual} className={`text-2xl font-light ${colorActual}`} />
                  <div className="flex flex-col items-end gap-0.5">
                    <HidableAmount
                      value={Math.abs(diff)}
                      prefix={diff > 0 ? "+" : diff < 0 ? "-" : ""}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-lg tabular-nums ${mejor ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}
                    />
                    <p className="text-[10px] text-zinc-600">vs <HidableAmount value={prev} className="text-zinc-600" /></p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </WidgetCard>
  )
}
