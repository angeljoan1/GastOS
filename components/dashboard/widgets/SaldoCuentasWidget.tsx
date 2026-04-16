"use client"

import { useTranslations } from "next-intl"
import { WidgetCard, WidgetEyeButton, HidableAmount } from "@/components/dashboard/WidgetShared"
import { getIcon } from "@/lib/icons"
import type { SaldoCuenta } from "@/types"

interface Props {
  saldos: SaldoCuenta[]
  patrimonioTotal: number
}

export default function SaldoCuentasWidget({ saldos, patrimonioTotal }: Props) {
  const t = useTranslations()
  if (saldos.length === 0) return null
  return (
    <WidgetCard>
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionSaldoCuenta")}</p>
          <WidgetEyeButton labelShow={t("dashboard.showAmounts")} labelHide={t("dashboard.hideAmounts")} />
        </div>
        <div className="space-y-3">
          {saldos.map(({ cuenta, saldo_actual }) => {
            const CIcon = getIcon(cuenta.icono)
            return (
              <div key={cuenta.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cuenta.color + "22" }}
                >
                  <CIcon className="w-4 h-4" style={{ color: cuenta.color }} aria-hidden="true" />
                </div>
                <p className="flex-1 text-sm font-medium text-zinc-200 truncate">{cuenta.nombre}</p>
                <HidableAmount
                  value={Math.abs(saldo_actual)}
                  prefix={saldo_actual < 0 ? "-" : ""}
                  className={`text-sm font-semibold ${saldo_actual >= 0 ? "text-zinc-100" : "text-red-400"}`}
                />
              </div>
            )
          })}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("dashboard.sectionPatrimonio")}</p>
            <HidableAmount
              value={Math.abs(patrimonioTotal)}
              prefix={patrimonioTotal < 0 ? "-" : ""}
              className={`text-base font-semibold ${patrimonioTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}
            />
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
