"use client"

import { Package } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts"
import { CHART_COLORS } from "@/components/dashboard/WidgetShared"
import type { Categoria } from "@/types"

interface Props {
  pieData: { name: string; value: number }[]
  categorias: Categoria[]
  onSelectCat: (id: string) => void
}

export default function DonutCategoriasWidget({ pieData, categorias, onSelectCat }: Props) {
  const t = useTranslations()
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{t("dashboard.sectionDonut")}</p>
      {pieData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Package className="w-8 h-8 text-zinc-700" aria-hidden="true" />
          <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
        </div>
      ) : (
        <>
          <div className="w-full h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={2} dataKey="value" stroke="none"
                  onClick={(entry) => entry?.name && onSelectCat(entry.name)}
                  style={{ cursor: "pointer" }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#f4f4f5" }}
                  formatter={(v, name) => [
                    `${Number(v ?? 0).toFixed(2)}€`,
                    categorias.find(c => c.id === String(name))?.label ?? String(name ?? ""),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {pieData.map((entry, i) => (
              <button
                key={entry.name}
                onClick={() => entry.name && onSelectCat(entry.name)}
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                aria-label={`${categorias.find(c => c.id === entry.name)?.label ?? entry.name}: ${entry.value.toFixed(2)}€`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="text-xs text-zinc-400">
                  {categorias.find(c => c.id === entry.name)?.label ?? entry.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
