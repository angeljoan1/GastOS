import { supabase } from "@/lib/supabase"
import type { SharedWallet, SharedWalletMember, SharedExpense } from "@/types"

export type WalletWithMembers = SharedWallet & { members: SharedWalletMember[] }
export type Transfer = { from: string; to: string; cantidad: number }

function genCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function fetchWalletsForUser(userId: string): Promise<WalletWithMembers[]> {
  const { data: memberRows } = await supabase
    .from("shared_wallet_members")
    .select("wallet_id")
    .eq("user_id", userId)

  if (!memberRows?.length) return []

  const walletIds = memberRows.map(r => r.wallet_id)
  const { data: wallets } = await supabase
    .from("shared_wallets")
    .select("*")
    .in("id", walletIds)
    .order("created_at")

  if (!wallets?.length) return []

  const { data: members } = await supabase
    .from("shared_wallet_members")
    .select("*")
    .in("wallet_id", walletIds)

  return wallets.map(w => ({
    ...w,
    members: (members ?? []).filter(m => m.wallet_id === w.id).map(m => ({
      ...m,
      contribucion_mensual: Number(m.contribucion_mensual)
    })),
  }))
}

export async function createWallet(
  nombre: string,
  userId: string,
  displayName: string,
  contribucionMensual: number,
): Promise<WalletWithMembers | null> {
  for (let i = 0; i < 5; i++) {
    const { data: wallet, error } = await supabase
      .from("shared_wallets")
      .insert({ nombre, join_code: genCode(), created_by: userId })
      .select()
      .single()

    if (error) continue

    const { data: member } = await supabase
      .from("shared_wallet_members")
      .insert({ wallet_id: wallet.id, user_id: userId, display_name: displayName, contribucion_mensual: contribucionMensual })
      .select()
      .single()

    return { ...wallet, members: member ? [{ ...member, contribucion_mensual: Number(member.contribucion_mensual) }] : [] }
  }
  return null
}

export async function joinWallet(
  joinCode: string,
  userId: string,
  displayName: string,
  contribucionMensual: number,
): Promise<{ wallet: SharedWallet; member: SharedWalletMember } | null> {
  const { data: wallet } = await supabase
    .from("shared_wallets")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .single()

  if (!wallet) return null

  const { data: member, error } = await supabase
    .from("shared_wallet_members")
    .insert({ wallet_id: wallet.id, user_id: userId, display_name: displayName, contribucion_mensual: contribucionMensual })
    .select()
    .single()

  if (error) return null
  return { wallet, member: { ...member, contribucion_mensual: Number(member.contribucion_mensual) } }
}

export async function fetchExpenses(walletId: string, since?: string): Promise<SharedExpense[]> {
  let q = supabase
    .from("shared_expenses")
    .select("*, shared_expense_splits(user_id)")
    .eq("wallet_id", walletId)
    .order("fecha", { ascending: false })

  if (since) q = q.gte("fecha", since)

  const { data } = await q
  return (data ?? []).map(e => ({
    ...e,
    cantidad: Number(e.cantidad),
    splits: (e.shared_expense_splits ?? []).map((s: { user_id: string }) => s.user_id),
  }))
}

export async function insertExpense(
  walletId: string,
  paidBy: string,
  concepto: string,
  cantidad: number,
  fecha: string,
  splitUserIds: string[],
  linkedMovimientoId?: string,
): Promise<SharedExpense | null> {
  const { data: expense, error } = await supabase
    .from("shared_expenses")
    .insert({ wallet_id: walletId, paid_by: paidBy, concepto, cantidad, fecha, linked_movimiento_id: linkedMovimientoId ?? null })
    .select()
    .single()

  if (error || !expense) return null

  if (splitUserIds.length > 0) {
    await supabase
      .from("shared_expense_splits")
      .insert(splitUserIds.map(uid => ({ expense_id: expense.id, user_id: uid })))
  }

  return { ...expense, cantidad: Number(expense.cantidad), splits: splitUserIds }
}

export function calcularReequilibrio(expenses: SharedExpense[], members: SharedWalletMember[]): Transfer[] {
  const saldos: Record<string, number> = {}
  members.forEach(m => { saldos[m.user_id] = 0 })

  for (const exp of expenses) {
    const splits = exp.splits ?? []
    if (splits.length === 0) continue
    const share = exp.cantidad / splits.length
    saldos[exp.paid_by] = (saldos[exp.paid_by] ?? 0) + exp.cantidad
    for (const uid of splits) {
      saldos[uid] = (saldos[uid] ?? 0) - share
    }
  }

  const pos = Object.entries(saldos).filter(([, v]) => v > 0.005).map(([id, val]) => ({ id, val })).sort((a, b) => b.val - a.val)
  const neg = Object.entries(saldos).filter(([, v]) => v < -0.005).map(([id, val]) => ({ id, val: -val })).sort((a, b) => b.val - a.val)

  const transfers: Transfer[] = []
  let pi = 0, ni = 0
  while (pi < pos.length && ni < neg.length) {
    const amount = Math.min(pos[pi].val, neg[ni].val)
    transfers.push({ from: neg[ni].id, to: pos[pi].id, cantidad: Math.round(amount * 100) / 100 })
    pos[pi].val -= amount
    neg[ni].val -= amount
    if (pos[pi].val < 0.005) pi++
    if (neg[ni].val < 0.005) ni++
  }

  return transfers
}

export async function settleWallet(walletId: string, resumen: Transfer[]): Promise<boolean> {
  const { error } = await supabase
    .from("shared_settlements")
    .insert({ wallet_id: walletId, resumen })
  return !error
}
