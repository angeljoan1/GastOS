"use client"

import { Delete } from "lucide-react"
import { useTranslations } from "next-intl"

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"] as const

interface Props {
  onDigit: (key: string) => void
  onBackspace: () => void
}

function triggerHaptic() {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(50)
  }
}

export default function NumericKeypad({ onDigit, onBackspace }: Props) {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-3 px-6 py-3 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
      {KEYS.map(k => (
        <button
          key={k}
          onClick={() => { if (k === ".") triggerHaptic(); onDigit(k) }}
          aria-label={k === "." ? t("ingreso.ariaDecimalPoint") : k}
          className="h-14 flex items-center justify-center text-2xl font-light text-zinc-200 active:bg-zinc-800 active:scale-95 rounded-xl transition-all duration-75 tabular-nums"
        >
          {k}
        </button>
      ))}
      <button
        onClick={onBackspace}
        aria-label={t("pin.ariaDeleteDigit")}
        className="h-14 flex items-center justify-center text-zinc-500 hover:text-red-400 active:bg-zinc-800 active:scale-95 rounded-xl transition-all"
      >
        <Delete className="w-6 h-6" />
      </button>
    </div>
  )
}
