"use client"

import { Target } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"
import { getIcon } from "@/lib/icons"
import type { Categoria, Presupuesto } from "@/types"

type PresupuestoConGasto = Presupuesto & { gastado: number; pct: number; cat: Categoria }

interface Props {
  presupuestosConGasto: PresupuestoConGasto[]
  onOpenSettings?: (tab: "categorias" | "presupuestos" | "objetivos" | "seguridad") => void
}

export default function PresupuestosWidget({ presupuestosConGasto, onOpenSettings }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionPresupuestosMes")}</p>
          </div>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        {presupuestosConGasto.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Target className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noPresupuestos")}</p>
            <p className="text-xs text-zinc-700">{t("dashboard.noPresupuestosHint")}</p>
            {onOpenSettings && (
              <button
                onClick={() => onOpenSettings("presupuestos")}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                {t("dashboard.configureNow")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {presupuestosConGasto.map(p => {
              const CatIcon = getIcon(p.cat.icono)
              const superado = p.gastado > p.cantidad
              const cercano = !superado && p.pct >= 80
              const barColor = superado ? "#ef4444" : cercano ? "#f59e0b" : "#10b981"
              return (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CatIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm text-zinc-300 truncate">{p.cat.label}</span>
                      {superado && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                          {t("dashboard.badgeSuperado")}
                        </span>
                      )}
                      {cercano && (
                        <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/15 px-1.5 py-0.5 rounded flex-shrink-0">
                          {t("dashboard.badgeAtencion")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs">
                      <HidableAmount
                        value={p.gastado}
                        className={superado ? "text-red-400 font-medium" : "text-zinc-300"}
                      />
                      <span className="text-zinc-600">/</span>
                      <HidableAmount value={p.cantidad} className="text-zinc-500" />
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.pct}%`, backgroundColor: barColor }}
                      role="progressbar"
                      aria-valuenow={Math.round(p.pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${p.cat.label}: ${Math.round(p.pct)}% del presupuesto utilizado`}
                    />
                  </div>
                  <p className="text-xs text-zinc-600 text-right tabular-nums">
                    {t("dashboard.pctUtilizado", { pct: Math.round(p.pct) })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
