export type TipoMovimiento = 'gasto' | 'ingreso'
export type TipoCategoria = 'gasto' | 'ingreso' | 'ambos'

export interface Categoria {
  id: string
  label: string
  Icon: any
  tipo: TipoCategoria
}

export interface Movimiento {
  id: string
  created_at: string
  cantidad: number
  categoria: string
  nota?: string
  is_recurring?: boolean
  tipo?: TipoMovimiento
}