"use client"

import { useTranslations } from "next-intl"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"

interface MonthData {
  month: string
  gastos: number
  ingresos: number
  balance: number
}

interface Props {
  last6Months: MonthData[]
}

export default function Barras6MesesWidget({ last6Months }: Props) {
  const t = useTranslations()
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.sectionBarras")}</p>
      <div className="flex items-center gap-4 mb-4" aria-hidden="true">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-zinc-500">{t("dashboard.legendGastos")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-500">{t("dashboard.legendIngresos")}</span>
        </div>
      </div>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={last6Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
              itemStyle={{ color: "#f4f4f5" }}
              formatter={(v, name) => [`${Number(v ?? 0).toFixed(2)}€`, name === "gastos" ? t("dashboard.sectionGastos") : t("dashboard.sectionIngresos")]}
            />
            <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
