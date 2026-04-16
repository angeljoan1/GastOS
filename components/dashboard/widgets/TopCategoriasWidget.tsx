"use client"

import { Package } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount, CHART_COLORS } from "@/components/dashboard/WidgetShared"
import { getIcon } from "@/lib/icons"
import type { Categoria } from "@/types"

interface Props {
  topCategorias: { name: string; value: number }[]
  maxTopVal: number
  categorias: Categoria[]
  onSelectCat: (id: string) => void
}

export default function TopCategoriasWidget({ topCategorias, maxTopVal, categorias, onSelectCat }: Props) {
  const t = useTranslations()
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetTopLabel")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        {topCategorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Package className="w-8 h-8 text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topCategorias.map((entry, i) => {
              const cat = categorias.find(c => c.id === entry.name)
              const CatIcon = getIcon(cat?.icono ?? "Package")
              const pct = Math.round((entry.value / maxTopVal) * 100)
              return (
                <button
                  key={entry.name}
                  onClick={() => onSelectCat(entry.name)}
                  className="w-full space-y-1.5 text-left hover:opacity-70 transition-opacity"
                  aria-label={`${cat?.label ?? entry.name}: ${entry.value.toFixed(2)}€`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CatIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm text-zinc-300 truncate">{cat?.label ?? entry.name}</span>
                    </div>
                    <HidableAmount value={entry.value} className="text-sm font-medium text-zinc-200" />
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
