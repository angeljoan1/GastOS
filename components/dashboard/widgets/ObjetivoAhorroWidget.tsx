"use client"

import { PiggyBank } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"
import type { Objetivo } from "@/types"

interface Props {
  objetivoAhorro: Objetivo | undefined
  pctObjetivo: number | null
  balanceNeto: number
  onOpenSettings?: (tab: "categorias" | "presupuestos" | "objetivos" | "seguridad") => void
}

export default function ObjetivoAhorroWidget({
  objetivoAhorro, pctObjetivo, balanceNeto, onOpenSettings,
}: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetObjetivoLabel")}</p>
          </div>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        {!objetivoAhorro ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <PiggyBank className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noPresupuestos")}</p>
            <p className="text-xs text-zinc-700">{t("dashboard.noPresupuestosHint")}</p>
            {onOpenSettings && (
              <button
                onClick={() => onOpenSettings("objetivos")}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40"
              >
                {t("dashboard.configureNow")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t("dashboard.objetivoAhorroActual")}</p>
                <HidableAmount
                  value={Math.max(0, balanceNeto)}
                  className={`text-3xl font-light ${balanceNeto >= 0 ? "text-emerald-400" : "text-red-400"}`}
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 mb-1">{t("dashboard.objetivoMeta")}</p>
                <HidableAmount value={objetivoAhorro.cantidad} className="text-base font-medium text-zinc-300" />
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${(pctObjetivo ?? 0) >= 100 ? "bg-emerald-400" : (pctObjetivo ?? 0) >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${Math.max(0, pctObjetivo ?? 0)}%` }}
                role="progressbar"
                aria-valuenow={pctObjetivo ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                {(pctObjetivo ?? 0) >= 100 ? "🎉" : `${pctObjetivo ?? 0}%`}
              </p>
              {(pctObjetivo ?? 0) < 100 && (
                <HidableAmount
                  value={Math.max(0, objetivoAhorro.cantidad - balanceNeto)}
                  prefix={t("dashboard.objetivoFaltan")}
                  className="text-xs text-zinc-500"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
