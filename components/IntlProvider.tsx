"use client"

import { useState, useEffect, type ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"

const LOCALE_KEY = "gastos_locale"
const DEFAULT_LOCALE = "es"
const SUPPORTED = ["es", "en", "ca"] as const
type Locale = typeof SUPPORTED[number]

function getLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  const stored = localStorage.getItem(LOCALE_KEY)
  if (stored && SUPPORTED.includes(stored as Locale)) return stored as Locale
  return DEFAULT_LOCALE
}

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  switch (locale) {
    case "en": return (await import("@/messages/en.json")).default
    case "ca": return (await import("@/messages/ca.json")).default
    default:   return (await import("@/messages/es.json")).default
  }
}

export default function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const loc = getLocale()
    setLocale(loc)
    loadMessages(loc).then(setMessages)
    document.documentElement.lang = loc
  }, [])

  // Mientras carga los mensajes no renderizamos nada para evitar
  // un flash de texto sin traducir. El spinner de app/page.tsx
  // ya cubre esta ventana de tiempo en la práctica.
  if (!messages) return null

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}