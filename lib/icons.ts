import {
  UtensilsCrossed, Bus, CalendarDays, Package, Briefcase,
  Laptop, PiggyBank, Repeat2, CircleDollarSign, Wallet,
  Landmark, CreditCard, TrendingUp, TrendingDown, ShoppingCart,
  Home, Dumbbell, Heart, Plane, GraduationCap, Fuel, Coffee,
  Music, Gamepad2, Gift, Banknote, Building2, Coins,
  ArrowLeftRight, type LucideIcon,
} from "lucide-react"

export const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed, Bus, CalendarDays, Package, Briefcase,
  Laptop, PiggyBank, Repeat2, CircleDollarSign, Wallet,
  Landmark, CreditCard, TrendingUp, TrendingDown, ShoppingCart,
  Home, Dumbbell, Heart, Plane, GraduationCap, Fuel, Coffee,
  Music, Gamepad2, Gift, Banknote, Building2, Coins, ArrowLeftRight,
}

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Package
}

export const CUENTA_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#64748b",
]

export const CUENTA_ICON_OPTIONS: { name: string; label: string }[] = [
  { name: "Landmark",   label: "Banco"     },
  { name: "Wallet",     label: "Efectivo"  },
  { name: "CreditCard", label: "Tarjeta"   },
  { name: "TrendingUp", label: "Inversión" },
  { name: "Coins",      label: "Monedas"   },
  { name: "Banknote",   label: "Billetes"  },
  { name: "Building2",  label: "Entidad"   },
  { name: "Package",    label: "Otro"      },
]

export const CATEGORIA_ICON_OPTIONS: string[] = [
  "UtensilsCrossed", "ShoppingCart", "Bus", "Home", "Dumbbell",
  "Heart", "Plane", "GraduationCap", "Fuel", "Coffee",
  "Music", "Gamepad2", "Gift", "CalendarDays", "Briefcase",
  "Laptop", "PiggyBank", "Repeat2", "CircleDollarSign",
  "Wallet", "Package",
]