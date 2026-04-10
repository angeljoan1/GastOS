import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { decryptData, DECRYPT_ERROR } from "@/lib/crypto"
import type { Movimiento } from "@/types"

const SALDO_CACHE_KEY = "gastos_saldo_cache_v1"
const SALDO_CACHE_TTL = 5 * 60 * 1000

function getSaldoCache(): Movimiento[] | null {
  try {
    const raw = sessionStorage.getItem(SALDO_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > SALDO_CACHE_TTL) {
      sessionStorage.removeItem(SALDO_CACHE_KEY)
      return null
    }
    return data as Movimiento[]
  } catch { return null }
}

function setSaldoCache(data: Movimiento[]): void {
  try {
    sessionStorage.setItem(SALDO_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { }
}

export function invalidateSaldoCache(): void {
  try { sessionStorage.removeItem(SALDO_CACHE_KEY) } catch { }
}

async function decryptInChunks(
  items: Record<string, unknown>[],
  mapFn: (m: Record<string, unknown>) => Promise<Movimiento>,
  chunkSize = 50,
): Promise<Movimiento[]> {
  const results: Movimiento[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = await Promise.all(items.slice(i, i + chunkSize).map(mapFn))
    results.push(...chunk)
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  return results
}

export function useDashboardData(activeWidgets: string[]) {
  const [movimientos, setMovimientos] = useState<{ recientes: Movimiento[]; paraSaldo: Movimiento[] }>({
    recientes: [],
    paraSaldo: [],
  })
  const [hasEncryptedMovs, setHasEncryptedMovs] = useState(false)
  const [loading, setLoading] = useState(true)
  const saldoFetchedRef = useRef(false)

  useEffect(() => {
    const fetchYDesencriptar = async () => {
      const fechaCorte = new Date()
      fechaCorte.setMonth(fechaCorte.getMonth() - 13)
      fechaCorte.setDate(1)
      fechaCorte.setHours(0, 0, 0, 0)

      const { data: dataReciente } = await supabase
        .from("movimientos")
        .select("*")
        .gte("created_at", fechaCorte.toISOString())
        .order("created_at", { ascending: false })

      if (!dataReciente) { setLoading(false); return }

      const decryptedReciente = await decryptInChunks(
        dataReciente as Record<string, unknown>[],
        async (m) => {
          const cantidadStr = await decryptData(m.cantidad as string)
          const notaStr = m.nota ? await decryptData(m.nota as string) : null
          return {
            ...m,
            cantidad: cantidadStr === DECRYPT_ERROR ? -1 : (parseFloat(cantidadStr) || 0),
            nota: notaStr === DECRYPT_ERROR ? DECRYPT_ERROR : notaStr,
          } as Movimiento
        }
      )

      setHasEncryptedMovs(decryptedReciente.some(m => m.cantidad === -1))
      setMovimientos(prev => ({
        recientes: decryptedReciente.filter(m => m.cantidad !== -1),
        paraSaldo: prev.paraSaldo,
      }))
      setLoading(false)
    }

    fetchYDesencriptar()
  }, [])

  useEffect(() => {
    if (!activeWidgets.includes("saldo_cuentas")) return
    if (saldoFetchedRef.current) return
    saldoFetchedRef.current = true

    const fetchSaldo = async () => {
      const cached = getSaldoCache()
      if (cached) {
        setMovimientos(prev => ({ ...prev, paraSaldo: cached }))
        return
      }

      const { data: dataParaSaldo } = await supabase
        .from("movimientos")
        .select("id, cantidad, tipo, cuenta_id, cuenta_destino_id, created_at")
        .order("created_at", { ascending: false })

      if (dataParaSaldo) {
        const result = await decryptInChunks(
          dataParaSaldo as Record<string, unknown>[],
          async (m) => {
            const cantidadStr = await decryptData(m.cantidad as string)
            return {
              ...m,
              cantidad: cantidadStr === DECRYPT_ERROR ? -1 : (parseFloat(cantidadStr) || 0),
              nota: undefined,
            } as Movimiento
          }
        )
        const filtered = result.filter(m => m.cantidad !== -1)
        setSaldoCache(filtered)
        setMovimientos(prev => ({ ...prev, paraSaldo: filtered }))
      }
    }

    fetchSaldo()
  }, [activeWidgets])

  return { movimientos, hasEncryptedMovs, loading }
}