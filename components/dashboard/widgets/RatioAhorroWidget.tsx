"use client"

import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  ratioAhorro: number | null
  ratioColor: string
  ratioLabel: string
  totalGastos: number
  totalIngresos: number
  balanceNeto: number
}

export default function RatioAhorroWidget({
  ratioAhorro, ratioColor, ratioLabel, totalGastos, totalIngresos, balanceNeto,
}: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionRatioAhorro")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 flex-shrink-0" role="img" aria-label={`Ratio de ahorro: ${ratioAhorro ?? 0}%`}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#27272a" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="38" fill="none"
                stroke={
                  ratioAhorro === null ? "#27272a"
                    : ratioAhorro >= 20 ? "#10b981"
                      : ratioAhorro >= 5 ? "#f59e0b"
                        : "#ef4444"
                }
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - Math.max(0, Math.min(100, ratioAhorro ?? 0)) / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className={`text-xl font-semibold tabular-nums ${ratioColor}`}>
                {ratioAhorro === null ? "—" : `${Math.max(0, ratioAhorro)}%`}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <p className={`text-sm font-medium leading-tight ${ratioColor}`}>{ratioLabel}</p>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs gap-2">
                <span className="text-zinc-600 flex-shrink-0">{t("dashboard.sectionIngresosTotales")}</span>
                <HidableAmount value={totalIngresos} className="text-zinc-400" />
              </div>
              <div className="flex justify-between items-center text-xs gap-2">
                <span className="text-zinc-600 flex-shrink-0">{t("dashboard.sectionGastosTotales")}</span>
                <HidableAmount value={totalGastos} className="text-zinc-400" />
              </div>
              <div className="flex justify-between items-center text-xs gap-2 pt-1.5 border-t border-zinc-800">
                <span className="text-zinc-500 flex-shrink-0">{t("dashboard.sectionAhorroNeto")}</span>
                <HidableAmount
                  value={Math.abs(balanceNeto)}
                  prefix={balanceNeto >= 0 ? "+" : "-"}
                  className={`font-medium ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-700 mt-4 text-center">
          {t("dashboard.objetivoRecomendado")}
        </p>
      </div>
    </WidgetCard>
  )
}
