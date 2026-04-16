"use client"

import { Target } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"
import type { Objetivo } from "@/types"

interface Props {
  objetivos: Objetivo[]
  totalGastos: number
  onOpenSettings?: (tab: "categorias" | "presupuestos" | "objetivos" | "seguridad") => void
}

export default function PresupuestoGlobalWidget({ objetivos, totalGastos, onOpenSettings }: Props) {
  const t = useTranslations()
  const objetivoGastoTotal = objetivos.find(o => o.tipo === "gasto_total")

  if (!objetivoGastoTotal) {
    return (
      <WidgetCard>
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetPresupuestoGlobalLabel")}</p>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Target className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noPresupuestos")}</p>
            {onOpenSettings && (
              <button
                onClick={() => onOpenSettings("objetivos")}
                className="mt-2 text-xs text-red-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                {t("dashboard.configureNow")}
              </button>
            )}
          </div>
        </div>
      </WidgetCard>
    )
  }

  const limit = objetivoGastoTotal.cantidad
  const pct = Math.min(Math.round((totalGastos / limit) * 100), 100)
  const restant = Math.max(0, limit - totalGastos)
  const superado = totalGastos > limit
  const cercano = !superado && pct >= 80
  const barColor = superado ? "#ef4444" : cercano ? "#f59e0b" : "#10b981"

  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetPresupuestoGlobalLabel")}</p>
          </div>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-1">{t("dashboard.sectionGastos")}</p>
            <HidableAmount value={totalGastos} className={`text-3xl font-light ${superado ? "text-red-400" : "text-zinc-100"}`} />
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">{t("dashboard.widgetPresupuestoGlobalLimit")}</p>
            <HidableAmount value={limit} className="text-base font-medium text-zinc-400" />
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold px-2 py-0.5 rounded-lg ${superado ? "bg-red-500/15 text-red-400" : cercano ? "bg-yellow-500/15 text-yellow-400" : "bg-emerald-500/15 text-emerald-400"}`}>
            {pct}%
          </span>
          {superado
            ? <HidableAmount value={totalGastos - limit} prefix={t("dashboard.widgetPresupuestoGlobalExceeded")} className="text-red-400 font-medium" />
            : <HidableAmount value={restant} prefix={t("dashboard.widgetPresupuestoGlobalLeft")} className="text-zinc-500" />
          }
        </div>
      </div>
    </WidgetCard>
  )
}
