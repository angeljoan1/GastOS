"use client"

import { useTranslations } from "next-intl"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

export default function AreaBalanceWidget({ last12Months }: Props) {
  const t = useTranslations()
  return (
    <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t("dashboard.widgetAreaLabel")}</p>
      <p className="text-xs text-zinc-600 mb-4">{t("dashboard.last12Months")}</p>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={last12Months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `${v}€`} />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", fontSize: "12px" }}
              itemStyle={{ color: "#f4f4f5" }}
              formatter={(v) => [`${Number(v ?? 0).toFixed(2)}€`, t("dashboard.sectionBalanceNeto")]}
            />
            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fill="url(#balanceGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
