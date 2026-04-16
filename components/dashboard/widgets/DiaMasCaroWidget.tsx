"use client"

import { CalendarDays } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  diaMasCaro: [string, number] | undefined
  totalGastos: number
  selectedYear: number
  selectedMonth: number
  locale: string
}

export default function DiaMasCaroWidget({ diaMasCaro, totalGastos, selectedYear, selectedMonth, locale }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetDiaMasCaroLabel")}</p>
          </div>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        {!diaMasCaro ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CalendarDays className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center flex-shrink-0">
              <p className="text-2xl font-bold text-red-400 tabular-nums leading-none">{diaMasCaro[0]}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                {new Date(selectedYear, selectedMonth, parseInt(diaMasCaro[0])).toLocaleDateString(locale, { weekday: "short" })}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 mb-1">{t("dashboard.gastoTotalDia")}</p>
              <HidableAmount value={diaMasCaro[1]} className="text-3xl font-light text-red-400" />
              <p className="text-xs text-zinc-600 mt-1">
                {((diaMasCaro[1] / totalGastos) * 100).toFixed(1)}{t("dashboard.pctGastoMensual")}
              </p>
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
