"use client"

import { Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  distribucionPct: number | null
  totalGastos: number
  totalIngresos: number
}

export default function DistribucionIngresoWidget({ distribucionPct, totalGastos, totalIngresos }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetDistribucionLabel")}</p>
          </div>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        {distribucionPct === null ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Wallet className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.ratioNoIncome")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className={`text-4xl font-light tabular-nums ${distribucionPct >= 100 ? "text-red-400" : distribucionPct >= 80 ? "text-yellow-400" : "text-emerald-400"}`}>
                  {distribucionPct}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">{t("dashboard.distribucionGastas")}</p>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-light tabular-nums ${distribucionPct >= 100 ? "text-zinc-600" : "text-emerald-400"}`}>
                  {Math.max(0, 100 - distribucionPct)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">{t("dashboard.distribucionAhorras")}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 text-center">
              {t("dashboard.widgetDistribucionDesc")}
            </p>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden flex">
              <div
                className={`h-full transition-all duration-700 ${distribucionPct >= 100 ? "bg-red-400" : distribucionPct >= 80 ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(distribucionPct, 100)}%` }}
              />
              <div
                className="h-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${Math.max(0, 100 - distribucionPct)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <HidableAmount value={totalGastos} prefix={t("dashboard.distribucionGastado")} className="text-xs text-zinc-500 flex-1" />
              <HidableAmount value={totalIngresos} prefix={t("dashboard.distribucionIngresado")} className="text-xs text-zinc-500 flex-1 text-right" />
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
