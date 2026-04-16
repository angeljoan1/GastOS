"use client"

import { useTranslations } from "next-intl"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"

interface MonthData {
  month: string
  gastos: number
  ingresos: number
  balance: number
}

interface Props {
  last12Months: MonthData[]
}

export default function LineaGastosWidget({ last12Months }: Props) {
  const t = useTranslations()
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.widgetLineaLabel")}</p>
      <p className="text-xs text-zinc-600 mb-4">{t("dashboard.last12Months")}</p>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={last12Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
              itemStyle={{ color: "#f4f4f5" }}
              formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, t("dashboard.sectionGastos")]}
            />
            <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ef4444" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
