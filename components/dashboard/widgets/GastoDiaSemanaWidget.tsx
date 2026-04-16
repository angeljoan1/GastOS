"use client"

import { BarChart2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import type { Movimiento } from "@/types"

interface DowData {
  dia: string
  gasto: number
}

interface Props {
  monthGastos: Movimiento[]
  dowData: DowData[]
  maxGastoDow: number
}

export default function GastoDiaSemanaWidget({ monthGastos, dowData, maxGastoDow }: Props) {
  const t = useTranslations()
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{t("dashboard.widgetGastoDiaLabel")}</p>
      {monthGastos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <BarChart2 className="w-8 h-8 text-zinc-700" aria-hidden="true" />
          <p className="text-sm text-zinc-600">{t("dashboard.noExpensesMonth")}</p>
        </div>
      ) : (
        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={dowData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }} barCategoryGap="20%">
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "#f4f4f5" }}
                formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, "Gasto"]}
              />
              <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
                {dowData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.gasto >= maxGastoDow * 0.8 ? "#ef4444" : entry.gasto >= maxGastoDow * 0.5 ? "#f97316" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-zinc-700 mt-2 text-center">{t("dashboard.acumuladoMesDia")}</p>
    </div>
  )
}
