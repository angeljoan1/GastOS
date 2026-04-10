import type { Cuenta, Movimiento } from "@/types"

export function calcularSaldoCuenta(cuenta: Cuenta, movimientos: Movimiento[]): number {
  return movimientos.reduce((acc, m) => {
    if (m.tipo === "transferencia") {
      if (m.cuenta_id === cuenta.id) return acc - m.cantidad
      if (m.cuenta_destino_id === cuenta.id) return acc + m.cantidad
      return acc
    }
    if (m.cuenta_id !== cuenta.id) return acc
    return m.tipo === "ingreso" ? acc + m.cantidad : acc - m.cantidad
  }, cuenta.saldo_inicial)
}