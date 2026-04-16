"use client"

import { Flame } from "lucide-react"
import { useTranslations } from "next-intl"

interface Props {
  rachaDias: number
  rachaTopCat: string
}

export default function RachaAhorroWidget({ rachaDias, rachaTopCat: _ }: Props) {
  const t = useTranslations()
  const colorOuter = rachaDias >= 7 ? "#10b981" : rachaDias >= 3 ? "#f59e0b" : "#71717a"
  const colorMid   = rachaDias >= 7 ? "#34d399" : rachaDias >= 3 ? "#fbbf24" : "#52525b"
  const colorInner = rachaDias >= 7 ? "#a7f3d0" : rachaDias >= 3 ? "#fde68a" : "#3f3f46"

  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg width="14" height="14" viewBox="0 0 14 18" aria-hidden="true">
          <g>
            <ellipse cx="7" cy="13" rx="5.5" ry="5" fill={colorOuter} />
            <path d="M7 2 C4 6 2 9 2 12 C2 15.3 4.2 17 7 17 C9.8 17 12 15.3 12 12 C12 9 10 6 7 2Z" fill={colorOuter} />
          </g>
          <g>
            <path d="M7 6 C5.5 8.5 4.5 10 4.5 12 C4.5 14 5.5 15.5 7 15.5 C8.5 15.5 9.5 14 9.5 12 C9.5 10 8.5 8.5 7 6Z" fill={colorMid} />
          </g>
          <g>
            <path d="M7 9 C6.2 10.5 6 11.2 6 12.2 C6 13.4 6.4 14.2 7 14.2 C7.6 14.2 8 13.4 8 12.2 C8 11.2 7.8 10.5 7 9Z" fill={colorInner} />
          </g>
        </svg>
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionRacha")}</p>
      </div>
      {rachaDias === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <Flame className="w-8 h-8 text-zinc-700" aria-hidden="true" />
          <p className="text-sm text-zinc-600">{t("dashboard.rachaNoActive")}</p>
          <p className="text-xs text-zinc-700">{t("dashboard.rachaNoActiveHint")}</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${rachaDias >= 7
            ? "bg-emerald-500/15 border border-emerald-500/30"
            : rachaDias >= 3
              ? "bg-yellow-500/15 border border-yellow-500/30"
              : "bg-zinc-800 border border-zinc-700"
            }`}>
            <p className={`text-3xl font-bold tabular-nums leading-none ${rachaDias >= 7 ? "text-emerald-400" : rachaDias >= 3 ? "text-yellow-400" : "text-zinc-400"}`}>
              {rachaDias}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{t("dashboard.rachaDias")}</p>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-zinc-200">
              {rachaDias >= 7 ? t("dashboard.rachaIncreible") : rachaDias >= 3 ? t("dashboard.rachaBuen") : t("dashboard.rachaEmpezando")}
            </p>
            <p className="text-xs text-zinc-500">{t("dashboard.rachaConsecut")}</p>
          </div>
        </div>
      )}
    </div>
  )
}
