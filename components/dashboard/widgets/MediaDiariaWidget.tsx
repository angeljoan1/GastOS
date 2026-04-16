"use client"

import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  gastoDiario: number
  mediaDiariaAnt: number
  diffMedia: number
  diffPct: number
}

export default function MediaDiariaWidget({ gastoDiario, mediaDiariaAnt, diffMedia, diffPct }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionMediaDiaria")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <HidableAmount value={gastoDiario} className="text-4xl font-light text-zinc-100" />
            <p className="text-xs text-zinc-600">{t("dashboard.porDiaMes")}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-sm font-semibold tabular-nums px-2.5 py-1 rounded-lg ${diffMedia <= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}>
              {diffMedia > 0 ? "+" : ""}{diffPct}%
            </span>
            <p className="text-xs text-zinc-600">{t("dashboard.vsMesAnterior")}</p>
            <HidableAmount value={mediaDiariaAnt} suffix="€/día" className="text-xs text-zinc-700" />
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
