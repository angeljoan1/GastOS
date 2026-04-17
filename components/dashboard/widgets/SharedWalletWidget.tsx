"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Wallet, ArrowRight, ChevronRight, Loader2 } from "lucide-react"
import { fetchWalletsForUser, fetchExpenses, calcularReequilibrio, type WalletWithMembers, type Transfer } from "@/services/sharedWallets"
import type { SharedExpense } from "@/types"

interface Props {
  userId: string
  onOpenWallet: () => void
}

export default function SharedWalletWidget({ userId, onOpenWallet }: Props) {
  const t = useTranslations()
  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState<WalletWithMembers[]>([])
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const ws = await fetchWalletsForUser(userId)
      if (!ws.length) { setWallets([]); setLoading(false); return }
      setWallets(ws)
      const now = new Date()
      const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const allExps: SharedExpense[] = []
      for (const w of ws) {
        const exps = await fetchExpenses(w.id, since)
        allExps.push(...exps)
      }
      setExpenses(allExps)
      const primary = ws[0]
      const primaryExps = allExps.filter(e => e.wallet_id === primary.id)
      setTransfers(calcularReequilibrio(primaryExps, primary.members))
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    )
  }

  if (!wallets.length) return null

  const primary = wallets[0]
  const monthlyBudget = primary.members.reduce((s, m) => s + m.contribucion_mensual, 0)
  const primaryExps = expenses.filter(e => e.wallet_id === primary.id)
  const monthlySpent = primaryExps.reduce((s, e) => s + e.cantidad, 0)
  const latest = primaryExps.slice(0, 3)
  const myTransfer = transfers.find(tr => tr.from === userId || tr.to === userId)
  const primaryMembers = primary.members

  function getMemberName(uid: string) {
    return primaryMembers.find(m => m.user_id === uid)?.display_name ?? "?"
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">{primary.nombre}</span>
        </div>
        <button onClick={onOpenWallet} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
          {t("wallet.btnView")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {monthlyBudget > 0 && (
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>{t("wallet.budget")}</span>
            <span>{monthlySpent.toFixed(2)} / {monthlyBudget.toFixed(2)} €</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0)}%` }} />
          </div>
        </div>
      )}

      {myTransfer && (
        <div className={`rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
          myTransfer.from === userId ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          <ArrowRight className="w-3 h-3 flex-shrink-0" />
          {myTransfer.from === userId
            ? t("wallet.youOwe", { name: getMemberName(myTransfer.to), amount: myTransfer.cantidad.toFixed(2) })
            : t("wallet.owesYou", { name: getMemberName(myTransfer.from), amount: myTransfer.cantidad.toFixed(2) })}
        </div>
      )}

      {latest.length > 0 && (
        <div className="space-y-1.5">
          {latest.map(e => (
            <div key={e.id} className="flex items-center justify-between">
              <p className="text-xs text-zinc-400 truncate max-w-[65%]">{e.concepto}</p>
              <span className="text-xs font-medium text-zinc-300">{e.cantidad.toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
