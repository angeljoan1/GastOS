"use client"

import { TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  totalGastos: number
  totalIngresos: number
  balanceNeto: number
}

export default function ResumenMesWidget({ totalGastos, totalIngresos, balanceNeto }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionGastos")}</p>
            </div>
            <HidableAmount value={totalGastos} className="text-2xl font-light text-red-400" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionIngresos")}</p>
            </div>
            <HidableAmount value={totalIngresos} className="text-2xl font-light text-emerald-400" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionBalanceNeto")}</p>
            </div>
            <div className="flex items-center gap-2">
              <HidableAmount
                value={Math.abs(balanceNeto)}
                prefix={balanceNeto > 0 ? "+" : balanceNeto < 0 ? "-" : ""}
                className={`text-2xl font-light ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
              />
              <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
            </div>
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
