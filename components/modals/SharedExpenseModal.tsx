"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { X, Loader2, CheckCircle2 } from "lucide-react"
import type { SharedWalletMember } from "@/types"
import { insertExpense } from "@/services/sharedWallets"

interface Props {
  isOpen: boolean
  onClose: () => void
  walletId: string
  members: SharedWalletMember[]
  currentUserId: string
  initialAmount?: number
  initialFecha?: string
  linkedMovimientoId?: string
  onSaved: () => void
}

export default function SharedExpenseModal({
  isOpen, onClose, walletId, members, currentUserId,
  initialAmount, initialFecha, linkedMovimientoId, onSaved,
}: Props) {
  const t = useTranslations()
  const [concepto, setConcepto] = useState("")
  const [cantidad, setCantidad] = useState(initialAmount ? initialAmount.toFixed(2) : "")
  const [fecha, setFecha] = useState(initialFecha ? initialFecha.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitIds, setSplitIds] = useState<string[]>(members.map(m => m.user_id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function toggleSplit(uid: string) {
    setSplitIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  async function handleSave() {
    if (!concepto.trim()) return setError(t("wallet.errorConcepto"))
    const amt = parseFloat(cantidad)
    if (!amt || amt <= 0) return setError(t("ingreso.errorAmountZero"))
    if (splitIds.length === 0) return setError(t("wallet.errorNoSplit"))
    setSaving(true)
    setError(null)
    const result = await insertExpense(
      walletId, paidBy, concepto.trim(), amt,
      new Date(fecha + "T12:00:00").toISOString(),
      splitIds, linkedMovimientoId,
    )
    setSaving(false)
    if (!result) return setError(t("wallet.errorSave"))
    onSaved()
    onClose()
  }

  const allSelected = splitIds.length === members.length

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end"
      role="dialog" aria-modal="true" aria-labelledby="shared-expense-title">
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 id="shared-expense-title" className="text-lg font-semibold text-zinc-100">{t("wallet.expenseTitle")}</h2>
          <button onClick={onClose} aria-label={t("common.close")}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-3" role="alert">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelConcepto")}</label>
            <input
              value={concepto} onChange={e => setConcepto(e.target.value)}
              placeholder={t("wallet.placeholderConcepto")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelCantidad")}</label>
              <input
                type="number" inputMode="decimal" value={cantidad} onChange={e => setCantidad(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelFecha")}</label>
              <input
                type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelPaidBy")}</label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button key={m.user_id} onClick={() => setPaidBy(m.user_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${paidBy === m.user_id
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                  {m.display_name}{m.user_id === currentUserId ? ` (${t("wallet.you")})` : ""}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-widest">{t("wallet.labelSplitWith")}</label>
              <button onClick={() => setSplitIds(allSelected ? [] : members.map(m => m.user_id))}
                className="text-xs text-emerald-400 hover:text-emerald-300">
                {allSelected ? t("wallet.btnNone") : t("wallet.btnAllMembers")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const selected = splitIds.includes(m.user_id)
                return (
                  <button key={m.user_id} onClick={() => toggleSplit(m.user_id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${selected
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-blue-400" : "bg-zinc-600"}`} />
                    {m.display_name}{m.user_id === currentUserId ? ` (${t("wallet.you")})` : ""}
                  </button>
                )
              })}
            </div>
            {splitIds.length > 0 && (
              <p className="text-xs text-zinc-600 mt-1.5">
                {t("wallet.splitHint", { n: splitIds.length, share: (parseFloat(cantidad || "0") / splitIds.length).toFixed(2) })}
              </p>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {t("wallet.btnSaveExpense")}
        </button>
      </div>
    </div>
  )
}
