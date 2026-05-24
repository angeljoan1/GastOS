"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { X, Loader2, Copy, Check, Plus, LogIn, Users, ChevronRight, ArrowRight, Wallet } from "lucide-react"
import type { SharedWalletMember, SharedExpense } from "@/types"
import {
  fetchWalletsForUser, createWallet, joinWallet,
  fetchExpenses, calcularReequilibrio, settleWallet,
  type WalletWithMembers, type Transfer,
} from "@/services/sharedWallets"
import SharedExpenseModal from "./SharedExpenseModal"

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserDisplayName?: string
}

type View = "loading" | "empty" | "list" | "create" | "join" | "detail" | "settle"

export default function SharedWalletModal({ isOpen, onClose, currentUserId, currentUserDisplayName }: Props) {
  const t = useTranslations()
  const [view, setView] = useState<View>("loading")
  const [wallets, setWallets] = useState<WalletWithMembers[]>([])
  const [activeWallet, setActiveWallet] = useState<WalletWithMembers | null>(null)
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [createNombre, setCreateNombre] = useState("")
  const [createDisplayName, setCreateDisplayName] = useState(currentUserDisplayName ?? "")
  const [createContribucion, setCreateContribucion] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [joinDisplayName, setJoinDisplayName] = useState(currentUserDisplayName ?? "")
  const [joinContribucion, setJoinContribucion] = useState("")

  const loadWallets = useCallback(async () => {
    setView("loading")
    const data = await fetchWalletsForUser(currentUserId)
    setWallets(data)
    setView(data.length === 0 ? "empty" : "list")
  }, [currentUserId])

  const loadDetail = useCallback(async (wallet: WalletWithMembers) => {
    setActiveWallet(wallet)
    setView("loading")
    const now = new Date()
    const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const exps = await fetchExpenses(wallet.id, since)
    setExpenses(exps)
    setTransfers(calcularReequilibrio(exps, wallet.members))
    setView("detail")
  }, [])

  useEffect(() => {
    if (isOpen) loadWallets()
  }, [isOpen, loadWallets])

  if (!isOpen) return null

  function resetCreateForm() {
    setCreateNombre(""); setCreateDisplayName(currentUserDisplayName ?? "")
    setCreateContribucion(""); setError(null)
  }
  function resetJoinForm() {
    setJoinCode(""); setJoinDisplayName(currentUserDisplayName ?? "")
    setJoinContribucion(""); setError(null)
  }

  async function handleCreate() {
    if (!createNombre.trim()) return setError(t("wallet.errorNombre"))
    if (!createDisplayName.trim()) return setError(t("wallet.errorDisplayName"))
    setSaving(true); setError(null)
    const result = await createWallet(createNombre.trim(), currentUserId, createDisplayName.trim(), parseFloat(createContribucion) || 0)
    setSaving(false)
    if (!result) return setError(t("wallet.errorSave"))
    setWallets(prev => [...prev, result])
    resetCreateForm()
    await loadDetail(result)
  }

  async function handleJoin() {
    if (joinCode.trim().length !== 6) return setError(t("wallet.errorCode"))
    if (!joinDisplayName.trim()) return setError(t("wallet.errorDisplayName"))
    setSaving(true); setError(null)
    const result = await joinWallet(joinCode.trim(), currentUserId, joinDisplayName.trim(), parseFloat(joinContribucion) || 0)
    setSaving(false)
    if (!result) return setError(t("wallet.errorJoin"))
    resetJoinForm()
    await loadWallets()
    const fresh = wallets.find(w => w.id === result.wallet.id) 
      ? { ...wallets.find(w => w.id === result.wallet.id)!, members: [...wallets.find(w => w.id === result.wallet.id)!.members.filter(m => m.user_id !== result.member.user_id), result.member] }
      : { ...result.wallet, members: [result.member] }
    await loadDetail(fresh)
  }

  async function handleSettle() {
    if (!activeWallet) return
    setSaving(true)
    const ok = await settleWallet(activeWallet.id, transfers)
    setSaving(false)
    if (!ok) return setError(t("wallet.errorSave"))
    await loadDetail(activeWallet)
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function getMemberName(uid: string, members: SharedWalletMember[]) {
    return members.find(m => m.user_id === uid)?.display_name ?? "?"
  }

  const monthlyBudget = activeWallet?.members.reduce((s, m) => s + m.contribucion_mensual, 0) ?? 0
  const monthlySpent = expenses.reduce((s, e) => s + e.cantidad, 0)
  const myBalance = activeWallet ? transfers.find(tr => tr.from === currentUserId || tr.to === currentUserId) : null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end"
        role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
        <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {(view === "create" || view === "join" || view === "detail" || view === "settle") && (
                <button onClick={() => { setError(null); setView(wallets.length ? "list" : "empty") }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors mr-1">
                  <ChevronRight className="w-4 h-4 text-zinc-400 rotate-180" />
                </button>
              )}
              <h2 id="wallet-modal-title" className="text-lg font-semibold text-zinc-100">
                {view === "create" ? t("wallet.viewCreate") : view === "join" ? t("wallet.viewJoin")
                  : view === "detail" && activeWallet ? activeWallet.nombre
                  : view === "settle" ? t("wallet.viewSettle") : t("wallet.title")}
              </h2>
            </div>
            <button onClick={onClose} aria-label={t("common.close")}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {error && <p className="text-xs text-red-400 mb-3" role="alert">{error}</p>}

          {view === "loading" && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>}

          {view === "empty" && (
            <div className="space-y-3 py-4">
              <div className="text-center py-8">
                <Wallet className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">{t("wallet.empty")}</p>
              </div>
              <button onClick={() => { resetCreateForm(); setView("create") }}
                className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-colors">
                <Plus className="w-4 h-4" /> {t("wallet.btnCreate")}
              </button>
              <button onClick={() => { resetJoinForm(); setView("join") }}
                className="w-full py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:border-zinc-500 transition-colors">
                <LogIn className="w-4 h-4" /> {t("wallet.btnJoin")}
              </button>
            </div>
          )}

          {view === "list" && (
            <div className="space-y-3">
              {wallets.map(w => (
                <button key={w.id} onClick={() => loadDetail(w)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between hover:border-zinc-500 transition-colors">
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-100">{w.nombre}</p>
                    <p className="text-xs text-zinc-500">{w.members.length} {t("wallet.members")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { resetCreateForm(); setView("create") }}
                  className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:border-zinc-500 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {t("wallet.btnCreate")}
                </button>
                <button onClick={() => { resetJoinForm(); setView("join") }}
                  className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:border-zinc-500 transition-colors">
                  <LogIn className="w-3.5 h-3.5" /> {t("wallet.btnJoin")}
                </button>
              </div>
            </div>
          )}

          {view === "create" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelNombre")}</label>
                <input value={createNombre} onChange={e => setCreateNombre(e.target.value)} placeholder={t("wallet.placeholderNombre")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelDisplayName")}</label>
                <input value={createDisplayName} onChange={e => setCreateDisplayName(e.target.value)} placeholder={t("wallet.placeholderDisplayName")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelContribucion")}</label>
                <input type="number" inputMode="decimal" value={createContribucion} onChange={e => setCreateContribucion(e.target.value)} placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <button onClick={handleCreate} disabled={saving}
                className="w-full mt-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t("wallet.btnCreateConfirm")}
              </button>
            </div>
          )}

          {view === "join" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelCode")}</label>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" maxLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 uppercase tracking-widest placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelDisplayName")}</label>
                <input value={joinDisplayName} onChange={e => setJoinDisplayName(e.target.value)} placeholder={t("wallet.placeholderDisplayName")}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">{t("wallet.labelContribucion")}</label>
                <input type="number" inputMode="decimal" value={joinContribucion} onChange={e => setJoinContribucion(e.target.value)} placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <button onClick={handleJoin} disabled={saving}
                className="w-full mt-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {t("wallet.btnJoinConfirm")}
              </button>
            </div>
          )}

          {view === "detail" && activeWallet && (
            <div className="space-y-5">
              {monthlyBudget > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span>{t("wallet.budget")}</span>
                    <span>{monthlySpent.toFixed(2)} / {monthlyBudget.toFixed(2)} €</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (monthlySpent / monthlyBudget) * 100)}%` }} />
                  </div>
                </div>
              )}
              {myBalance && (
                <div className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
                  myBalance.from === currentUserId ? "bg-red-500/10 border border-red-500/30 text-red-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"}`}>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  {myBalance.from === currentUserId
                    ? t("wallet.youOwe", { name: getMemberName(myBalance.to, activeWallet.members), amount: myBalance.cantidad.toFixed(2) })
                    : t("wallet.owesYou", { name: getMemberName(myBalance.from, activeWallet.members), amount: myBalance.cantidad.toFixed(2) })}
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t("wallet.members")}</p>
                <div className="flex flex-wrap gap-2">
                  {activeWallet.members.map(m => (
                    <span key={m.user_id} className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                      {m.display_name}{m.user_id === currentUserId ? ` (${t("wallet.you")})` : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{t("wallet.expensesThisMonth")}</p>
                {expenses.length === 0
                  ? <p className="text-xs text-zinc-600">{t("wallet.noExpenses")}</p>
                  : <div className="space-y-2">
                      {expenses.slice(0, 5).map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-zinc-200">{e.concepto}</p>
                            <p className="text-xs text-zinc-500">{t("wallet.paidBy")}: {getMemberName(e.paid_by, activeWallet.members)}</p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-100">{e.cantidad.toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>}
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/60 rounded-xl px-4 py-2.5">
                <Users className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">{t("wallet.inviteCode")}</p>
                  <p className="text-sm font-mono font-bold text-zinc-200 tracking-widest">{activeWallet.join_code}</p>
                </div>
                <button onClick={() => copyCode(activeWallet.join_code)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-700 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExpenseModal(true)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> {t("wallet.btnNewExpense")}
                </button>
                {transfers.length > 0 && (
                  <button onClick={() => setView("settle")}
                    className="flex-1 py-3 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:border-zinc-500 transition-colors">
                    {t("wallet.btnSettle")}
                  </button>
                )}
              </div>
            </div>
          )}

          {view === "settle" && activeWallet && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">{t("wallet.settleHint")}</p>
              <div className="space-y-2">
                {transfers.map((tr, i) => (
                  <div key={i} className="flex items-center gap-3 bg-zinc-800/60 rounded-xl px-4 py-3">
                    <span className="text-sm text-zinc-300 font-medium">{getMemberName(tr.from, activeWallet.members)}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm text-zinc-300 font-medium">{getMemberName(tr.to, activeWallet.members)}</span>
                    <span className="ml-auto text-sm font-bold text-zinc-100">{tr.cantidad.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <button onClick={handleSettle} disabled={saving}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t("wallet.btnSettleConfirm")}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeWallet && (
        <SharedExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          walletId={activeWallet.id}
          members={activeWallet.members}
          currentUserId={currentUserId}
          onSaved={() => loadDetail(activeWallet)}
        />
      )}
    </>
  )
}
