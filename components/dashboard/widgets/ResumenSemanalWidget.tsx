"use client"

import { CalendarDays } from "lucide-react"
import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"
import type { Movimiento, Categoria, Presupuesto } from "@/types"

type PresupuestoConGasto = Presupuesto & { gastado: number; pct: number; cat: Categoria }

interface Props {
  recientes: Movimiento[]
  categorias: Categoria[]
  presupuestosConGasto: PresupuestoConGasto[]
  esMesActual: boolean
}

export default function ResumenSemanalWidget({
  recientes, categorias, presupuestosConGasto, esMesActual,
}: Props) {
  const t = useTranslations()

  const semanaActual = recientes.filter(m => {
    const d = new Date(m.created_at)
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)
    return d >= hace7 && (m.tipo ?? "gasto") === "gasto"
  })
  const semanaAnterior = recientes.filter(m => {
    const d = new Date(m.created_at)
    const hace14 = new Date(); hace14.setDate(hace14.getDate() - 14)
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)
    return d >= hace14 && d < hace7 && (m.tipo ?? "gasto") === "gasto"
  })
  const totalSemana = semanaActual.reduce((a, m) => a + m.cantidad, 0)
  const totalSemanaAnt = semanaAnterior.reduce((a, m) => a + m.cantidad, 0)
  const diffSem = totalSemana - totalSemanaAnt
  const diffSemPct = totalSemanaAnt > 0 ? Math.round((diffSem / totalSemanaAnt) * 100) : null

  const catSemana = semanaActual.reduce((acc, m) => {
    acc[m.categoria] = (acc[m.categoria] ?? 0) + m.cantidad
    return acc
  }, {} as Record<string, number>)
  const topCatSemana = Object.entries(catSemana).sort(([, a], [, b]) => b - a)[0]
  const topCatLabel = topCatSemana
    ? (categorias.find(c => c.id === topCatSemana[0])?.label ?? topCatSemana[0])
    : null

  const presupuestoAlerta = presupuestosConGasto.find(p => p.pct >= 80 && esMesActual)

  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.widgetResumenSemanalLabel")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-1">{t("dashboard.semanalGastosSemana")}</p>
            <HidableAmount value={totalSemana} className="text-2xl font-light text-red-400" />
          </div>
          {diffSemPct !== null && (
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg tabular-nums ${diffSem <= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
              {diffSem > 0 ? "+" : ""}{diffSemPct}%
            </span>
          )}
        </div>
        {topCatLabel && (
          <p className="text-xs text-zinc-500">
            {t("dashboard.semanalTopCategoria")}: <span className="text-zinc-300 font-medium">{topCatLabel}</span>
          </p>
        )}
        {presupuestoAlerta && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-yellow-400">
              {t("dashboard.semanalAlertaPresupuesto", { cat: presupuestoAlerta.cat.label, pct: Math.round(presupuestoAlerta.pct) })}
            </p>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
