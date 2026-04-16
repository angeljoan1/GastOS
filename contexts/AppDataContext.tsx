"use client"

import { createContext, useContext } from "react"
import type { Categoria, Cuenta, Presupuesto, Objetivo } from "@/types"

interface AppDataContextValue {
  categorias: Categoria[]
  setCategorias: React.Dispatch<React.SetStateAction<Categoria[]>>
  cuentas: Cuenta[]
  setCuentas: React.Dispatch<React.SetStateAction<Cuenta[]>>
  presupuestos: Presupuesto[]
  setPresupuestos: React.Dispatch<React.SetStateAction<Presupuesto[]>>
  objetivos: Objetivo[]
  setObjetivos: React.Dispatch<React.SetStateAction<Objetivo[]>>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: AppDataContextValue
}) {
  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider")
  return ctx
}
