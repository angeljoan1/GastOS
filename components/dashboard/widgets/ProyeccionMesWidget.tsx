"use client"

import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"

interface Props {
  diaActual: number
  diasEnMes: number
  diasRestantes: number
  pctMes: number
  gastoDiario: number
  gastoProyectado: number
  ahorroProyectado: number
  totalIngresos: number
}

export default function ProyeccionMesWidget({
  diaActual, diasEnMes, diasRestantes, pctMes,
  gastoDiario, gastoProyectado, ahorroProyectado, totalIngresos,
}: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionProyeccion")}</p>
          <div className="flex items-center gap-2">
            <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
            <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-1 rounded-lg tabular-nums">
              {t("dashboard.dayProgress", { current: diaActual, total: diasEnMes })}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/50 transition-all duration-700"
              style={{ width: `${pctMes}%` }}
              role="progressbar"
              aria-valuenow={pctMes}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pctMes}% del mes transcurrido`}
            />
          </div>
          <p className="text-xs text-zinc-600">
            {t("dashboard.pctMes", { pct: pctMes, days: diasRestantes })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-zinc-500">{t("dashboard.gastoDiarioMedio")}</p>
            <HidableAmount value={gastoDiario} className="text-lg font-light text-zinc-200" />
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-zinc-500">{t("dashboard.gastoProyectado")}</p>
            <HidableAmount value={gastoProyectado} className="text-lg font-light text-red-400" />
          </div>
        </div>
        <div className={`rounded-xl p-4 flex items-center justify-between border ${ahorroProyectado >= 0
          ? "bg-emerald-500/8 border-emerald-500/20"
          : "bg-red-500/8 border-red-500/20"
          }`}>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5 font-medium">{t("dashboard.ahorroEstimado")}</p>
            <p className="text-xs text-zinc-600">{t("dashboard.ahorroRitmoActual")}</p>
          </div>
          <HidableAmount
            value={Math.abs(ahorroProyectado)}
            prefix={ahorroProyectado >= 0 ? "+" : "-"}
            className={`text-2xl font-light ${ahorroProyectado >= 0 ? "text-emerald-400" : "text-red-400"}`}
          />
        </div>
        {totalIngresos === 0 && (
          <p className="text-xs text-zinc-600 text-center">
            {t("dashboard.noIncomesForProjection")}
          </p>
        )}
      </div>
    </WidgetCard>
  )
}
